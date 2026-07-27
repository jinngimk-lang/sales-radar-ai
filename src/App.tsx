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
const AssistantPage = lazy(() =>
  import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
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
        <Route index element={<Navigate to="/app/discover" replace />} />
        <Route path="discover" element={<Suspense fallback={<PageFallback />}><DiscoverPage /></Suspense>} />
        <Route path="customer/:id" element={<Suspense fallback={<PageFallback />}><CustomerDetailPage /></Suspense>} />
        <Route path="assistant" element={<Suspense fallback={<PageFallback />}><AssistantPage /></Suspense>} />
        <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
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
