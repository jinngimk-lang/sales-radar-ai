import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Radar,
  ArrowRight,
  Building2,
  Factory,
  Landmark,
  RefreshCw,
  Scale,
  TrendingUp,
  RadioTower,
  Loader2,
  ArrowUpRight,
  Newspaper,
  Clock3,
} from 'lucide-react'
import type { MarketSignal, MarketSignalType } from '@/types'
import { getMarketSignals } from '@/services/api'

const OPPORTUNITY_AREAS = [
  {
    title: '企业投资',
    description: '关注企业资本投入和业务扩张方向。',
    icon: Landmark,
    available: true,
  },
  {
    title: '工厂扩张',
    description: '发现新工厂、产线和产能变化。',
    icon: Factory,
    available: true,
  },
  {
    title: '数字化升级',
    description: '发现企业自动化、数字化改造机会。',
    icon: RefreshCw,
    available: true,
  },
  {
    title: '政策机会',
    description: '关注影响行业发展的政策变化。',
    icon: Scale,
    available: true,
  },
  {
    title: '行业趋势',
    description: '发现市场需求变化。',
    icon: TrendingUp,
    available: true,
  },
]

const SCAN_AREAS = [
  { label: '全球市场扫描', status: '随搜索更新', icon: Radar, active: true },
  { label: '企业动向', status: '正在关注', icon: Building2, active: true },
  { label: '行业变化', status: '持续发现', icon: TrendingUp, active: true },
  { label: '政策机会', status: '持续关注', icon: Scale, active: true },
]

const SIGNAL_META: Record<
  MarketSignalType,
  {
    label: string
    whyItMatters: string
    recommendedNextStep: string
  }
> = {
  FACTORY_EXPANSION: {
    label: '工厂扩张',
    whyItMatters:
      '企业产能或生产布局正在变化，可能带来设备、软件和供应链相关需求。',
    recommendedNextStep: '核实扩张范围，并研究相关采购部门和技术负责人。',
  },
  INVESTMENT: {
    label: '企业投资',
    whyItMatters:
      '新的资本投入可能推动产能、技术或业务扩张，形成相关产品和服务需求。',
    recommendedNextStep: '核实投资用途、项目阶段和可能参与决策的业务部门。',
  },
  DIGITAL_TRANSFORMATION: {
    label: '数字化升级',
    whyItMatters:
      '企业正在推进技术或流程升级，可能出现新的软件、自动化与服务需求。',
    recommendedNextStep: '了解升级项目的业务目标、现有系统和项目负责人。',
  },
  HIRING_SIGNAL: {
    label: '招聘变化',
    whyItMatters:
      '相关岗位招聘可能反映企业正在建设新能力或推进新的业务项目。',
    recommendedNextStep: '确认招聘部门与岗位职责，再判断对应的业务需求。',
  },
  POLICY_CHANGE: {
    label: '政策机会',
    whyItMatters:
      '政策变化可能影响企业投资方向、合规要求或行业发展节奏。',
    recommendedNextStep: '确认政策适用范围，并筛选可能受到影响的目标企业。',
  },
  INDUSTRY_TREND: {
    label: '行业变化',
    whyItMatters:
      '行业需求变化可能形成新的销售窗口，但仍需进一步确认具体企业。',
    recommendedNextStep: '结合产品和目标市场，继续寻找受趋势影响的企业主体。',
  },
}

