export type RevenueLiveRunStatus =
  | 'STARTING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOP_REQUESTED'
  | 'STOPPED'
  | 'TIMED_OUT'

export interface RevenueLiveRun {
  id: string
  opportunityId: string | null
  providerRunId: string
  providerSessionId: string | null
  status: RevenueLiveRunStatus
  taskSummary: string
  targetUrl: string
  currentUrl: string | null
  currentTitle: string | null
  resultSummary: string | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: string
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RevenueLiveEvent {
  id: string
  providerMessageId: string
  kind: string
  level: string
  message: string
  detail: string | null
  occurredAt: string
  createdAt: string
}

export interface RevenueLiveViewPage {
  id: string
  debuggerFullscreenUrl: string | null
  debuggerUrl: string | null
  faviconUrl: string | null
  title: string | null
  url: string | null
}

export interface RevenueLiveStatus {
  configured: boolean
  loopEnabled: boolean
  heartbeatAt: string
  run: RevenueLiveRun | null
  liveView: {
    debuggerFullscreenUrl: string | null
    debuggerUrl: string | null
    pages: RevenueLiveViewPage[]
  } | null
  currentPage: {
    title: string | null
    url: string | null
    faviconUrl: string | null
  } | null
  events: RevenueLiveEvent[]
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export function getRevenueLiveStatus(token: string) {
  return revenueLiveRequest('/revenue/live/status', token)
}

export function startRevenueLiveRun(token: string, opportunityId?: string) {
  return revenueLiveRequest('/revenue/live/runs', token, {
    method: 'POST',
    body: JSON.stringify(opportunityId ? { opportunityId } : {}),
  })
}

export function stopRevenueLiveRun(token: string, runId: string) {
  return revenueLiveRequest(
    `/revenue/live/runs/${encodeURIComponent(runId)}/stop`,
    token,
    { method: 'POST' },
  )
}

async function revenueLiveRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<RevenueLiveStatus> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  })

  if (!response.ok) throw new Error(readSafeError(response.status))

  const payload = (await response.json()) as { data?: RevenueLiveStatus }
  if (!payload.data) throw new Error('云端浏览器返回了无效状态')
  return payload.data
}

function readSafeError(status: number) {
  if (status === 401) return '运营令牌无效，请重新解锁'
  if (status === 404) return '没有可运行的收益机会，或会话已不存在'
  if (status === 409) return '已有云端浏览器任务正在运行'
  if (status === 503) return '云端浏览器或运营门禁尚未在 Railway 配置'
  return `云端浏览器暂时不可用（${status}）`
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const configuredBaseUrl = value?.trim() || '/api'
  if (configuredBaseUrl === '/') return ''
  return configuredBaseUrl.replace(/\/+$/, '')
}
