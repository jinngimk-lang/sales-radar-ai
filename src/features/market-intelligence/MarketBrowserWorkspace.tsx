import { useEffect, useMemo, useState } from 'react'
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
  CornerDownLeft,
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

type SourceFilter = 'all' | MarketResearchSourceType

const PRIMARY_SOURCE_TYPES: MarketResearchSourceType[] = [
  'company',
  'news',
  'jobs',
  'investment',
  'industry',
]

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
  const [activeSourceType, setActiveSourceType] =
    useState<SourceFilter>('all')
  const [addressInput, setAddressInput] = useState('')
  const [addressError, setAddressError] = useState('')
  const filteredSources = useMemo(
    () =>
      session?.sources.filter(
        (source) =>
          activeSourceType === 'all' || source.sourceType === activeSourceType,
      ) ?? [],
    [activeSourceType, session],
  )
  const selectedSource =
    filteredSources.find((source) => source.id === selectedSourceId) ??
    filteredSources[0] ??
    null
  const address = selectedSource?.url ?? signal?.sourceUrl ?? ''

  useEffect(() => {
    setAddressInput(address)
    setAddressError('')
  }, [address])

  const selectSourceType = (sourceType: SourceFilter) => {
    setActiveSourceType(sourceType)
    const first = session?.sources.find(
      (source) => sourceType === 'all' || source.sourceType === sourceType,
    )
    if (first) onSelectSource(first.id)
  }

  const submitAddress = () => {
    const normalized = normalizeExternalAddress(addressInput)
    if (!normalized) {
      setAddressError('请输入有效的 http(s) 网址')
      return
    }
    const matchingSource = session?.sources.find(
      (source) => normalizeExternalAddress(source.url) === normalized,
    )
    if (matchingSource) {
      setActiveSourceType(matchingSource.sourceType)
      onSelectSource(matchingSource.id)
      return
    }
    window.open(normalized, '_blank', 'noopener,noreferrer')
    setAddressError('该网址未在本次研究中抓取，已在新标签页安全打开。')
  }

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50/80 px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submitAddress()
          }}
          className="mx-4 flex min-w-0 max-w-2xl flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[11px] text-ink-500 shadow-sm focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10"
        >
          {selectedSource || signal ? (
            <LockKeyhole className="h-3 w-3 shrink-0 text-emerald-600" />
          ) : (
            <Search className="h-3 w-3 shrink-0 text-ink-400" />
          )}
          <input
            value={addressInput}
            onChange={(event) => {
              setAddressInput(event.target.value)
              setAddressError('')
            }}
            placeholder={status === 'running' ? '云端研究正在打开公开网页…' : '输入或粘贴网址，按 Enter 打开'}
            aria-label="云端浏览器网址"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-ink-700 outline-none placeholder:text-ink-400"
          />
          <button type="submit" aria-label="打开网址" className="rounded p-0.5 text-ink-400 transition hover:text-brand-700">
            <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </form>
        <button
          type="button"
          onClick={submitAddress}
          aria-label="打开当前网址"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-700 disabled:opacity-30"
          disabled={!addressInput.trim()}
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      {addressError && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[10px] text-amber-700">
          {addressError}
        </div>
      )}

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
          <div className="space-y-1">
            {PRIMARY_SOURCE_TYPES.map((sourceType) => {
              const meta = SOURCE_META[sourceType]
              const Icon = meta.icon
              const count = session?.sources.filter(
                (source) => source.sourceType === sourceType,
              ).length ?? 0
              return (
                <button
                  key={sourceType}
                  type="button"
                  onClick={() => selectSourceType(sourceType)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-medium transition',
                    activeSourceType === sourceType
                      ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                      : 'text-ink-600 hover:bg-white hover:text-ink-900',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{meta.label}</span>
                  <span className="text-[9px] text-ink-400">{count}</span>
                </button>
              )
            })}
          </div>

          {session?.sources.length ? (
            <div className="mt-4 border-t border-ink-200 pt-3">
              <button type="button" onClick={() => selectSourceType('all')} className={cn('mb-2 w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold', activeSourceType === 'all' ? 'bg-white text-brand-700' : 'text-ink-500 hover:bg-white')}>
                全部来源 · {session.sources.length}
              </button>
              <div className="max-h-[255px] space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                {filteredSources.map((source) => (
                  <SourceButton
                    key={source.id}
                    source={source}
                    active={source.id === selectedSource?.id}
                    onClick={() => {
                      setActiveSourceType(source.sourceType)
                      onSelectSource(source.id)
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <p className="mt-4 px-2 text-[10px] leading-4 text-ink-400">
            点击分类查看本次 API 返回的最新来源；地址栏可输入任意公开网址。
          </p>
        </aside>

        <main className="min-w-0 bg-white">
          {status === 'running' || status === 'reviewing' ? (
            <WorkspaceLoading
              title="云端研究正在浏览公开网页"
              description="模型正在检索企业官网、新闻、招聘、投资和行业来源；完成后显示实际访问记录。"
            />
          ) : addressError && !selectedSource ? (
            <WorkspaceEmpty
              icon={Globe2}
              title="网址未进入本次研究记录"
              description={addressError}
            />
          ) : selectedSource && session ? (
            <ResearchDocument source={selectedSource} session={session} />
          ) : session && activeSourceType !== 'all' ? (
            <WorkspaceEmpty
              icon={SOURCE_META[activeSourceType].icon}
              title={`本次没有${SOURCE_META[activeSourceType].label}结果`}
              description="该分类没有被联网研究服务返回。可切换其他分类、重新扫描，或在上方输入网址直接打开。"
            />
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

function normalizeExternalAddress(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
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
