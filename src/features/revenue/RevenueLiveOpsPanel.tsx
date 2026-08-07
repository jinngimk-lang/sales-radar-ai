import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  CircleStop,
  ExternalLink,
  Globe2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MousePointer2,
  Play,
  Radio,
  RefreshCw,
  Signal,
  UnlockKeyhole,
  WifiOff,
} from 'lucide-react'
import type { RevenueOpportunity } from './revenue-api'
import {
  getRevenueLiveStatus,
  startRevenueLiveRun,
  stopRevenueLiveRun,
  type RevenueLiveEvent,
  type RevenueLiveRunStatus,
  type RevenueLiveStatus,
} from './revenue-live-api'

const TOKEN_STORAGE_KEY = 'sales-radar:revenue-live-operator-token'
const ACTIVE_STATUSES = new Set<RevenueLiveRunStatus>([
  'STARTING',
  'RUNNING',
  'STOP_REQUESTED',
])

const STATUS_LABELS: Record<RevenueLiveRunStatus, string> = {
  STARTING: '正在启动',
  RUNNING: '实时运行',
  COMPLETED: '已完成',
  FAILED: '运行失败',
  STOP_REQUESTED: '正在停止',
  STOPPED: '已停止',
  TIMED_OUT: '已超时',
}

type LiveConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected'

interface RevenueLiveOpsPanelProps {
  opportunities: RevenueOpportunity[]
}

