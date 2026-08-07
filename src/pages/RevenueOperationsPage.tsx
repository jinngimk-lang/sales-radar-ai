import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  FlaskConical,
  Search,
  ShieldCheck,
} from 'lucide-react'
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
  const opportunities = dashboard?.opportunities ?? []

  useEffect(() => {
    let active = true
    void getRevenueDashboard('USD')
      .then((nextDashboard) => {
        if (active) setDashboard(nextDashboard)
      })
      .catch(() => {
        if (active) setDashboard(null)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="收益中心"
        description="只看真实机会、执行和结算。"
      />

      <RevenueSummary dashboard={dashboard} opportunities={opportunities} />

      <div className="mt-4">
        <RevenueLiveOpsPanel opportunities={opportunities} />
      </div>

      <div
        data-revenue-dashboard-mode="embedded"
        className="mt-5 [&>div]:!min-h-0 [&>div]:!bg-transparent [&>div]:!px-0 [&>div]:!py-0 [&>div>div]:!max-w-none [&>div>div>header]:hidden"
      >
        <RevenueDashboardPage />
      </div>
    </div>
  )
}

function RevenueSummary({
  dashboard,
  opportunities,
}: {
  dashboard: RevenueDashboard | null
  opportunities: RevenueOpportunity[]
}) {
  const stages = useMemo(() => {
    const verified = opportunities.filter((item) =>
      ['QUALIFIED', 'ACTIVE', 'WAITING', 'WON'].includes(item.status),
    ).length
    const executing = opportunities.filter((item) =>
      ['ACTIVE', 'WAITING'].includes(item.status),
    ).length
    const confirmed =
      dashboard?.ledger.filter((item) =>
        ['CONFIRMED', 'PENDING_PAYOUT', 'PAID'].includes(item.status),
      ).length ?? 0
    const paid =
      dashboard?.ledger.filter((item) => item.status === 'PAID').length ?? 0

    return [
      { label: '发现', count: opportunities.length, icon: Search },
      { label: '核验', count: verified, icon: ShieldCheck },
      { label: '执行', count: executing, icon: FlaskConical },
      { label: '确认', count: confirmed, icon: BadgeCheck },
      { label: '到账', count: paid, icon: Banknote },
    ]
  }, [dashboard, opportunities])

  return (
    <section className="rounded-[20px] border border-black/[0.08] bg-white px-4 py-3">
      <div className="grid grid-cols-5 gap-2">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2 text-center sm:justify-start"
          >
            <stage.icon className="hidden h-3.5 w-3.5 shrink-0 text-ink-400 sm:block" />
            <span className="text-[11px] text-ink-500">{stage.label}</span>
            <span className="text-sm font-semibold tabular-nums text-ink-950">
              {stage.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
