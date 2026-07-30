import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Clock3,
  Factory,
  Landmark,
  Loader2,
  Radar,
  RefreshCw,
  Scale,
  ScanSearch,
  TrendingUp,
} from 'lucide-react'
import type { MarketSignal, MarketSignalType } from '@/types'
import { getMarketSignals } from '@/services/api'
import { cn } from '@/lib/utils'

type SignalFilter = 'ALL' | MarketSignalType

const SIGNAL_META: Record<
  MarketSignalType,
  {
    label: string
    icon: typeof Factory
    whyItMatters: string
    recommendedNextStep: string
  }
> = {
  FACTORY_EXPANSION: {
    label: '工厂扩张',
    icon: Factory,
    whyItMatters:
      '企业产能或生产布局正在变化，可能带来设备、软件与供应链相关机会。',
    recommendedNextStep: '核实扩张范围、项目阶段与相关业务部门。',
  },
  INVESTMENT: {
    label: '企业投资',
    icon: Landmark,
    whyItMatters:
      '资本投入可能推动产能、技术或业务扩张，值得进一步理解资金用途。',
    recommendedNextStep: '确认投资方向，并研究可能受到影响的业务环节。',
  },
  DIGITAL_TRANSFORMATION: {
    label: '数字化升级',
    icon: RefreshCw,
    whyItMatters:
      '企业正在推进技术或流程升级，可能形成软件、自动化与服务机会。',
    recommendedNextStep: '了解升级目标、现有系统与项目所处阶段。',
  },
  HIRING_SIGNAL: {
    label: '招聘变化',
    icon: Building2,
    whyItMatters:
      '相关岗位招聘可能反映企业正在建设新能力，但不代表已经产生采购。',
    recommendedNextStep: '核实招聘部门与职责，再判断对应的业务变化。',
  },
  POLICY_CHANGE: {
    label: '政策机会',
    icon: Scale,
    whyItMatters:
      '政策变化可能影响企业投资、合规要求与行业发展节奏。',
    recommendedNextStep: '确认政策适用范围，并继续寻找受影响的企业主体。',
  },
  INDUSTRY_TREND: {
    label: '行业变化',
    icon: TrendingUp,
    whyItMatters:
      '行业需求变化可能形成销售窗口，但仍需要落实到具体企业。',
    recommendedNextStep: '结合产品方向，继续验证相关企业和真实业务场景。',
  },
}

const FILTERS: Array<{
  key: SignalFilter
  label: string
  icon: typeof Radar
}> = [
  { key: 'ALL', label: '全部变化', icon: Radar },
  { key: 'INVESTMENT', label: '企业投资', icon: Landmark },
  { key: 'FACTORY_EXPANSION', label: '工厂扩张', icon: Factory },
  { key: 'DIGITAL_TRANSFORMATION', label: '数字化升级', icon: RefreshCw },
  { key: 'HIRING_SIGNAL', label: '招聘变化', icon: Building2 },
  { key: 'POLICY_CHANGE', label: '政策机会', icon: Scale },
  { key: 'INDUSTRY_TREND', label: '行业变化', icon: TrendingUp },
]

const WORKFLOW = [
  ['01', '设置方向'],
  ['02', '查看变化'],
  ['03', '判断机会'],
  ['04', '进入研究'],
]