/** 市场机会中心 */
export function DashboardPage() {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMarketSignals()
      .then(setSignals)
      .catch((error) => {
        console.error('[MarketCenter] Unable to load market signals', error)
        setSignals([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">市场机会中心</h1>
        <p className="mt-1 text-sm text-ink-500">
          关注企业变化、行业趋势和市场机会，发现值得跟进的销售方向。
        </p>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-brand-100/70">
          <div className="absolute inset-10 rounded-full border border-brand-100/70" />
          <div className="absolute inset-20 rounded-full border border-brand-200/70" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">
            <RadioTower className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-ink-900">市场情报扫描</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              正在关注企业变化和市场机会
            </p>
          </div>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SCAN_AREAS.map((area) => {
            const Icon = area.icon
            return (
              <div
                key={area.label}
                className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur"
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-4 w-4 text-brand-600" />
                  <span
                    className={
                      area.active
                        ? 'h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100'
                        : 'h-2 w-2 rounded-full bg-ink-300 ring-4 ring-ink-100'
                    }
                  />
                </div>
                <p className="mt-3 text-sm font-semibold text-ink-900">
                  {area.label}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{area.status}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-6">
        <div>
          <h2 className="font-semibold text-ink-900">关注的机会类型</h2>
          <p className="mt-1 text-xs text-ink-500">
            关注影响销售方向的企业动向与市场变化
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {OPPORTUNITY_AREAS.map((area) => {
            const Icon = area.icon
            return (
              <div key={area.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-ink-50 px-2 py-1 text-[10px] font-semibold text-ink-500">
                    {area.available ? '可识别' : '待接入'}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-ink-900">
                  {area.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-ink-500">
                  {area.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-ink-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold text-ink-900">市场情报浏览器</h2>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              浏览最近搜索发现的企业变化与市场信息
            </p>
          </div>
          {signals.length > 0 && (
            <Link to="/app/discover" className="btn-ghost text-xs">
              继续发现机会
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-ink-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-500" />
            正在加载最近发现
          </div>
        ) : signals.length > 0 ? (
          <div className="divide-y divide-ink-100">
            {signals.slice(0, 20).map((signal) => (
              <MarketSignalCard
                key={signal.id}
                signal={signal}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-ink-50/30 px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-600 shadow-sm">
              <Radar className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-ink-900">
              正在扫描市场变化
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
              系统会根据企业投资、扩张、数字化升级和行业变化发现新的销售机会。
            </p>
            <Link to="/app/discover" className="btn-primary mt-5">
              设置销售目标
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

function MarketSignalCard({
  signal,
}: {
  signal: MarketSignal
}) {
  const meta = SIGNAL_META[signal.signalType]
  const region = signal.country || signal.region || '地区待确认'
  const sourceName = readableSource(signal.sourceUrl)
  const TypeIcon =
    signal.signalType === 'FACTORY_EXPANSION'
      ? Factory
      : signal.signalType === 'INVESTMENT'
        ? Landmark
        : signal.signalType === 'POLICY_CHANGE'
          ? Scale
          : signal.signalType === 'INDUSTRY_TREND'
            ? TrendingUp
            : signal.signalType === 'HIRING_SIGNAL'
              ? Building2
              : RefreshCw

  return (
    <article className="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-brand-50/30 sm:flex-row">
      <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white text-brand-500 sm:w-40">
        <TypeIcon className="h-8 w-8" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
            {meta.label}
          </span>
          <span className="text-ink-400">{region}</span>
          <span className="text-ink-300">·</span>
          <span className="inline-flex items-center gap-1 text-ink-400">
            <Clock3 className="h-3.5 w-3.5" />
            {new Date(signal.detectedAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold leading-6 text-ink-900 group-hover:text-brand-700">
          {signal.title}
        </h3>
        <p className="mt-1 text-xs font-medium text-ink-500">
          {signal.companyName || '相关主体待确认'}
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">
          {signal.summary}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-brand-50/70 p-3">
            <p className="text-xs font-semibold text-brand-700">
              为什么值得关注
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-600">
              {meta.whyItMatters}
            </p>
          </div>
          <div className="rounded-xl bg-ink-50 p-3">
            <p className="text-xs font-semibold text-ink-700">推荐下一步</p>
            <p className="mt-1 text-xs leading-5 text-ink-600">
              {meta.recommendedNextStep}
            </p>
          </div>
        </div>
        <a
          href={signal.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          {sourceName}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
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
