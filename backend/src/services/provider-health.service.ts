import { AppError } from '../utils/app-error.js'

const HEALTH_TIMEOUT_MS = 5_000

export type ProviderHealthState = 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE'

export interface ProviderHealth {
  provider: 'crawler'
  dependency: 'crawler-gateway'
  state: ProviderHealthState
  code: string
  message: string
  checkedAt: string
}

export interface ProviderHealthOptions {
  baseUrl?: string
  token?: string
  fetcher?: typeof fetch
  timeoutMs?: number
}

export class ProviderHealthService {
  private readonly baseUrl: string
  private readonly token?: string
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number

  constructor(options: ProviderHealthOptions = {}) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? process.env.CRAWLER_GATEWAY_URL ?? '',
    )
    this.token =
      options.token ?? (process.env.CRAWLER_GATEWAY_TOKEN?.trim() || undefined)
    this.fetcher = options.fetcher ?? fetch
    this.timeoutMs = normalizeTimeout(options.timeoutMs)
  }

  async checkCrawler(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString()
    if (!this.baseUrl) {
      return {
        provider: 'crawler',
        dependency: 'crawler-gateway',
        state: 'UNAVAILABLE',
        code: 'CRAWLER_GATEWAY_NOT_CONFIGURED',
        message: 'Crawler gateway is not configured.',
        checkedAt,
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        signal: controller.signal,
      })

      if (response.status === 401 || response.status === 403) {
        return {
          provider: 'crawler',
          dependency: 'crawler-gateway',
          state: 'UNAVAILABLE',
          code: 'CRAWLER_GATEWAY_AUTH_ERROR',
          message: 'Crawler gateway rejected authentication.',
          checkedAt,
        }
      }

      if (!response.ok) {
        return {
          provider: 'crawler',
          dependency: 'crawler-gateway',
          state: 'DEGRADED',
          code: 'CRAWLER_GATEWAY_UNHEALTHY',
          message: `Crawler gateway health check returned HTTP ${response.status}.`,
          checkedAt,
        }
      }

      return {
        provider: 'crawler',
        dependency: 'crawler-gateway',
        state: 'AVAILABLE',
        code: 'OK',
        message: 'Crawler gateway is available.',
        checkedAt,
      }
    } catch (error) {
      const timedOut =
        controller.signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      return {
        provider: 'crawler',
        dependency: 'crawler-gateway',
        state: 'UNAVAILABLE',
        code: timedOut
          ? 'CRAWLER_GATEWAY_TIMEOUT'
          : 'CRAWLER_GATEWAY_HEALTH_CHECK_FAILED',
        message: timedOut
          ? 'Crawler gateway health check timed out.'
          : `Crawler gateway health check failed: ${error instanceof Error ? error.message : String(error)}`,
        checkedAt,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Compatibility alias for historical SearchTask rows whose provider field is
   * still `agent-reach`. The active dependency is crawler-only.
   */
  async checkAgentReach(): Promise<ProviderHealth> {
    return this.checkCrawler()
  }

  async requireCrawler(): Promise<ProviderHealth> {
    const health = await this.checkCrawler()
    if (health.state !== 'AVAILABLE') {
      throw new AppError(
        503,
        'SEARCH_PROVIDER_UNAVAILABLE',
        health.message,
        {
          provider: health.provider,
          dependency: health.dependency,
          providerState: health.state,
          healthCode: health.code,
          retryable: true,
        },
      )
    }
    return health
  }

  async requireAgentReach(): Promise<ProviderHealth> {
    return this.requireCrawler()
  }
}

export const providerHealthService = new ProviderHealthService()

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function normalizeTimeout(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value <= 0) return HEALTH_TIMEOUT_MS
  return Math.max(1, Math.min(30_000, Math.round(value)))
}
