import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CornerDownLeft,
  FileSearch,
  FileText,
  Globe2,
  LockKeyhole,
  Newspaper,
  RefreshCw,
  Search,
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
import { MARKET_WORKSPACE_HEIGHT } from './market-intelligence.meta'

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

const PRIMARY_SOURCE_TYPES: MarketResearchSourceType[] = [
  'company',
  'news',
  'jobs',
  'investment',
  'industry',
  'other',
]

type SourceFilter = 'all' | MarketResearchSourceType
type BrowserView = 'live' | 'summary'

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
  const [activeSourceType, setActiveSourceType] = useState<SourceFilter>('all')
  const [addressInput, setAddressInput] = useState('')
  const [addressError, setAddressError] = useState('')
  const [customAddress, setCustomAddress] = useState<string | null>(null)
  const [browserView, setBrowserView] = useState<BrowserView>('live')

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
  const selectedAddress = selectedSource?.url ?? signal?.sourceUrl ?? ''

  useEffect(() => {
    if (!customAddress) setAddressInput(selectedAddress)
    setAddressError('')
  }, [customAddress, selectedAddress])

  const selectSourceType = (sourceType: SourceFilter) => {
    setCustomAddress(null)
    setActiveSourceType(sourceType)
    setBrowserView('live')
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
      setCustomAddress(null)
      setActiveSourceType(matchingSource.sourceType)
      setBrowserView('live')
      onSelectSource(matchingSource.id)
      return
    }

    setCustomAddress(normalized)
    setAddressInput(normalized)
    setBrowserView('live')
    setAddressError('这是临时公开网页预览，不会被冒充为已保存市场证据。')
  }

  return (
    <Surface
      className={cn(
        MARKET_WORKSPACE_HEIGHT,
        'flex min-h-0 min-w-0 flex-col overflow-hidden',
      )}
    >
      <BrowserChrome
        value={addressInput}
        status={status}
        secured={Boolean(selectedSource || signal)}
        onChange={(value) => {
          setAddressInput(value)
          setAddressError('')
        }}
        onSubmit={submitAddress}
      />

      {addressError ? (
        <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[10px] text-amber-700">
          {addressError}
        </div>
      ) : null}

      <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-x-hidden overflow-y-auto border-b border-ink-200 bg-ink-50/65 p-3 scrollbar-thin lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              真实研究来源
            </p>
            {session ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-ink-500 ring-1 ring-ink-200">
                {session.sources.length}
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            {PRIMARY_SOURCE_TYPES.map((sourceType) => {
              const meta = SOURCE_META[sourceType]
              const Icon = meta.icon
              const count =
                session?.sources.filter(
                  (source) => source.sourceType === sourceType,
                ).length ?? 0
              return (
                <button
                  key={sourceType}
                  type="button"
                  onClick={() => selectSourceType(sourceType)}
                  disabled={count === 0}
                  aria-pressed={activeSourceType === sourceType}
                  title={count === 0 ? '本次扫描没有该类来源' : `筛选 ${meta.label}`}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-medium transition disabled:cursor-default disabled:opacity-45',
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
              <button
                type="button"
                onClick={() => selectSourceType('all')}
                className={cn(
                  'mb-2 w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold',
                  activeSourceType === 'all'
                    ? 'bg-white text-brand-700'
                    : 'text-ink-500 hover:bg-white',
                )}
              >
                全部来源 · {session.sources.length}
              </button>

              <div className="space-y-1 pr-1">
                {filteredSources.map((source) => (
                  <SourceButton
                    key={source.id}
                    source={source}
                    active={source.id === selectedSource?.id}
                    onClick={() => {
                      setCustomAddress(null)
                      setActiveSourceType(source.sourceType)
                      setBrowserView('live')
                      onSelectSource(source.id)
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-4 px-2 text-[10px] leading-4 text-ink-400">
            点击任意来源，右侧立即打开网页画面；地址栏也可以直接预览公开网址。
          </p>
        </aside>

        <main className="min-h-0 min-w-0 overflow-hidden bg-white">
          {status === 'running' || status === 'reviewing' ? (
            <div className="h-full overflow-y-auto">
              <WorkspaceLoading
                title="正在研究公开网页"
                description="正在发现并读取公开来源；完成后会直接打开第一个推荐网页。"
              />
            </div>
          ) : customAddress ? (
            <BrowserContent
              url={customAddress}
              title={hostname(customAddress)}
              view={browserView}
              onViewChange={setBrowserView}
              summary={null}
              source={null}
              session={null}
            />
          ) : selectedSource && session ? (
            <BrowserContent
              url={selectedSource.url}
              title={selectedSource.title}
              view={browserView}
              onViewChange={setBrowserView}
              summary={selectedSource.summary}
              source={selectedSource}
              session={session}
            />
          ) : session && activeSourceType !== 'all' ? (
            <div className="h-full overflow-y-auto">
              <WorkspaceEmpty
                icon={SOURCE_META[activeSourceType].icon}
                title={`本次没有${SOURCE_META[activeSourceType].label}结果`}
                description="切换其他分类、重新扫描，或在上方输入网址直接打开。"
              />
            </div>
          ) : signal ? (
            <BrowserContent
              url={signal.sourceUrl}
              title={signal.title}
              view={browserView}
              onViewChange={setBrowserView}
              summary={signal.summary}
              source={null}
              session={null}
              signal={signal}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <WorkspaceEmpty
                icon={Globe2}
                title={status === 'failed' ? '本次联网研究未完成' : '等待开始研究'}
                description={
                  status === 'failed'
                    ? '请缩小搜索范围后重试；系统不会用百科或模拟网页替代失败结果。'
                    : '输入产品或服务后开始扫描。找到来源后会在这里自动打开推荐网页画面。'
                }
              />
            </div>
          )}
        </main>
      </div>
    </Surface>
  )
}

function BrowserChrome({
  value,
  status,
  secured,
  onChange,
  onSubmit,
}: {
  value: string
  status: AgentWorkspaceStatus
  secured: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-ink-200 bg-ink-50/80 px-4 py-3">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className="mx-4 flex min-w-0 max-w-2xl flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[11px] text-ink-500 shadow-sm focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10"
      >
        {secured ? (
          <LockKeyhole className="h-3 w-3 shrink-0 text-emerald-600" />
        ) : (
          <Search className="h-3 w-3 shrink-0 text-ink-400" />
        )}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            status === 'running'
              ? '正在打开公开网页…'
              : '输入或粘贴网址，按 Enter 打开'
          }
          aria-label="网页预览网址"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-ink-700 outline-none placeholder:text-ink-400"
        />
        <button
          type="submit"
          aria-label="打开网址"
          className="rounded p-0.5 text-ink-400 transition hover:text-brand-700"
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </form>
      <button
        type="button"
        onClick={onSubmit}
        aria-label="打开当前网址"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-700 disabled:opacity-30"
        disabled={!value.trim()}
      >
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
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

function BrowserContent({
  url,
  title,
  view,
  onViewChange,
  summary,
  source,
  session,
  signal,
}: {
  url: string
  title: string
  view: BrowserView
  onViewChange: (view: BrowserView) => void
  summary: string | null
  source: MarketResearchSource | null
  session: MarketResearchSession | null
  signal?: MarketSignal
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ink-200 bg-white px-4 py-2.5">
        <div className="inline-flex rounded-xl border border-ink-200 bg-ink-50 p-1">
          <button
            type="button"
            onClick={() => onViewChange('live')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition',
              view === 'live'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            <Globe2 className="h-3.5 w-3.5" />
            网页画面
          </button>
          <button
            type="button"
            onClick={() => onViewChange('summary')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition',
              view === 'summary'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            研究摘要
          </button>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[10px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
        >
          独立窗口打开
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
        {view === 'live' ? (
          <LiveWebPreview
            url={url}
            title={title}
            onFallbackToSummary={() => onViewChange('summary')}
          />
        ) : (
          <ResearchSummary
            title={title}
            url={url}
            summary={summary}
            source={source}
            session={session}
            signal={signal}
          />
        )}
      </div>
    </div>
  )
}

function LiveWebPreview({
  url,
  title,
  onFallbackToSummary,
}: {
  url: string
  title: string
  onFallbackToSummary: () => void
}) {
  const [loadKey, setLoadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const media = resolveVisualMedia(url)

  useEffect(() => {
    setLoading(true)
  }, [url, loadKey, media.type])

  const finishLoading = () => setLoading(false)
  const fallBackSilently = () => {
    finishLoading()
    onFallbackToSummary()
  }

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-ink-100">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-ink-50/90 px-4 py-2 text-[10px] text-ink-500">
        <span className="min-w-0 truncate">
          已打开：<strong className="font-semibold text-ink-700">{title}</strong>
        </span>
        <button
          type="button"
          onClick={() => setLoadKey((value) => value + 1)}
          className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-700"
        >
          <RefreshCw className="h-3 w-3" />
          刷新画面
        </button>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-xs text-ink-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-brand-600" />
            正在载入网页画面…
          </div>
        ) : null}

        {media.type === 'image' ? (
          <div className="flex min-h-full items-center justify-center bg-ink-950 p-4">
            <img
              key={loadKey}
              src={media.url}
              alt={title}
              referrerPolicy="no-referrer"
              className="max-w-full object-contain"
              onLoad={finishLoading}
              onError={fallBackSilently}
            />
          </div>
        ) : media.type === 'video' ? (
          <div className="flex min-h-full items-center justify-center bg-black p-4">
            <video
              key={loadKey}
              src={media.url}
              controls
              playsInline
              className="max-w-full"
              onLoadedData={finishLoading}
              onError={fallBackSilently}
            />
          </div>
        ) : media.type === 'embed' ? (
          <iframe
            key={`${media.url}-${loadKey}`}
            src={media.url}
            title={`网页预览：${title}`}
            className="h-full min-h-[620px] w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={finishLoading}
          />
        ) : media.type === 'page' ? (
          <div className="min-h-full bg-white">
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-[9px] font-medium text-amber-700">
              网页快照 · 自动显示当前推荐来源；需要操作网页时可点“独立窗口打开”
            </div>
            <img
              key={`snapshot-${url}-${loadKey}`}
              src={buildSnapshotUrl(media.url)}
              alt={`${title} 网页快照`}
              referrerPolicy="no-referrer"
              className="block h-auto w-full bg-white object-contain object-top"
              onLoad={finishLoading}
              onError={fallBackSilently}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ResearchSummary({
  title,
  url,
  summary,
  source,
  session,
  signal,
}: {
  title: string
  url: string
  summary: string | null
  source: MarketResearchSource | null
  session: MarketResearchSession | null
  signal?: MarketSignal
}) {
  const body = source?.summary ?? signal?.summary ?? summary
  return (
    <div className="h-full overflow-x-hidden overflow-y-auto scrollbar-thin">
      <article className="mx-auto max-w-4xl px-6 py-8 sm:px-9">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-ink-500">
          {source ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
              {SOURCE_META[source.sourceType].label}
            </span>
          ) : null}
          {session ? (
            <span>{session.provider} · {session.model}</span>
          ) : null}
        </div>
        <p className="mt-6 text-xs font-semibold text-ink-500">{hostname(url)}</p>
        <h2 className="mt-2 text-2xl font-semibold leading-9 tracking-[-0.035em] text-ink-900">
          {title}
        </h2>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-ink-600">
          {body || '这个公开网页尚未生成研究摘要，请直接查看网页画面或重新扫描。'}
        </p>
        {session?.summary ? (
          <div className="mt-7 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-xs leading-6 text-ink-600">
            {session.summary}
          </div>
        ) : null}
      </article>
    </div>
  )
}

function buildSnapshotUrl(value: string): string {
  return `https://image.thum.io/get/noanimate/maxAge/6/width/1440/crop/2400/${encodeURI(value)}`
}

function resolveVisualMedia(value: string): {
  type: 'page' | 'embed' | 'image' | 'video'
  url: string
} {
  const url = new URL(value)
  if (url.protocol === 'http:') url.protocol = 'https:'
  const previewUrl = url.href
  const path = url.pathname.toLowerCase()

  if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(path)) {
    return { type: 'image', url: previewUrl }
  }
  if (/\.(?:mp4|m4v|mov|ogv|webm)$/i.test(path)) {
    return { type: 'video', url: previewUrl }
  }
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    if (id) return { type: 'embed', url: `https://www.youtube.com/embed/${id}` }
  }
  if (/^(?:www\.)?youtube\.com$/i.test(url.hostname)) {
    const id = url.searchParams.get('v')
    if (id) return { type: 'embed', url: `https://www.youtube.com/embed/${id}` }
  }
  if (/^(?:www\.)?vimeo\.com$/i.test(url.hostname)) {
    const id = url.pathname.split('/').filter(Boolean)[0]
    if (/^\d+$/.test(id || '')) {
      return { type: 'embed', url: `https://player.vimeo.com/video/${id}` }
    }
  }
  return { type: 'page', url: previewUrl }
}

function normalizeExternalAddress(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}
