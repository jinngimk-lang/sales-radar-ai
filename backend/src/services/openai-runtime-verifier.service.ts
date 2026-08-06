export type OpenAIRuntimeVerificationState =
  | 'not_configured'
  | 'pending'
  | 'ready'
  | 'error'

export interface OpenAIRuntimeVerificationResult {
  status: OpenAIRuntimeVerificationState
  provider: 'openai'
  model: string
  checkedAt: string | null
  errorCode: string | null
}

interface OpenAIRuntimeVerifierOptions {
  environment?: NodeJS.ProcessEnv
  fetcher?: typeof fetch
  now?: () => Date
  cacheTtlMs?: number
}

const DEFAULT_MODEL = 'gpt-5.2'
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_CACHE_TTL_MS = 10 * 60_000

export class OpenAIRuntimeVerifier {
  private readonly environment: NodeJS.ProcessEnv
  private readonly fetcher: typeof fetch
  private readonly now: () => Date
  private readonly cacheTtlMs: number
  private cached: OpenAIRuntimeVerificationResult | null = null
  private cachedAtMs = 0
  private inFlight: Promise<OpenAIRuntimeVerificationResult> | null = null

  constructor(options: OpenAIRuntimeVerifierOptions = {}) {
    this.environment = options.environment ?? process.env
    this.fetcher = options.fetcher ?? fetch
    this.now = options.now ?? (() => new Date())
    this.cacheTtlMs =
      options.cacheTtlMs ??
      readPositiveInteger(this.environment.OPENAI_RUNTIME_VERIFY_CACHE_TTL_MS) ??
      DEFAULT_CACHE_TTL_MS
  }

  getStatus(): OpenAIRuntimeVerificationResult {
    const config = this.readConfig()
    if (!config.apiKey) return this.notConfigured(config.model)
    if (this.cached) return { ...this.cached }
    return {
      status: 'pending',
      provider: 'openai',
      model: config.model,
      checkedAt: null,
      errorCode: null,
    }
  }

  async verify(): Promise<OpenAIRuntimeVerificationResult> {
    const config = this.readConfig()
    if (!config.apiKey) return this.notConfigured(config.model)

    const nowMs = this.now().getTime()
    if (this.cached && nowMs - this.cachedAtMs < this.cacheTtlMs) {
      return { ...this.cached }
    }
    if (this.inFlight) return this.inFlight

    this.inFlight = this.runVerification(config).finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  private async runVerification(config: {
    apiKey: string
    baseUrl: string
    model: string
    timeoutMs: number
  }): Promise<OpenAIRuntimeVerificationResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

    try {
      const response = await this.fetcher(`${config.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          input: 'Reply with OK only.',
          max_output_tokens: 8,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        return this.store({
          status: 'error',
          provider: 'openai',
          model: config.model,
          checkedAt: this.now().toISOString(),
          errorCode: errorCodeForStatus(response.status),
        })
      }

      return this.store({
        status: 'ready',
        provider: 'openai',
        model: config.model,
        checkedAt: this.now().toISOString(),
        errorCode: null,
      })
    } catch (error) {
      return this.store({
        status: 'error',
        provider: 'openai',
        model: config.model,
        checkedAt: this.now().toISOString(),
        errorCode:
          error instanceof Error && error.name === 'AbortError'
            ? 'timeout'
            : 'network_error',
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  private store(
    result: OpenAIRuntimeVerificationResult,
  ): OpenAIRuntimeVerificationResult {
    this.cached = result
    this.cachedAtMs = this.now().getTime()
    return { ...result }
  }

  private notConfigured(model: string): OpenAIRuntimeVerificationResult {
    return {
      status: 'not_configured',
      provider: 'openai',
      model,
      checkedAt: null,
      errorCode: 'missing_api_key',
    }
  }

  private readConfig() {
    return {
      apiKey: this.environment.OPENAI_API_KEY?.trim() || '',
      baseUrl: normalizeBaseUrl(
        this.environment.OPENAI_BASE_URL?.trim() ||
          'https://api.openai.com/v1',
      ),
      model: this.environment.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      timeoutMs:
        readPositiveInteger(
          this.environment.OPENAI_RUNTIME_VERIFY_TIMEOUT_MS,
        ) ?? DEFAULT_TIMEOUT_MS,
    }
  }
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function readPositiveInteger(value: string | undefined) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function errorCodeForStatus(status: number) {
  if (status === 401 || status === 403) return 'authentication_failed'
  if (status === 404) return 'model_not_found'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'upstream_unavailable'
  return 'request_rejected'
}

export const openAIRuntimeVerifier = new OpenAIRuntimeVerifier()
