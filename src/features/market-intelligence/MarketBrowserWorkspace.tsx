import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  FileSearch,
  Globe2,
  LockKeyhole,
  Newspaper,
  Search,
  Sparkles,
} from 'lucide-react'
import type {
  MarketResearchSession,
  MarketResearchSource,
  MarketResearchSourceType,
  MarketSignal,
} from '@/types'
import { Surface } from '@/components/ui/Surface'
import {
  WorkspaceEmpty,
  WorkspaceLoading,
  type AgentWorkspaceStatus,
} from '@/components/ui/WorkspaceState'
import { cn } from '@/lib/utils'
import { SIGNAL_META } from './market-intelligence.meta'

const SOURCE_META: Record<
  MarketResearchSourceType,
  { label: string; icon: typeof Globe2 }
> = {
  company: { label: '企业官网', icon: Building2 },
  news: { label: '新闻与公告', icon: Newspaper },
  jobs: { label: '招聘页面', icon: FileSearch },
  investment: { label: '投资信息', icon: FileSearch },
  industry: { label: '行业与政策', icon: Globe2 },
  other: { label: '其他来源', icon: Globe2 },
}

export function MarketBrowserWorkspace({
  session,
  signal,
  selectedSourceId,
  status,
  onSelectSource,
}: {
  session: MarketResearchSession | null
  signal: MarketSignal | null
  selectedSourceId: string | null
  status: AgentWorkspaceStatus
  onSelectSource: (id: string) => void
}) {
  const selectedSource =
    session?.sources.find((source) => source.id === selectedSourceId) ??
    session?.sources[0] ??
    null
  const address = selectedSource?.hostname ?? readableSource(signal?.sourceUrl)

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50/80 px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        </div>
        <div className="mx-4 flex min-w-0 max-w-2xl flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[11px] text-ink-500 shadow-sm">
          {selectedSource || signal ? (
            <LockKeyhole className="h-3 w-3 shrink-0 text-emerald-600" />
          ) : (
            <Search className="h-3 w-3 shrink-0 text-ink-400" />
          )}
          <span className="truncate">
            {status === 'running'
              ? '云端研究正在搜索并打开公开网页…'
              : address || '输入产品后开始联网研究'}
          </span>
        </div>
        {selectedSource || signal ? (
          <a
            href={selectedSource?.url ?? signal?.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="打开真实来源"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-700"
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        ) : (
          <span className="h-8 w-8" />
        )}
      </div>

      <div className="grid min-h-[470px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-ink-200 bg-ink-50/65 p-3 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              真实研究来源
            </p>
            {session && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-ink-500 ring-1 ring-ink-200">
                {session.sources.length}
              </span>
            )}
          </div>
          {session?.sources.length ? (
            <div className="max-h-[430px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
              {session.sources.map((source) => (
                <SourceButton
                  key={source.id}
                  source={source}
                  active={source.id === selectedSource?.id}
                  onClick={() => onSelectSource(source.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {Object.values(SOURCE_META).slice(0, 5).map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-ink-400"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 px-2 text-[10px] leading-4 text-ink-400">
            这里只显示本次 API 实际返回的搜索、打开和引用来源。
          </p>
        </aside>

        <main className="min-w-0 bg-white">
          {status === 'running' || status === 'reviewing' ? (
            <WorkspaceLoading
              title="云端研究正在浏览公开网页"
              description="模型正在检索企业官网、新闻、招聘、投资和行业来源；完成后显示实际访问记录。"
            />
          ) : selectedSource && session ? (
            <ResearchDocument source={selectedSource} session={session} />
          ) : signal ? (
            <StoredSignalDocument signal={signal} />
          ) : status === 'failed' ? (
            <WorkspaceEmpty
              icon={Globe2}
              title="本次联网研究未完成"
              description="请检查服务端 AI 凭据或缩小研究范围后重试；系统不会用模拟网页替代失败结果。"
            />
          ) : (
            <WorkspaceEmpty
              icon={Globe2}
              title="等待云端浏览器开始研究"
              description="输入产品或服务后开始扫描。完成前不会展示虚构来源或历史网页快照。"
            />
          )}
        </main>
      </div>
    </Surface>
  )
}

function SourceButton({
  source,
  active,
  onClick,
}: {
  source: MarketResearchSource
  active: boolean
  onClick: () => void
}) {
  const meta = SOURCE_META[source.sourceType]
  const Icon = meta.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border px-2.5 py-2 text-left transition',
        active
          ? 'border-brand-200 bg-white shadow-sm'
          : 'border-transparent hover:border-ink-200 hover:bg-white/70',
      )}
    >
      <span className="flex items-center gap-2 text-[10px] font-semibold text-ink-700">
        <Icon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span className="truncate">{source.hostname}</span>
      </span>
      <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-ink-500">
        {source.title}
      </span>
      <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        {source.status === 'cited' ? '已引用' : '已访问'}
      </span>
    </button>
  )
}

function ResearchDocument({
  source,
  session,
}: {
  source: MarketResearchSource
  session: MarketResearchSession
}) {
  const meta = SOURCE_META[source.sourceType]
  const Icon = meta.icon
  return (
    <article className="mx-auto max-w-4xl px-6 py-7 sm:px-9 sm:py-9">
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
          {source.status === 'cited' ? 'AI 结论已引用' : '研究过程已访问'}
        </span>
        <span className="text-ink-400">
          {session.provider} · {session.model}
        </span>
      </div>

      <p className="mt-7 text-xs font-semibold text-ink-500">{source.hostname}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-9 tracking-[-0.035em] text-ink-900">
        {source.title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-ink-600">
        {source.summary || '该网页已进入本次研究来源列表，但搜索服务没有返回独立页面摘要。请打开原文核验。'}
      </p>

      <section className="mt-7 rounded-2xl border border-brand-100 bg-brand-50/55 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-800">
          <Sparkles className="h-4 w-4" />
          本次市场研究总结
        </div>
        <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-ink-600">
          {session.summary}
        </p>
      </section>

      {session.trace.length > 0 && (
        <section className="mt-7 border-t border-ink-100 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-400">
            实际浏览轨迹
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {session.trace.map((step) => (
              <span
                key={step.id}
                className="max-w-full truncate rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-[10px] text-ink-600"
                title={step.label}
              >
                {step.label}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <span className="text-[10px] text-ink-400">
          访问时间：{formatTimestamp(source.accessedAt)}
        </span>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          打开来源原文
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  )
}

function StoredSignalDocument({ signal }: { signal: MarketSignal }) {
  const meta = SIGNAL_META[signal.signalType]
  const Icon = meta.icon
  return (
    <article className="mx-auto max-w-3xl px-6 py-9 sm:px-9">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
        <Icon className="h-3 w-3" />
        已保存 · {meta.label}
      </span>
      <h2 className="mt-6 text-2xl font-semibold leading-9 tracking-[-0.035em] text-ink-900">
        {signal.title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-ink-600">{signal.summary}</p>
      <a
        href={signal.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-7 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700"
      >
        打开真实来源
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </article>
  )
}

function readableSource(url: string | undefined) {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return '真实来源'
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
