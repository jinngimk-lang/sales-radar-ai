import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bot,
  CircleDollarSign,
  Play,
  Radar,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'
import { RevenueLiveOpsPanel } from '@/features/revenue/RevenueLiveOpsPanel'
import {
  getRevenueDashboard,
  type RevenueDashboard,
  type RevenueOpportunity,
} from '@/features/revenue/revenue-api'
import { RevenueDashboardPage } from './RevenueDashboardPage'

export function RevenueOperationsPage() {
  const [dashboard, setDashboard] = useState<RevenueDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showLiveOps, setShowLiveOps] = useState(false)
  const settlementRef = useRef<HTMLDivElement | null>(null)
  const opportunities = dashboard?.opportunities ?? []
  const hasRevenueData =
    opportunities.length > 0 || (dashboard?.ledger.length ?? 0) > 0

  useEffect(() => {
    let active = true
    setLoading(true)
    void getRevenueDashboard('USD')
      .then((nextDashboard) => {
        if (!active) return
        setDashboard(nextDashboard)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        setDashboard(null)
        setLoadError(
          error instanceof Error ? error.message : '暂时无法读取收益数据',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const focusSettlement = () => {
    settlementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="收益中心"
        description="把发现推进到收入。"
      />

      <section className="mt-4 overflow-hidden rounded-[24px] border border-black/[0.08] bg-white">
        <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
            Revenue Workflow
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.025em] text-ink-950">
                把发现推进到收入
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-500">
                这里不创造机会。先从公开来源找到真实信号，再判断、执行，并只用可验证证据记录收入。
              </p>
            </div>
            <p className="text-[10px] text-ink-400">
              潜在收益不会计入已确认收入
            </p>
          </div>
        </div>

        <div className="grid divide-y divide-black/[0.06] md:grid-cols-4 md:divide-x md:divide-y-0">
          <WorkflowLink
            step="01"
            icon={Radar}
            title="发现机会"
            description="从市场变化和公开来源开始。"
            to="/app/market"
            action="去市场雷达"
          />
          <WorkflowLink
            step="02"
            icon={Bot}
            title="判断"
            description="核对对象、联系人、证据和下一步。"
            to="/app/home"
            action="去 AI 首页"
          />
          <WorkflowButton
            step="03"
            icon={Play}
            title="Live 执行"
            description="有真实机会后，再打开云端执行画面。"
            action={showLiveOps ? '收起 Live' : '打开 Live'}
            active={showLiveOps}
            onClick={() => setShowLiveOps((value) => !value)}
          />
          <WorkflowButton
            step="04"
            icon={Banknote}
            title="结算"
            description="查看确认收入、到账和证据流水。"
            action="查看结算"
            onClick={focusSettlement}
          />
        </div>
      </section>

      <RevenueMetrics dashboard={dashboard} opportunities={opportunities} />

      {loadError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">
          {loadError}
        </div>
      ) : null}

      {!loading && !loadError && opportunities.length === 0 ? (
        <section className="mt-4 flex flex-col gap-4 rounded-[24px] border border-dashed border-black/[0.10] bg-white px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-ink-900">
              这里还没有可执行机会
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-500">
              收益中心不会生成虚假机会。先去市场雷达发现真实信号，完成判断后再回到这里执行。
            </p>
          </div>
          <Link
            to="/app/market"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-ink-800"
          >
            去市场雷达发现机会
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      {showLiveOps ? (
        <div id="revenue-live-ops" className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold text-ink-900">Live 执行</p>
              <p className="mt-0.5 text-[10px] text-ink-500">
                只有在你主动进入执行步骤时才显示云端浏览器与动作时间线。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLiveOps(false)}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            >
              收起 Live
            </button>
          </div>
          <RevenueLiveOpsPanel opportunities={opportunities} />
        </div>
      ) : null}

      <div
        ref={settlementRef}
        id="revenue-settlement"
        className="mt-6 scroll-mt-20"
      >
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold text-ink-900">
              机会队列与结算证据
            </p>
            <p className="mt-0.5 text-[10px] text-ink-500">
              只展示后端已经记录的真实机会、确认状态和证据。
            </p>
          </div>
        </div>

        {hasRevenueData ? (
          <div
            data-revenue-dashboard-mode="embedded"
            className="[&>div]:!min-h-0 [&>div]:!bg-transparent [&>div]:!px-0 [&>div]:!py-0 [&>div>div]:!max-w-none [&>div>div>header]:hidden"
          >
            <RevenueDashboardPage />
          </div>
        ) : (
          <div
            data-revenue-dashboard-mode="embedded"
            className="rounded-[20px] border border-black/[0.08] bg-white px-5 py-5 text-xs leading-5 text-ink-500"
          >
            暂无机会队列或结算记录。完成真实机会判断后，这里才会出现执行状态和收益证据。
            <span className="sr-only">
              <RevenueDashboardPage />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function RevenueMetrics({
  dashboard,
  opportunities,
}: {
  dashboard: RevenueDashboard | null
  opportunities: RevenueOpportunity[]
}) {
  const actionableCount = opportunities.filter((item) =>
    ['QUALIFIED', 'ACTIVE', 'WAITING'].includes(item.status),
  ).length
  const executingCount = opportunities.filter((item) =>
    ['ACTIVE', 'WAITING'].includes(item.status),
  ).length
  const currency = dashboard?.summary.currency ?? 'USD'

  return (
    <section className="mt-4 grid gap-3 sm:grid-cols-3">
      <MetricCard
        icon={Search}
        label="可执行机会"
        value={String(actionableCount)}
        detail="已核验或正在推进"
      />
      <MetricCard
        icon={CircleDollarSign}
        label="执行中"
        value={String(executingCount)}
        detail="执行中或等待结算"
      />
      <MetricCard
        icon={BadgeCheck}
        label="已确认收入"
        value={formatMoney(dashboard?.summary.confirmedMinor ?? 0, currency)}
        detail={`已到账 ${formatMoney(dashboard?.summary.paidMinor ?? 0, currency)}`}
      />
    </section>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Search
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="rounded-[20px] border border-black/[0.08] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-ink-500">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.03em] text-ink-950">
            {value}
          </p>
          <p className="mt-1 text-[10px] text-ink-400">{detail}</p>
        </div>
        <Icon className="h-4 w-4 text-ink-300" />
      </div>
    </article>
  )
}

function WorkflowLink({
  step,
  icon: Icon,
  title,
  description,
  to,
  action,
}: {
  step: string
  icon: typeof Search
  title: string
  description: string
  to: string
  action: string
}) {
  return (
    <Link
      to={to}
      className="group min-w-0 px-5 py-5 transition hover:bg-ink-50/70"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-100 text-ink-600 transition group-hover:bg-white">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[9px] font-semibold text-ink-300">{step}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-ink-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700">
        {action}
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  )
}

function WorkflowButton({
  step,
  icon: Icon,
  title,
  description,
  action,
  active = false,
  onClick,
}: {
  step: string
  icon: typeof Search
  title: string
  description: string
  action: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-w-0 px-5 py-5 text-left transition hover:bg-ink-50/70 ${
        active ? 'bg-brand-50/55' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-100 text-ink-600 transition group-hover:bg-white">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[9px] font-semibold text-ink-300">{step}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-ink-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700">
        {action}
        <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  )
}

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100)
}
