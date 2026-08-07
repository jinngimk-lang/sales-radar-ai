import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, LoaderCircle, MonitorUp, RefreshCw } from 'lucide-react'
import {
  getMarketLiveBrowser,
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
    if (!runId || liveViewUrl || !running) return
    const timer = window.setInterval(() => {
      void getMarketLiveBrowser(runId)
        .then(setResult)
        .catch(() => undefined)
    }, 1_500)
    return () => window.clearInterval(timer)
  }, [liveViewUrl, runId, running])

  const start = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await startMarketLiveBrowser({ query, sourceUrl }))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '交互式云浏览器暂时不可用',
      )
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
            Browserbase 只读会话；可在实时页面中滚动、点击和检查公开证据。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {liveViewUrl ? (
            <a
              href={liveViewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-900"
            >
              新窗口打开
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
            {runId ? '重新启动会话' : '启动交互会话'}
          </button>
        </div>
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
          云浏览器正在创建实时会话…
        </div>
      ) : null}
    </section>
  )
}
