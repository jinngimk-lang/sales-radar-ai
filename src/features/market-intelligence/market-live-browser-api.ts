const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

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

export async function startMarketLiveBrowser(input: {
  query: string
  sourceUrl: string
}) {
  return request<MarketLiveBrowserResult>('/market-signals/live-browser', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getMarketLiveBrowser(runId: string) {
  return request<MarketLiveBrowserResult>(
    `/market-signals/live-browser/${encodeURIComponent(runId)}`,
    { cache: 'no-store' },
  )
}

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = (await response.json().catch(() => ({}))) as
    | ApiEnvelope<T>
    | { error?: { message?: string } }
  if (!response.ok || !('data' in body)) {
    throw new Error(
      'error' in body && body.error?.message
        ? body.error.message
        : `Cloud browser request failed (${response.status})`,
    )
  }
  return body.data
}

function normalizeApiBaseUrl(value: string | undefined) {
  const configured = value?.trim() || '/api'
  return configured === '/' ? '' : configured.replace(/\/+$/, '')
}
