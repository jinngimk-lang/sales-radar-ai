import { AppError } from '../utils/app-error.js'

export type BrowserbaseFetch = typeof fetch

export type BrowserbaseRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOPPED'
  | 'TIMED_OUT'

export interface BrowserbaseRun {
  runId: string
  status: BrowserbaseRunStatus
  task: string
  createdAt: string
  updatedAt: string
  sessionId?: string
  startedAt?: string
  endedAt?: string
  result?: Record<string, unknown>
  cause?: {
    code: string
    message?: string
  }
}

export interface BrowserbaseRunMessage {
  id: string
  createdAt: string
  message: {
    role: 'assistant' | 'tool'
    content: unknown
    [key: string]: unknown
  }
}

export interface BrowserbaseRunMessages {
  data: BrowserbaseRunMessage[]
  nextSince: string | null
}

export interface BrowserbaseLiveViewPage {
  id: string
  debuggerFullscreenUrl: string | null
  debuggerUrl: string | null
  faviconUrl: string | null
  title: string | null
  url: string | null
}

export interface BrowserbaseLiveView {
  debuggerFullscreenUrl: string | null
  debuggerUrl: string | null
  pages: BrowserbaseLiveViewPage[]
}

export interface BrowserbaseAgentProviderOptions {
  apiKey: string
  baseUrl?: string
  fetchImpl?: BrowserbaseFetch
  timeoutMs?: number
}

export class BrowserbaseAgentProvider {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: BrowserbaseFetch
  private readonly timeoutMs: number

  constructor(options: BrowserbaseAgentProviderOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? 'https://api.browserbase.com')
    this.fetchImpl = options.fetchImpl ?? fetch
    this.timeoutMs = options.timeoutMs ?? 20_000
  }

  async createRun(task: string): Promise<BrowserbaseRun> {
    return this.requestJson<BrowserbaseRun>('/v1/agents/runs', {
      method: 'POST',
      body: JSON.stringify({
        task,
        browserSettings: {
          proxies: false,
          verified: false,
        },
        resultSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            payoutTerms: { type: 'string' },
            eligibility: { type: 'string' },
            deadline: { type: 'string' },
            competition: { type: 'string' },
            requiredDeliverables: { type: 'string' },
            sourceUrls: { type: 'array', items: { type: 'string' } },
            uncertainty: { type: 'string' },
          },
          required: ['summary', 'sourceUrls', 'uncertainty'],
        },
      }),
    })
  }

  async retrieveRun(runId: string): Promise<BrowserbaseRun> {
    return this.requestJson<BrowserbaseRun>(
      `/v1/agents/runs/${encodeURIComponent(runId)}`,
    )
  }

  async listMessages(
    runId: string,
    since?: string | null,
  ): Promise<BrowserbaseRunMessages> {
    const query = new URLSearchParams({ all: 'true' })
    if (since) query.set('since', since)
    return this.requestJson<BrowserbaseRunMessages>(
      `/v1/agents/runs/${encodeURIComponent(runId)}/messages?${query.toString()}`,
    )
  }

  async getLiveView(sessionId: string): Promise<BrowserbaseLiveView> {
    const payload = await this.requestJson<Record<string, unknown>>(
      `/v1/sessions/${encodeURIComponent(sessionId)}/debug`,
    )
    const pages = Array.isArray(payload.pages) ? payload.pages : []

    return {
      debuggerFullscreenUrl: readProviderUrl(payload.debuggerFullscreenUrl),
      debuggerUrl: readProviderUrl(payload.debuggerUrl),
      pages: pages
        .map((page) => readLiveViewPage(page))
        .filter((page): page is BrowserbaseLiveViewPage => page !== null),
    }
  }

  async releaseSession(sessionId: string): Promise<void> {
    await this.requestJson<unknown>(
      `/v1/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ status: 'REQUEST_RELEASE' }),
      },
    )
  }

  private async requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...normalizeHeaders(init.headers),
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-BB-API-Key': this.apiKey,
        },
      })

      if (!response.ok) throw providerRequestFailed(response.status)

      try {
        return (await response.json()) as T
      } catch {
        throw providerRequestFailed(response.status)
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw providerRequestFailed(502)
    } finally {
      clearTimeout(timeout)
    }
  }
}

function readLiveViewPage(value: unknown): BrowserbaseLiveViewPage | null {
  if (!value || typeof value !== 'object') return null
  const page = value as Record<string, unknown>
  const id = readString(page.id)
  if (!id) return null

  return {
    id,
    debuggerFullscreenUrl: readProviderUrl(page.debuggerFullscreenUrl),
    debuggerUrl: readProviderUrl(page.debuggerUrl),
    faviconUrl: readProviderUrl(page.faviconUrl),
    title: readString(page.title),
    url: readRedactedPageUrl(page.url),
  }
}

function readProviderUrl(value: unknown) {
  const raw = readString(value)
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

function readRedactedPageUrl(value: unknown) {
  const raw = readString(value)
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    parsed.username = ''
    parsed.password = ''
    parsed.search = ''
    parsed.hash = ''
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return null
  }
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeHeaders(headers: RequestInit['headers']) {
  if (!headers) return {}
  return Object.fromEntries(new Headers(headers).entries())
}

function normalizeBaseUrl(value: string) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError(
      500,
      'BROWSERBASE_CONFIGURATION_INVALID',
      'Browserbase API base URL is invalid',
    )
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}

function providerRequestFailed(statusCode: number) {
  return new AppError(
    statusCode === 429 ? 503 : 502,
    'BROWSERBASE_REQUEST_FAILED',
    'Cloud browser provider request failed',
  )
}