export function RevenueLiveOpsPanel({ opportunities }: RevenueLiveOpsPanelProps) {
  const initialToken = readStoredToken()
  const [token, setToken] = useState(initialToken)
  const [tokenDraft, setTokenDraft] = useState(initialToken)
  const [status, setStatus] = useState<RevenueLiveStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(initialToken))
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] =
    useState<LiveConnectionState>('idle')
  const polling = useRef(false)

  const refresh = useCallback(
    async (activeToken = token) => {
      if (!activeToken || polling.current) return
      polling.current = true
      try {
        setStatus(await getRevenueLiveStatus(activeToken))
        setError(null)
      } catch (caught) {
        const message = readError(caught)
        setError(message)
        if (message.includes('运营令牌无效')) {
          clearStoredToken()
          setToken('')
          setStatus(null)
        }
      } finally {
        polling.current = false
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!token) return
    setLoading(true)
    void refresh(token)
    const timer = window.setInterval(() => void refresh(token), 2_000)
    return () => window.clearInterval(timer)
  }, [refresh, token])

  useEffect(() => {
    const handleBrowserbaseMessage = (event: MessageEvent) => {
      if (isBrowserbaseDisconnected(event.data)) {
        setConnectionState('disconnected')
        setError('Browserbase Live View 已断开。可点击刷新，或使用“独立接管”重新打开实时会话。')
      }
    }
    window.addEventListener('message', handleBrowserbaseMessage)
    return () => window.removeEventListener('message', handleBrowserbaseMessage)
  }, [])

  const selectedOpportunity = useMemo(
    () =>
      opportunities.find(
        (item) =>
          item.capitalRequiredMinor === 0 &&
          !['WON', 'LOST', 'REJECTED'].includes(item.status),
      ) ?? opportunities[0],
    [opportunities],
  )

  const active = status?.run
    ? ACTIVE_STATUSES.has(status.run.status)
    : false
  const liveUrl = status?.liveView?.debuggerFullscreenUrl ?? null

  useEffect(() => {
    setConnectionState(liveUrl ? 'connecting' : 'idle')
  }, [liveUrl])

  const unlock = async () => {
    const nextToken = tokenDraft.trim()
    if (!nextToken) {
      setError('请输入 Railway 中配置的运营令牌')
      return
    }
    writeStoredToken(nextToken)
    setToken(nextToken)
    setLoading(true)
    await refresh(nextToken)
  }

  const lock = () => {
    clearStoredToken()
    setToken('')
    setTokenDraft('')
    setStatus(null)
    setError(null)
    setConnectionState('idle')
  }

  const start = async () => {
    if (!token) return
    setMutating(true)
    setError(null)
    try {
      setStatus(await startRevenueLiveRun(token, selectedOpportunity?.id))
    } catch (caught) {
      setError(readError(caught))
    } finally {
      setMutating(false)
    }
  }

  const stop = async () => {
    if (!token || !status?.run) return
    setMutating(true)
    setError(null)
    try {
      setStatus(await stopRevenueLiveRun(token, status.run.id))
    } catch (caught) {
      setError(readError(caught))
    } finally {
      setMutating(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl">
      <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <LiveHeading active={active} />
          <p className="mt-2 text-xs leading-5 text-white/45">
            真实浏览器与动作时间线保持同步。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            active={Boolean(status?.configured)}
            label={status?.configured ? 'Browserbase 已连接' : '供应商未配置'}
          />
          <StatusChip
            active={connectionState === 'connected'}
            label={connectionLabel(connectionState)}
          />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || !token}
            className="live-secondary-button"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> 刷新
          </button>
          {token ? (
            <button type="button" onClick={lock} className="live-secondary-button">
              <KeyRound className="h-3.5 w-3.5" /> 锁定
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="px-5 pt-4">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.75fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-xs font-semibold text-white/70">
                  <Globe2 className="h-4 w-4 shrink-0 text-cyan-300" />
                  {status?.currentPage?.title || status?.run?.taskSummary || '等待真实浏览器会话'}
                </p>
                <p className="mt-1 truncate text-[11px] text-white/35">
                  {status?.currentPage?.url || status?.run?.targetUrl || '尚未打开网页'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {liveUrl ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-bold text-cyan-100">
                    <MousePointer2 className="h-3.5 w-3.5" /> 点击画面可接管
                  </span>
                ) : null}
                {status?.run ? (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status.run.status)}`}>
                    {STATUS_LABELS[status.run.status]}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="relative aspect-video min-h-[360px] bg-[#050914]">
              {liveUrl ? (
                <iframe
                  title="Browserbase revenue supervision Live View"
                  src={liveUrl}
                  data-live-mode="interactive"
                  allow="clipboard-read; clipboard-write"
                  className="h-full w-full border-0 bg-white"
                  referrerPolicy="no-referrer"
                  tabIndex={0}
                  onLoad={() => {
                    setConnectionState('connected')
                    setError(null)
                  }}
                />
              ) : (
                <LiveViewEmptyState
                  configured={Boolean(status?.configured)}
                  loading={loading}
                  hasRun={Boolean(status?.run)}
                  locked={!token}
                />
              )}
              {connectionState === 'disconnected' ? (
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-slate-950/90 px-4 py-3 text-xs text-amber-100 backdrop-blur">
                  <span className="inline-flex items-center gap-2">
                    <WifiOff className="h-4 w-4" /> Live View 连接已断开
                  </span>
                  <button type="button" onClick={() => void refresh()} className="font-bold text-cyan-200">
                    重新连接
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/75">
                {status?.run?.taskSummary || selectedOpportunity?.title || '暂无可执行机会'}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/35">
                {active
                  ? '运行中，可直接查看或接管 Live。'
                  : status?.configured
                    ? '准备就绪，可运行当前最高优先机会。'
                    : '需要在 Railway 配置运营令牌和 Browserbase API Key。'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {liveUrl ? (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="live-secondary-button"
                >
                  独立接管 <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {token && active && status?.run ? (
                <button
                  type="button"
                  onClick={() => void stop()}
                  disabled={mutating}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-60"
                >
                  {mutating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CircleStop className="h-3.5 w-3.5" />}
                  停止会话
                </button>
              ) : token ? (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={mutating || !status?.configured || !selectedOpportunity}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {mutating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  运行最高优先机会
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {token ? (
          <EventTimeline status={status} active={active} />
        ) : (
          <UnlockPanel
            tokenDraft={tokenDraft}
            loading={loading}
            onTokenChange={setTokenDraft}
            onUnlock={() => void unlock()}
          />
        )}
      </div>
    </section>
  )
}

function UnlockPanel({
  tokenDraft,
  loading,
  onTokenChange,
  onUnlock,
}: {
  tokenDraft: string
  loading: boolean
  onTokenChange(value: string): void
  onUnlock(): void
}) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-3">
        <LockKeyhole className="h-5 w-5 text-cyan-300" />
        <div>
          <p className="text-sm font-bold">解锁收益监督画面</p>
          <p className="mt-1 text-xs text-white/45">输入运营令牌以查看实时执行</p>
        </div>
      </div>
      <label className="mt-5 block text-xs font-semibold text-white/60" htmlFor="revenue-live-token">
        运营令牌
      </label>
      <input
        id="revenue-live-token"
        type="password"
        autoComplete="off"
        value={tokenDraft}
        onChange={(event) => onTokenChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onUnlock()
        }}
        placeholder="输入 REVENUE_OPERATOR_TOKEN"
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none placeholder:text-white/25 focus:border-cyan-400/50"
      />
      <button
        type="button"
        onClick={onUnlock}
        disabled={loading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"
      >
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UnlockKeyhole className="h-4 w-4" />}
        解锁并同步
      </button>
    </aside>
  )
}

function EventTimeline({
  status,
  active,
}: {
  status: RevenueLiveStatus | null
  active: boolean
}) {
  return (
    <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">Action Timeline</p>
          <h3 className="mt-1 text-sm font-bold">实时操作、核验与收益证据</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
          <Signal className={`h-3.5 w-3.5 ${active ? 'text-emerald-300' : ''}`} />
          {formatHeartbeat(status?.heartbeatAt)}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {status?.events.length ? (
          <ol className="space-y-4">
            {status.events.map((event) => (
              <EventItem key={event.id || event.providerMessageId} event={event} />
            ))}
          </ol>
        ) : (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
            <Bot className="h-9 w-9 text-white/20" />
            <p className="mt-3 text-sm font-semibold text-white/65">等待真实操作事件</p>
            <p className="mt-2 max-w-xs text-xs leading-6 text-white/35">
              会话启动后，网页访问、Agent 动作、核验结果、失败原因和完成状态都会按时间写入这里。
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

function LiveHeading({ active = false }: { active?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
        <Radio className={`h-4 w-4 ${active ? 'animate-pulse' : ''}`} /> Live Revenue Supervision
      </div>
      <h2 className="mt-2 text-xl font-bold">收益执行云端浏览器</h2>
    </>
  )
}


function LiveViewEmptyState({
  configured,
  loading,
  hasRun,
  locked,
}: {
  configured: boolean
  loading: boolean
  hasRun: boolean
  locked: boolean
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {loading ? (
        <LoaderCircle className="h-10 w-10 animate-spin text-cyan-300" />
      ) : (
        <LockKeyhole className="h-10 w-10 text-white/20" />
      )}
      <p className="mt-4 text-sm font-bold text-white/75">
        {loading
          ? '正在同步云端状态'
          : locked
            ? '监督流程可见，真实浏览器需要运营令牌解锁'
            : !configured
              ? '尚未连接真实云端浏览器'
              : hasRun
                ? '等待供应商分配 Live View'
                : '当前没有运行中的浏览器'}
      </p>
      <p className="mt-2 max-w-md text-xs leading-6 text-white/35">
        {locked
          ? '右侧输入运营令牌后，当前网页、实时画面、操作轨迹和收益核验状态会显示在这里。'
          : !configured
            ? '在 Railway 设置 REVENUE_OPERATOR_TOKEN 与 BROWSERBASE_API_KEY 后才会出现真实远程浏览器画面。'
            : '只有真实会话返回调试画面地址后才加载可交互 iframe。'}
      </p>
    </div>
  )
}

function EventItem({ event }: { event: RevenueLiveEvent }) {
  const warning = event.level === 'WARNING' || event.level === 'ERROR'
  return (
    <li className="relative pl-6">
      <span className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-slate-950 ${warning ? 'bg-amber-300' : 'bg-cyan-300'}`} />
      <div className="flex items-start justify-between gap-3">
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white/50">{event.kind}</span>
        <time className="text-[10px] text-white/25">{formatTime(event.occurredAt)}</time>
      </div>
      <p className="mt-2 break-words text-xs leading-6 text-white/65">{event.message}</p>
    </li>
  )
}

function StatusChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${active ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-300' : 'bg-amber-300'}`} /> {label}
    </span>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-100">
      {message}
    </div>
  )
}

