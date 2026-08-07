const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export const MARKET_LIVE_OPERATOR_TOKEN_KEY =
  'sales-radar:revenue-live-operator-token'

export interface MarketLiveBrowserResult {
  run: {
    id?: string
    runId?: string
    status?: string
  }
  liveView: {
    debuggerFullscreenUrl?: string | null
    debuggerUrl?: string | null
    pages?: Array<{
      id: string
      debuggerFullscreenUrl?: string | null
      debuggerUrl?: string | null
      title?: string | null
      url?: string | null
    }>
  } | null
  currentPage?: {
    title?: string | null
    url?: string | null
    faviconUrl?: string | null
  } | null
}

interface ApiEnvelope<T> {
  data: T
}

export async function startMarketLiveBrowser(
  token: string,
  input: { query: string; sourceUrl: string },
) {
  return request<MarketLiveBrowserResult>(
    '/market-signals/live-browser',
    token,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function getMarketLiveBrowser(token: string, runId: string) {
  return request<MarketLiveBrowserResult>(
    `/market-signals/live-browser/${encodeURIComponent(runId)}`,
    token,
    { cache: 'no-store' },
  )
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  })
  const body = (await response.json().catch(() => ({}))) as
    | ApiEnvelope<T>
    | { error?: { message?: string } }
  if (!response.ok || !('data' in body)) {
    throw new Error(readSafeError(response.status, body))
  }
  return body.data
}

function readSafeError(
  status: number,
  body: { error?: { message?: string } } | ApiEnvelope<unknown>,
) {
  if (status === 401) return '运营令牌无效，请重新解锁'
  if (status === 503) return 'Browserbase 或运营门禁尚未在 Railway 配置'
  if ('error' in body && body.error?.message) return body.error.message
  return `云端浏览器暂时不可用（${status}）`
}

function normalizeApiBaseUrl(value: string | undefined) {
  const configured = value?.trim() || '/api'
  return configured === '/' ? '' : configured.replace(/\/+$/, '')
}
