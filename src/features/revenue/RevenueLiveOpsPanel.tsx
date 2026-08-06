import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  CircleStop,
  ExternalLink,
  Eye,
  Globe2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  TimerReset,
  UnlockKeyhole,
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

interface RevenueLiveOpsPanelProps {
  opportunities: RevenueOpportunity[]
}

export function RevenueLiveOpsPanel({ opportunities }: RevenueLiveOpsPanelProps) {
  const storedToken = readStoredToken()
  const [token, setToken] = useState(storedToken)
  const [tokenDraft, setTokenDraft] = useState(storedToken)
  const [status, setStatus] = useState<RevenueLiveStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(storedToken))
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef(false)

  const refresh = useCallback(
    async (activeToken = token) => {
      if (!activeToken || pollingRef.current) return
      pollingRef.current = true
      try {
        const next = await getRevenueLiveStatus(activeToken)
        setStatus(next)
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
        pollingRef.current = false
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
  }

  const start = async () => {
    if (!token) return
    setMutating(true)
    setError(null)
    try {
      setStatus(
        await startRevenueLiveRun(token, selectedOpportunity?.id),
      )
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

  if (!token) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.9)]">
        <div className="grid gap-7 px-6 py-7 lg:grid-cols-[1fr_minmax(320px,0.55fr)] lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              <Radio className="h-4 w-4" />
              Live Operations
            </div>
            <h2 className="mt-3 text-xl font-bold">云端浏览器实时画面</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
              这里只展示由 Sales Radar AI 后端真实启动的云端浏览器会话、当前网页和已执行动作。未连接供应商时会明确显示未配置，不会伪造运行画面。
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TrustItem icon={Eye} label="真实 Live View" />
              <TrustItem icon={ShieldCheck} label="只读研究边界" />
              <TrustItem icon={TimerReset} label="每 2 秒刷新" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">运营画面已锁定</p>
                <p className="mt-1 text-xs text-white/45">直播地址和事件流不对公共访客开放</p>
              </div>
            </div>
            <label className="mt-5 block text-xs font-semibold text-white/60" htmlFor="revenue-live-token">
              运营令牌
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="revenue-live-token"
                type="password"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void unlock()
                }}
                autoComplete="off"
                placeholder="输入 Railway 中的 REVENUE_OPERATOR_TOKEN"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => void unlock()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UnlockKeyhole className="h-4 w-4" />}
                解锁
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-white/40">
              令牌仅保存在当前标签页的 sessionStorage，并通过 Authorization 请求头发送；不会写入项目代码或本地长期存储。
            </p>
            {error ? <ErrorBanner message={error} /> : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.9)]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <Radio className={`h-4 w-4 ${active ? 'animate-pulse' : ''}`} />
            Live Operations
          </div>
          <h2 className="mt-2 text-xl font-bold">云端浏览器实时画面</h2>
          <p className="mt-2 text-xs leading-5 text-white/45">
            每 2 秒从受保护 API 同步状态；浏览器画面由云端供应商的真实 Live View 提供。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            active={Boolean(status?.configured)}
            label={status?.configured ? 'Browserbase 已连接' : '供应商未配置'}
          />
          <StatusChip
            active={Boolean(status?.loopEnabled)}
            label={status?.loopEnabled ? '自动循环已启用' : '自动循环未启用'}
          />
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            type="button"
            onClick={lock}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/[0.06] hover:text-white"
          >
            <KeyRound className="h-3.5 w-3.5" />
            锁定
          </button>
        </div>
      </div>

      {error ? <div className="px-5 pt-4 sm:px-6"><ErrorBanner message={error} /></div> : null}

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                  <Globe2 className="h-4 w-4 text-cyan-300" />
                  <span className="truncate">{status?.currentPage?.title || status?.run?.taskSummary || '等待真实浏览器会话'}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-white/35">
                  {status?.currentPage?.url || status?.run?.targetUrl || '尚未打开网页'}
                </p>
              </div>
              {status?.run ? (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status.run.status)}`}>
                  {STATUS_LABELS[status.run.status]}
                </span>
              ) : null}
            </div>

            <div className="aspect-video bg-[#050914]">
              {liveUrl ? (
                <iframe
                  title="Browserbase revenue operations Live View"
                  src={status?.liveView?.debuggerFullscreenUrl ?? undefined}
                  className="h-full w-full border-0 bg-white"
                  allow="clipboard-read; clipboard-write"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <LiveViewEmptyState
                  configured={Boolean(status?.configured)}
                  loading={loading}
                  hasRun={Boolean(status?.run)}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/75">
                {status?.run?.taskSummary || selectedOpportunity?.title || '暂无可执行机会'}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-white/35">
                {active
                  ? '只读研究正在云端执行；动作会持续进入右侧审计时间线。'
                  : status?.configured
                    ? '启动后仅访问已进入收益队列的公开来源，不登录、不提交、不交易。'
                    : '需要先在 Railway 配置运营令牌和 Browserbase API Key。'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {liveUrl ? (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                >
                  独立打开画面 <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {active && status?.run ? (
                <button
                  type="button"
                  onClick={() => void stop()}
                  disabled={mutating}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-rose-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {mutating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CircleStop className="h-3.5 w-3.5" />}
                  停止会话
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={mutating || !status?.configured || !selectedOpportunity}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {mutating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  运行最高优先机会
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">Action Timeline</p>
              <h3 className="mt-1 text-sm font-bold">实时操作与审计事件</h3>
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
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <Bot className="h-9 w-9 text-white/20" />
                <p className="mt-3 text-sm font-semibold text-white/65">暂无真实操作事件</p>
                <p className="mt-2 max-w-xs text-xs leading-6 text-white/35">
                  供应商会话启动后，页面访问、工具动作、状态变化和结果会按时间写入这里。
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

function LiveViewEmptyState({
  configured,
  loading,
  hasRun,
}: {
  configured: boolean
  loading: boolean
  hasRun: boolean
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      {loading ? (
        <LoaderCircle className="h-10 w-10 animate-spin text-cyan-300" />
      ) : configured ? (
        <Globe2 className="h-10 w-10 text-white/20" />
      ) : (
        <LockKeyhole className="h-10 w-10 text-amber-300/70" />
      )}
      <p className="mt-4 text-sm font-bold text-white/75">
        {loading
          ? '正在同步云端状态'
          : !configured
            ? '尚未连接真实云端浏览器'
            : hasRun
              ? '等待供应商分配 Live View'
              : '当前没有运行中的浏览器'}
      </p>
      <p className="mt-2 max-w-md text-xs leading-6 text-white/35">
        {!configured
          ? '在 Railway 设置 REVENUE_OPERATOR_TOKEN 与 BROWSERBASE_API_KEY 后，这里才会出现真实远程浏览器画面。'
          : '只有真实会话返回调试画面地址后才加载 iframe；普通日志不会被当作浏览器画面。'}
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
        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
          {event.kind}
        </span>
        <time className="shrink-0 text-[10px] text-white/25">
          {formatTime(event.occurredAt)}
        </time>
      </div>
      <p className="mt-2 break-words text-xs leading-6 text-white/65">{event.message}</p>
    </li>
  )
}

function StatusChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${active ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-300' : 'bg-amber-300'}`} />
      {label}
    </span>
  )
}

function TrustItem({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white/60">
      <Icon className="h-4 w-4 text-cyan-300" />
      {label}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-xs leading-5 text-rose-100">
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
    // Session-only storage may be blocked; the in-memory token still works.
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
  if (!value) return '等待心跳'
  return `心跳 ${formatTime(value)}`
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
