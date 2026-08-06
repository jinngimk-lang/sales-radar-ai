import { useEffect, useState } from 'react'
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
    <div className="min-h-full bg-slate-50/80">
      <div className="px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-[1500px]">
          <RevenueLiveOpsPanel opportunities={opportunities} />
        </div>
      </div>
      <RevenueDashboardPage />
    </div>
  )
}
