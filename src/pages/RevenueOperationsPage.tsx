import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BadgeCheck,
  Banknote,
  FlaskConical,
  Search,
  ShieldCheck,
} from 'lucide-react'
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
    <div className="min-h-full bg-slate-50/80 pb-10">
      <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.55)] sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                <Activity className="h-3.5 w-3.5" /> Revenue Supervision
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950">
                收益监督中心
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                这里用于监督 Agent 是否真的在发现、核验和推进收益。浏览器画面、动作时间线、阶段状态与结算证据保持在同一页。
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> 过程公开 · 证据优先
            </span>
          </header>

          <RevenueSupervisionFlow dashboard={dashboard} opportunities={opportunities} />

          <div className="mt-5">
            <RevenueLiveOpsPanel opportunities={opportunities} />
          </div>

          <div
            data-revenue-dashboard-mode="embedded"
            className="mt-6 [&>div]:!min-h-0 [&>div]:!bg-transparent [&>div]:!px-0 [&>div]:!py-0 [&>div>div]:!max-w-none [&>div>div>header]:hidden"
          >
            <RevenueDashboardPage />
          </div>
        </div>
      </div>
    </div>
  )
}

function RevenueSupervisionFlow({
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
      {
        label: '发现机会',
        detail: '全网监控与去重',
        count: opportunities.length,
        icon: Search,
      },
      {
        label: '核验规则',
        detail: '付款、竞争与授权',
        count: verified,
        icon: ShieldCheck,
      },
      {
        label: '执行实验',
        detail: '浏览器与代码动作',
        count: executing,
        icon: FlaskConical,
      },
      {
        label: '确认收益',
        detail: '接受、合并或奖励证据',
        count: confirmed,
        icon: BadgeCheck,
      },
      {
        label: '结算到账',
        detail: '付款凭证已记录',
        count: paid,
        icon: Banknote,
      },
    ]
  }, [dashboard, opportunities])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.5)] lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Supervision Pipeline
          </p>
          <h2 className="mt-1 text-base font-bold text-slate-950">收益监督流程</h2>
        </div>
        <p className="text-xs text-slate-500">每个数字都来自当前收益账本，不把潜在金额当作已确认收入。</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sky-700 shadow-sm">
                <stage.icon className="h-4 w-4" />
              </span>
              <span className="text-xl font-bold tabular-nums text-slate-950">{stage.count}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">{stage.label}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">{stage.detail}</p>
            {index < stages.length - 1 ? (
              <span className="absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-slate-300 md:block" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
