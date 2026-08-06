import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'

// 路由懒加载，减小首屏 bundle
const DiscoverPage = lazy(() =>
  import('@/pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })),
)
const CustomerDetailPage = lazy(() =>
  import('@/pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
)
const OpportunityDetailPage = lazy(() =>
  import('@/pages/OpportunityDetailPage').then((m) => ({ default: m.OpportunityDetailPage })),
)
const CompanyResearchWorkspacePage = lazy(() =>
  import('@/pages/CompanyResearchWorkspacePage').then((m) => ({ default: m.CompanyResearchWorkspacePage })),
)
const AssistantPage = lazy(() =>
  import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })),
)
const MarketIntelligenceWorkspacePage = lazy(() =>
  import('@/pages/MarketIntelligenceWorkspacePage').then((m) => ({
    default: m.MarketIntelligenceWorkspacePage,
  })),
)
const RevenueDashboardPage = lazy(() =>
  import('@/pages/RevenueDashboardPage').then((m) => ({
    default: m.RevenueDashboardPage,
  })),
)
const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })),
)

/** Landing Page 布局：公共导航 + 内容 + 页脚 */
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* 首页 */}
      <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />

      {/* 工作台 */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="discover" element={<Suspense fallback={<PageFallback />}><DiscoverPage /></Suspense>} />
        <Route path="opportunities/:id" element={<Suspense fallback={<PageFallback />}><OpportunityDetailPage /></Suspense>} />
        <Route path="opportunities/:id/research" element={<Suspense fallback={<PageFallback />}><CompanyResearchWorkspacePage /></Suspense>} />
        <Route path="customer/:id" element={<Suspense fallback={<PageFallback />}><CustomerDetailPage /></Suspense>} />
        <Route path="assistant" element={<Suspense fallback={<PageFallback />}><AssistantPage /></Suspense>} />
        <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><MarketIntelligenceWorkspacePage /></Suspense>} />
        <Route path="revenue" element={<Suspense fallback={<PageFallback />}><RevenueDashboardPage /></Suspense>} />
        <Route path="account" element={<Suspense fallback={<PageFallback />}><AccountPage /></Suspense>} />
      </Route>

      {/* 兜底 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/** 页面懒加载占位 */
function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )
}