function statusTone(status: RevenueLiveRunStatus) {
  if (status === 'RUNNING') return 'bg-emerald-400/15 text-emerald-200'
  if (status === 'STARTING' || status === 'STOP_REQUESTED') return 'bg-cyan-400/15 text-cyan-200'
  if (status === 'COMPLETED') return 'bg-sky-400/15 text-sky-200'
  if (status === 'FAILED' || status === 'TIMED_OUT') return 'bg-rose-400/15 text-rose-200'
  return 'bg-white/10 text-white/60'
}

function connectionLabel(state: LiveConnectionState) {
  if (state === 'connected') return '画面可交互'
  if (state === 'connecting') return '画面连接中'
  if (state === 'disconnected') return '画面已断开'
  return '等待画面'
}

function isBrowserbaseDisconnected(data: unknown) {
  if (data === 'browserbase-disconnected') return true
  if (!data || typeof data !== 'object') return false
  return (data as { type?: unknown }).type === 'browserbase-disconnected'
}

function readStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeStoredToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // In-memory token remains available when session storage is blocked.
  }
}

function clearStoredToken() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Nothing else to clear.
  }
}

function readError(value: unknown) {
  return value instanceof Error ? value.message : '云端浏览器暂时不可用'
}

function formatHeartbeat(value: string | undefined) {
  return value ? `心跳 ${formatTime(value)}` : '等待心跳'
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知时间'
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}
