import { useEffect, useMemo, useState } from 'react'
import {
  ExternalLink,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
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
    <section className="shrink-0 border-b border-ink-200 bg-slate-950 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold">
            <MonitorUp className="h-4 w-4 text-sky-300" />
            交互式云浏览器
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            Browserbase 只读研究会话；Live View 内可以点击、滚动和检查公开证据，但自动任务不会登录或提交表单。
          </p>
        </div>

        {token ? (
          <div className="flex items-center gap-2">
            {liveViewUrl ? (
              <a
                href={liveViewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-900"
              >
                独立接管
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => void start()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-[10px] font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {runId ? '重新启动交互浏览器' : '启动交互浏览器'}
            </button>
            <button
              type="button"
              onClick={lockOperator}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-300 hover:bg-slate-900"
            >
              <LockKeyhole className="h-3 w-3" />
              锁定
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') unlockOperator()
                }}
                placeholder="REVENUE_OPERATOR_TOKEN"
                autoComplete="off"
                className="h-8 w-52 rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 text-[10px] text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
              />
            </label>
            <button
              type="button"
              onClick={unlockOperator}
              className="rounded-lg bg-sky-500 px-3 py-2 text-[10px] font-semibold text-slate-950 hover:bg-sky-400"
            >
              解锁浏览器
            </button>
          </div>
        )}
      </div>

      {error ? (
        <p className="border-t border-rose-900/60 bg-rose-950/50 px-4 py-2 text-[10px] text-rose-200">
          {error}
        </p>
      ) : null}

      {liveViewUrl ? (
        <iframe
          title="交互式云浏览器"
          src={liveViewUrl}
          referrerPolicy="no-referrer"
          className="h-[360px] w-full border-0 bg-white"
          allow="clipboard-read; clipboard-write"
        />
      ) : runId && running ? (
        <div className="flex h-24 items-center justify-center gap-2 border-t border-slate-800 text-[10px] text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          云浏览器正在创建可交互 Live View…
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