export function DashboardPage() {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<SignalFilter>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    getMarketSignals()
      .then((items) => {
        setSignals(items)
        setSelectedId(items[0]?.id ?? null)
      })
      .catch((error) => {
        console.error('[MarketCenter] Unable to load market signals', error)
        setSignals([])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredSignals = useMemo(
    () =>
      activeFilter === 'ALL'
        ? signals
        : signals.filter((signal) => signal.signalType === activeFilter),
    [activeFilter, signals],
  )

  const selectedSignal =
    filteredSignals.find((signal) => signal.id === selectedId) ??
    filteredSignals[0] ??
    null

  const handleFilter = (filter: SignalFilter) => {
    setActiveFilter(filter)
    const next =
      filter === 'ALL'
        ? signals[0]
        : signals.find((signal) => signal.signalType === filter)
    setSelectedId(next?.id ?? null)
  }

  return (
    <div className="workspace-page">
      <header className="workspace-heading">
        <div>
          <p className="workspace-kicker">MARKET RADAR</p>
          <h1>市场机会中心</h1>
          <p>按顺序查看市场变化，理解为什么值得关注，再决定下一步。</p>
        </div>
        <Link to="/app/discover" className="workspace-primary-action">
          <Radar className="h-4 w-4" />
          设置销售目标
        </Link>
      </header>

      <section className="market-workspace">
        <div className="market-workflow">
          <div className="flex min-w-0 items-center gap-3 border-r border-ink-200 pr-5">
            <span className="radar-live-dot" />
            <div>
              <p className="text-xs font-semibold text-ink-800">市场雷达运行中</p>
              <p className="mt-0.5 text-[10px] tracking-wide text-ink-400">
                随真实搜索持续更新
              </p>
            </div>
          </div>
          <div className="grid min-w-[560px] flex-1 grid-cols-4">
            {WORKFLOW.map(([number, label], index) => (
              <div
                key={number}
                className="relative flex items-center gap-2 px-5 after:absolute after:right-0 after:top-1/2 after:h-px after:w-4 after:bg-ink-900/10 last:after:hidden"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[9px]',
                    index === 1
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-ink-300 bg-white text-ink-500',
                  )}
                >
                  {number}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    index === 1 ? 'font-semibold text-brand-800' : 'text-ink-400',
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="market-workspace-body">
          <aside className="market-filter-panel">
            <div className="border-b border-ink-200 px-5 py-4">
              <p className="text-xs font-semibold text-ink-800">关注方向</p>
              <p className="mt-1 text-[10px] leading-4 text-ink-400">
                选择一种变化，查看对应信息
              </p>
            </div>
            <nav className="space-y-1 p-3">
              {FILTERS.map((filter) => {
                const Icon = filter.icon
                const count =
                  filter.key === 'ALL'
                    ? signals.length
                    : signals.filter((signal) => signal.signalType === filter.key)
                        .length
                return (
                  <button
                    key={filter.key}
                    onClick={() => handleFilter(filter.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-all',
                      activeFilter === filter.key
                        ? 'bg-white text-brand-800 shadow-sm'
                        : 'text-ink-600 hover:bg-white hover:text-ink-900',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{filter.label}</span>
                    {count > 0 && (
                      <span className="font-mono text-[9px] text-ink-400">
                        {String(count).padStart(2, '0')}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="market-feed-panel">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-ink-800">市场变化</p>
                <p className="mt-1 text-[10px] text-ink-400">
                  选择一条信息查看判断依据
                </p>
              </div>
              <ScanSearch className="h-4 w-4 text-ink-300" />
            </div>

            {loading ? (
              <div className="flex h-80 items-center justify-center text-xs text-ink-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-600" />
                正在读取市场变化
              </div>
            ) : filteredSignals.length > 0 ? (
              <div className="market-feed-scroll scrollbar-thin">
                {filteredSignals.map((signal) => (
                  <SignalRow
                    key={signal.id}
                    signal={signal}
                    active={selectedSignal?.id === signal.id}
                    onSelect={() => setSelectedId(signal.id)}
                  />
                ))}
              </div>
            ) : (
              <MarketEmptyState />
            )}
          </div>

          <aside className="market-detail-panel">
            {selectedSignal ? (
              <SignalDetail signal={selectedSignal} />
            ) : (
              <div className="flex h-full min-h-96 flex-col items-center justify-center px-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-700">
                  <Radar className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-sm font-semibold text-ink-900">
                  正在扫描市场变化
                </h2>
                <p className="mt-2 max-w-xs text-xs leading-6 text-ink-500">
                  运行一次销售机会搜索后，真实企业变化会按顺序进入这里。
                </p>
                <Link to="/app/discover" className="workspace-secondary-action mt-6">
                  开始发现
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}

function SignalRow({
  signal,
  active,
  onSelect,
}: {
  signal: MarketSignal
  active: boolean
  onSelect: () => void
}) {
  const meta = SIGNAL_META[signal.signalType]
  const Icon = meta.icon

  return (
    <button
      onClick={onSelect}
      className={cn(
        'group flex w-full gap-3 border-b border-ink-200 px-5 py-4 text-left transition-all',
        active ? 'bg-brand-50' : 'hover:bg-ink-50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          active
            ? 'border-brand-200 bg-white text-brand-700'
            : 'border-ink-300 bg-white text-ink-500',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[10px]">
          <span className="font-semibold text-brand-700">{meta.label}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-400">
            {signal.country || signal.region || '地区待确认'}
          </span>
        </span>
        <span className="mt-1.5 line-clamp-2 block text-xs font-semibold leading-5 text-ink-800">
          {signal.title}
        </span>
        <span className="mt-1.5 block truncate text-[10px] text-ink-400">
          {signal.companyName || '相关主体待确认'}
        </span>
      </span>
      <ArrowRight
        className={cn(
          'mt-2 h-3.5 w-3.5 shrink-0 transition-transform',
          active
            ? 'translate-x-0.5 text-brand-600'
            : 'text-ink-300 group-hover:translate-x-0.5',
        )}
      />
    </button>
  )
}

function SignalDetail({ signal }: { signal: MarketSignal }) {
  const meta = SIGNAL_META[signal.signalType]
  const Icon = meta.icon

  return (
    <div className="market-detail-scroll scrollbar-thin">
      <div className="border-b border-ink-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wide text-brand-700">
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-400">
            <Clock3 className="h-3 w-3" />
            {new Date(signal.detectedAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <h2 className="mt-5 text-xl font-medium leading-8 tracking-[-0.02em] text-ink-900">
          {signal.title}
        </h2>
        <p className="mt-3 text-xs leading-6 text-ink-500">{signal.summary}</p>
      </div>

      <div className="space-y-6 px-6 py-6">
        <DetailBlock
          number="01"
          title="发生了什么"
          content={signal.summary}
          tone="fact"
        />
        <DetailBlock
          number="02"
          title="为什么值得关注"
          content={meta.whyItMatters}
          tone="assessment"
        />
        <DetailBlock
          number="03"
          title="推荐下一步"
          content={meta.recommendedNextStep}
          tone="recommendation"
        />

        <div className="border-t border-ink-200 pt-5">
          <p className="text-[10px] font-semibold tracking-wide text-ink-400">
            真实来源
          </p>
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ink-300 bg-white px-4 py-3 text-xs font-semibold text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            <span className="truncate">{readableSource(signal.sourceUrl)}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>

        <Link to="/app/discover" className="workspace-primary-action w-full">
          继续判断销售机会
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-center text-[10px] leading-4 text-ink-400">
          市场变化不等于已确认客户，仍需经过机会与客户验证。
        </p>
      </div>
    </div>
  )
}

function DetailBlock({
  number,
  title,
  content,
  tone,
}: {
  number: string
  title: string
  content: string
  tone: 'fact' | 'assessment' | 'recommendation'
}) {
  return (
    <div className="grid grid-cols-[30px_1fr] gap-3">
      <span
        className={cn(
          'font-mono text-[9px]',
          tone === 'fact' ? 'text-brand-600' : 'text-vermilion',
        )}
      >
        {number}
      </span>
      <div>
        <h3 className="text-xs font-semibold text-ink-800">{title}</h3>
        <p className="mt-2 text-xs leading-6 text-ink-500">{content}</p>
      </div>
    </div>
  )
}

function MarketEmptyState() {
  return (
    <div className="flex h-80 flex-col items-center justify-center px-6 text-center">
      <ScanSearch className="h-6 w-6 text-ink-300" />
      <p className="mt-4 text-xs font-semibold text-ink-700">
        这个方向还没有新变化
      </p>
      <p className="mt-2 max-w-xs text-[11px] leading-5 text-ink-400">
        可以选择其他关注方向，或重新设置产品和目标市场。
      </p>
    </div>
  )
}

function readableSource(url: string | undefined) {
  if (!url) return '真实来源'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return '真实来源'
  }
}
