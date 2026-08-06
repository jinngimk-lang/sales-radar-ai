import { useEffect, useState } from 'react'
import { Activity, ShieldCheck } from 'lucide-react'
import { RevenueLiveOpsPanel } from '@/features/revenue/RevenueLiveOpsPanel'
import {
  getRevenueDashboard,
  type RevenueOpportunity,
} from '@/features/revenue/revenue-api'
import { RevenueDashboardPage } from './RevenueDashboardPage'

export function RevenueOperationsPage() {
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([])

  useEffect(() => {
    let active = true
    void getRevenueDashboard('USD')
      .then((dashboard) => {
        if (active) setOpportunities(dashboard.opportunities)
      })
      .catch(() => {
        if (active) setOpportunities([])
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
                <Activity className="h-3.5 w-3.5" /> Revenue Operations
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-slate-950">
                收益中心
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                按“实时执行 → 机会优先级 → 结算证据”管理收益链路；潜在金额不会被计入已确认或已到账收益。
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> 证据优先
            </span>
          </header>

          <RevenueLiveOpsPanel opportunities={opportunities} />

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
