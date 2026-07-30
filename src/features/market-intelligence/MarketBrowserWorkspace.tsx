import {
  ArrowUpRight,
  Building2,
  FileSearch,
  Globe2,
  LockKeyhole,
  Newspaper,
  Search,
} from 'lucide-react'
import type { MarketSignal } from '@/types'
import { Surface } from '@/components/ui/Surface'
import {
  WorkspaceEmpty,
  WorkspaceLoading,
  type AgentWorkspaceStatus,
} from '@/components/ui/WorkspaceState'
import { SIGNAL_META } from './market-intelligence.meta'

export function MarketBrowserWorkspace({
  signal,
  status,
}: {
  signal: MarketSignal | null
  status: AgentWorkspaceStatus
}) {
  const host = readableSource(signal?.sourceUrl)

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50/80 px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        </div>
        <div className="mx-4 flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[11px] text-ink-500 shadow-sm">
          {signal ? (
            <LockKeyhole className="h-3 w-3 shrink-0 text-ink-400" />
          ) : (
            <Search className="h-3 w-3 shrink-0 text-ink-400" />
          )}
          <span className="truncate">
            {signal ? host : '等待真实来源进入研究工作区'}
          </span>
        </div>
        {signal ? (
          <a
            href={signal.sourceUrl}
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

      <div className="grid min-h-[430px] lg:grid-cols-[148px_minmax(0,1fr)]">
        <aside className="border-b border-ink-200 bg-ink-50/65 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            研究来源
          </p>
          <SourceChannel icon={Globe2} label="企业官网" />
          <SourceChannel icon={Newspaper} label="新闻页面" />
          <SourceChannel icon={Building2} label="招聘页面" />
          <SourceChannel icon={FileSearch} label="投资公告" />
          <p className="mt-4 px-2 text-[10px] leading-4 text-ink-400">
            来源类型代表研究范围，不表示所有页面已经访问。
          </p>
        </aside>

        <main className="min-w-0 bg-white">
          {status === 'running' || status === 'reviewing' ? (
            <WorkspaceLoading
              title={
                status === 'running'
                  ? '正在获取真实市场来源'
                  : '正在整理本次扫描结果'
              }
              description="只有带有效来源的网址和内容才会进入市场变化列表。"
            />
          ) : signal ? (
            <SourceDocument signal={signal} />
          ) : status === 'failed' ? (
            <WorkspaceEmpty
              icon={Globe2}
              title="暂时无法读取市场来源"
              description="系统没有使用历史记录或模拟网页替代本次结果，请稍后重新扫描。"
            />
          ) : (
            <WorkspaceEmpty
              icon={Globe2}
              title="等待新的真实来源"
              description="设置产品和目标市场后开始扫描。没有可验证来源时，这里不会展示模拟网页。"
            />
          )}
        </main>
      </div>
    </Surface>
  )
}

function SourceChannel({
  icon: Icon,
  label,
}: {
  icon: typeof Globe2
  label: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] text-ink-600">
      <Icon className="h-3.5 w-3.5 text-ink-400" />
      {label}
    </div>
  )
}

function SourceDocument({ signal }: { signal: MarketSignal }) {
  const meta = SIGNAL_META[signal.signalType]
  const Icon = meta.icon

  return (
    <article className="mx-auto max-w-3xl px-6 py-7 sm:px-9 sm:py-9">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="text-[10px] text-ink-400">
          {formatTimestamp(signal.detectedAt)}
        </span>
        <span className="text-[10px] text-ink-400">
          可信度 {signal.confidence}%
        </span>
      </div>

      <p className="mt-7 text-xs font-semibold text-ink-500">
        {signal.companyName || '相关主体待确认'}
      </p>
      <h2 className="mt-2 text-2xl font-semibold leading-9 tracking-[-0.035em] text-ink-900">
        {signal.title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-ink-600">{signal.summary}</p>

      {signal.content && signal.content !== signal.summary && (
        <div className="mt-6 border-l-2 border-ink-200 pl-4">
          <p className="line-clamp-6 text-xs leading-6 text-ink-500">
            {signal.content}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 pt-4 text-[10px] text-ink-400">
        <span>来源：{readableSource(signal.sourceUrl)}</span>
        <span>地区：{signal.country || signal.region || '待确认'}</span>
        <span>来源类型：{signal.sourceType || '网页来源'}</span>
      </div>
    </article>
  )
}

function readableSource(url: string | undefined) {
  if (!url) return '真实来源待确认'
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
