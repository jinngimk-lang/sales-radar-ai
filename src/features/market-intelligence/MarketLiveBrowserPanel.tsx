import { useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  Minimize2,
  MonitorUp,
  RefreshCw,
} from 'lucide-react'
import {
  getMarketLiveBrowser,
  MARKET_LIVE_OPERATOR_TOKEN_KEY,
  startMarketLiveBrowser,
  type MarketLiveBrowserResult,
} from './market-live-browser-api'

export function MarketLiveBrowserPanel({
  query,
  sourceUrl,
}: {
  query: string
  sourceUrl: string
}) {
  const initialToken = readStoredToken()
  const [token, setToken] = useState(initialToken)
  const [tokenDraft, setTokenDraft] = useState(initialToken)
  const [result, setResult] = useState<MarketLiveBrowserResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const runId = result?.run.runId ?? result?.run.id ?? null
  const liveViewUrl =
    result?.liveView?.debuggerFullscreenUrl ??
    result?.liveView?.debuggerUrl ??
    result?.liveView?.pages?.[0]?.debuggerFullscreenUrl ??
    result?.liveView?.pages?.[0]?.debuggerUrl ??
    null
  const running = useMemo(
    () =>
      ['pending', 'running', 'starting'].includes(
        result?.run.status?.toLowerCase() ?? '',
      ),
    [result?.run.status],
  )

  useEffect(() => {
    if (!token || !runId || liveViewUrl || !running) return
    const timer = window.setInterval(() => {
      void getMarketLiveBrowser(token, runId)
        .then(setResult)
        .catch((requestError: unknown) => {
          const message = readError(requestError)
          setError(message)
          if (message.includes('运营令牌无效')) lockOperator()
        })
    }, 1_500)
    return () => window.clearInterval(timer)
  }, [liveViewUrl, runId, running, token])

  useEffect(() => {
    if (!isFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isFullscreen])

  const unlockOperator = () => {
    const nextToken = tokenDraft.trim()
    if (!nextToken) {
      setError('请输入 Railway 中配置的 REVENUE_OPERATOR_TOKEN')
      return
    }
    window.sessionStorage.setItem(MARKET_LIVE_OPERATOR_TOKEN_KEY, nextToken)
    setToken(nextToken)
    setError(null)
  }

  const lockOperator = () => {
    window.sessionStorage.removeItem(MARKET_LIVE_OPERATOR_TOKEN_KEY)
    setToken('')
    setTokenDraft('')
    setResult(null)
    setIsFullscreen(false)
  }

  const start = async () => {
    if (!token) {
      setError('请先使用 REVENUE_OPERATOR_TOKEN 解锁交互式云浏览器')
      return
    }
    setLoading(true)
    setError(null)
    try {
      setResult(await startMarketLiveBrowser(token, { query, sourceUrl }))
    } catch (requestError) {
      const message = readError(requestError)
      setError(message)
      if (message.includes('运营令牌无效')) lockOperator()
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className={
        isFullscreen
          ? 'fixed inset-0 z-[80] flex flex-col bg-white'
          : 'shrink-0 border-b border-ink-200 bg-white'
      }
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
          <MonitorUp className="h-3.5 w-3.5 text-brand-600" />
          Live
          {token ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Live 已解锁" />
          ) : null}
        </div>

        {token ? (
          <div className="flex items-center gap-1.5">
            {liveViewUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsFullscreen((value) => !value)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-medium text-ink-600 transition hover:bg-ink-50"
                  aria-label={isFullscreen ? '退出全屏云浏览器' : '全屏查看云浏览器'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                  {isFullscreen ? '退出全屏' : '全屏查看'}
                </button>
                <a
                  href={liveViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-medium text-ink-600 transition hover:bg-ink-50"
                >
                  独立打开
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void start()}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 text-[10px] font-medium text-ink-700 transition hover:bg-ink-50 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {runId ? '重启' : '启动 Live'}
            </button>
            <button
              type="button"
              onClick={lockOperator}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] text-ink-500 transition hover:bg-ink-50 hover:text-ink-800"
            >
              <LockKeyhole className="h-3 w-3" />
              锁定
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="relative">
              <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') unlockOperator()
                }}
                placeholder="运营令牌"
                autoComplete="off"
                className="h-8 w-40 rounded-lg border border-ink-200 bg-white pl-8 pr-3 text-[10px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-ink-300"
              />
            </label>
            <button
              type="button"
              onClick={unlockOperator}
              className="h-8 rounded-lg bg-ink-950 px-3 text-[10px] font-medium text-white hover:bg-ink-800"
            >
              解锁 Live
            </button>
          </div>
        )}
      </div>

      {error ? (
        <p className="shrink-0 border-t border-rose-100 bg-rose-50 px-3 py-2 text-[10px] text-rose-700">
          {error}
        </p>
      ) : null}

      {liveViewUrl ? (
        <iframe
          title="交互式云浏览器"
          src={liveViewUrl}
          referrerPolicy="no-referrer"
          className={
            isFullscreen
              ? 'min-h-0 flex-1 w-full border-0 bg-white'
              : 'h-[68vh] min-h-[560px] max-h-[760px] w-full border-0 bg-white'
          }
          allow="clipboard-read; clipboard-write"
        />
      ) : runId && running ? (
        <div className="flex h-20 items-center justify-center gap-2 border-t border-ink-100 text-[10px] text-ink-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          正在创建 Live View…
        </div>
      ) : null}
    </section>
  )
}

function readStoredToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(MARKET_LIVE_OPERATOR_TOKEN_KEY) ?? ''
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : '交互式云浏览器暂时不可用'
}
