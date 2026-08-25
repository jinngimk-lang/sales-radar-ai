import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'

const AICommandCenterPage = lazy(() =>
  import('@/pages/AICommandCenterPage').then((module) => ({
    default: module.AICommandCenterPage,
  })),
)
const CommercialTargetsPage = lazy(() =>
  import('@/pages/CommercialTargetsPage').then((module) => ({
    default: module.CommercialTargetsPage,
  })),
)
const CommunicationWorkspacePage = lazy(() =>
  import('@/pages/CommunicationWorkspacePage').then((module) => ({
    default: module.CommunicationWorkspacePage,
  })),
)
const VerifiedIntentPage = lazy(() =>
  import('@/pages/VerifiedIntentPage').then((module) => ({
    default: module.VerifiedIntentPage,
  })),
)
const DiscoverPage = lazy(() =>
  import('@/pages/DiscoverPage').then((module) => ({
    default: module.DiscoverPage,
  })),
)
const CustomerDetailPage = lazy(() =>
  import('@/pages/CustomerDetailPage').then((module) => ({
    default: module.CustomerDetailPage,
  })),
)
const OpportunityDetailPage = lazy(() =>
  import('@/pages/OpportunityDetailPage').then((module) => ({
    default: module.OpportunityDetailPage,
  })),
)
const CompanyResearchWorkspacePage = lazy(() =>
  import('@/pages/CompanyResearchWorkspacePage').then((module) => ({
    default: module.CompanyResearchWorkspacePage,
  })),
)
const MarketIntelligenceWorkspacePage = lazy(() =>
  import('@/pages/MarketIntelligenceWorkspacePage').then((module) => ({
    default: module.MarketIntelligenceWorkspacePage,
  })),
)
const RevenueOperationsPage = lazy(() =>
  import('@/pages/RevenueOperationsPage').then((module) => ({
    default: module.RevenueOperationsPage,
  })),
)
const AccountPage = lazy(() =>
  import('@/pages/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/home" replace />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/home" replace />} />
        <Route
          path="home"
          element={
            <Suspense fallback={<PageFallback />}>
              <AICommandCenterPage />
            </Suspense>
          }
        />
        <Route
          path="targets"
          element={
            <Suspense fallback={<PageFallback />}>
              <CommercialTargetsPage />
            </Suspense>
          }
        />
        <Route
          path="market"
          element={
            <Suspense fallback={<PageFallback />}>
              <MarketIntelligenceWorkspacePage />
            </Suspense>
          }
        />
        <Route
          path="communication"
          element={
            <Suspense fallback={<PageFallback />}>
              <CommunicationWorkspacePage />
            </Suspense>
          }
        />
        <Route
          path="intent"
          element={
            <Suspense fallback={<PageFallback />}>
              <VerifiedIntentPage />
            </Suspense>
          }
        />
        <Route path="assistant" element={<Navigate to="/app/home" replace />} />
        <Route path="dashboard" element={<Navigate to="/app/market" replace />} />

        <Route
          path="discover"
          element={
            <Suspense fallback={<PageFallback />}>
              <DiscoverPage />
            </Suspense>
          }
        />
        <Route
          path="opportunities/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <OpportunityDetailPage />
            </Suspense>
          }
        />
        <Route
          path="opportunities/:id/research"
          element={
            <Suspense fallback={<PageFallback />}>
              <CompanyResearchWorkspacePage />
            </Suspense>
          }
        />
        <Route
          path="customer/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <CustomerDetailPage />
            </Suspense>
          }
        />
        <Route
          path="revenue"
          element={
            <Suspense fallback={<PageFallback />}>
              <RevenueOperationsPage />
            </Suspense>
          }
        />
        <Route
          path="account"
          element={
            <Suspense fallback={<PageFallback />}>
              <AccountPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  )
}

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-ink-50">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )
}
