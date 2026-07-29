import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Radar, SlidersHorizontal, X, Loader2, Mail, MessageCircle, Linkedin } from 'lucide-react'
import type {
  Customer,
  SearchFilters,
  OutreachChannel,
  ProductProfile,
  ProductContextSnapshot,
  SearchProductContextDraft,
  SearchStrategy,
  SalesOpportunity,
} from '@/types'
import {
  searchCustomers,
  generateOutreach,
  understandProduct,
  getProductProfiles,
} from '@/services/api'
import { FilterSidebar } from '@/components/discover/FilterSidebar'
import { CustomerCard, CustomerCardSkeleton } from '@/components/discover/CustomerCard'
import { OpportunityCard } from '@/components/discover/OpportunityCard'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  platforms: [],
  regions: [],
  customerTypes: [],
  intentLevels: [],
  followUpStatuses: [],
  favoritesOnly: false,
}

type SortKey = 'intent' | 'time'
type ResultCategory = 'opportunities' | 'leads'

const CHANNELS: { key: OutreachChannel; label: string; icon: typeof Mail }[] = [
  { key: 'email', label: '开发信', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
]

/** 客户搜索页面 */
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    query: searchParams.get('q') || '',
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([])
  const [resultCategory, setResultCategory] =
    useState<ResultCategory>('opportunities')
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('intent')
  const [searchStrategy, setSearchStrategy] =
    useState<SearchStrategy | null>(null)
  const [productContext, setProductContext] =
    useState<ProductContextSnapshot | null>(null)
  const [productProfiles, setProductProfiles] = useState<ProductProfile[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const searchRequestIdRef = useRef(0)
  const [emailModal, setEmailModal] = useState<{
    customer: Customer
    channel: OutreachChannel
    content: string
    loading: boolean
  } | null>(null)

  useEffect(() => {
    getProductProfiles().then(setProductProfiles).catch(() => setProductProfiles([]))
  }, [])

  // 搜索
  const runSearch = useCallback(async (currentFilters: SearchFilters) => {
    const searchRequestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = searchRequestId
    setLoading(true)
    setSearchError(null)
    setCustomers([])
    setOpportunities([])
    setSearchStrategy(null)
    setProductContext(null)
    try {
      let productContextDraft: SearchProductContextDraft | undefined
      if (currentFilters.query.trim()) {
        const productResult = selectedProductId
          ? null
          : await understandProduct(currentFilters.query.trim()).catch(
              () => null,
            )
        productContextDraft = {
          product: selectedProductId
            ? undefined
            : productResult
              ? productResult.productUnderstanding.productName
              : currentFilters.query.trim(),
          category: selectedProductId
            ? undefined
            : productResult?.productUnderstanding.category,
          industry: selectedProductId
            ? undefined
            : productResult?.productUnderstanding.industry,
          applications: selectedProductId
            ? undefined
            : productResult?.productUnderstanding.applications,
          region: currentFilters.regions[0],
          businessProblem:
            !selectedProductId && productResult
              ? productResult.salesPreparation.customerPainPoints
                  .slice(0, 2)
                  .join('; ')
              : undefined,
          buyingSignals:
            !selectedProductId && productResult
              ? productResult.salesPreparation.buyingSignals
              : undefined,
          buyerKeywords:
            !selectedProductId && productResult
              ? productResult.searchStrategy.buyerKeywords
              : undefined,
          channelKeywords:
            !selectedProductId && productResult
              ? productResult.searchStrategy.channelKeywords
              : undefined,
        }
      } else {
        setSearchStrategy(null)
        setProductContext(null)
      }
      const result = await searchCustomers(
        currentFilters,
        productContextDraft,
        selectedProductId || undefined,
        (preparation) => {
          if (searchRequestIdRef.current !== searchRequestId) return
          setSearchStrategy(preparation.strategy)
          setProductContext(preparation.productContext)
        },
      )
      if (searchRequestIdRef.current !== searchRequestId) return
      setSearchStrategy(result.strategy)
      setProductContext(result.productContext)
      setCustomers(result.customers)
      setOpportunities(result.opportunities)
      setResultCategory('opportunities')
    } catch (error) {
      if (searchRequestIdRef.current !== searchRequestId) return
      console.error('[DiscoverPage] Search failed', error)
      setCustomers([])
      setOpportunities([])
      setSearchError('SEARCH_UNAVAILABLE')
    } finally {
      if (searchRequestIdRef.current === searchRequestId) {
        setLoading(false)
      }
    }
  }, [selectedProductId])

  useEffect(() => {
    const searchTimer = window.setTimeout(() => {
      void runSearch(filters)
    }, 450)

    return () => window.clearTimeout(searchTimer)
  }, [filters, runSearch])

  useEffect(() => {
    const currentQuery = searchParams.get('q') || ''
    if (currentQuery === filters.query) return

    // 同步 URL
    if (filters.query) {
      setSearchParams({ q: filters.query }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }

  }, [filters.query, searchParams, setSearchParams])

  const handleQueryChange = (value: string) => {
    setFilters((f) => ({ ...f, query: value }))
  }

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId)
    const product = productProfiles.find((item) => item.id === productId)
    if (product) {
      setFilters((current) => ({
        ...current,
        query: product.productName,
      }))
    }
  }

  const handleGenerateEmail = async (customer: Customer, channel: OutreachChannel = 'email') => {
    setEmailModal({ customer, channel, content: '', loading: true })
    const content = await generateOutreach(customer.id, channel)
    setEmailModal({ customer, channel, content, loading: false })
  }

  const handleSwitchChannel = async (channel: OutreachChannel) => {
    if (!emailModal) return
    setEmailModal({ ...emailModal, channel, content: '', loading: true })
    const content = await generateOutreach(emailModal.customer.id, channel)
    setEmailModal({ ...emailModal, channel, content, loading: false })
  }

  // 排序
  const sortedCustomers = [...customers].sort((a, b) => {
    const leadTypePriority = {
      company: 0,
      person: 1,
      content: 2,
      community: 3,
    }
    const typeDifference =
      leadTypePriority[a.leadType ?? 'content'] -
      leadTypePriority[b.leadType ?? 'content']
    if (typeDifference !== 0) return typeDifference
    if (sortBy === 'intent') return b.analysis.intentScore - a.analysis.intentScore
    return 0 // 时间排序暂用原顺序
  })

  return (
    <div className="flex h-full flex-col">
      {/* 顶部搜索栏 */}
      <div className="border-b border-ink-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 py-2 transition-all focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
              <Search className="h-5 w-5 text-ink-400" />
              <input
                value={filters.query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="输入产品或服务关键词，例如：工业机器人"
                className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              {filters.query && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="rounded p-1 text-ink-400 hover:bg-ink-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              className="btn-primary hidden sm:inline-flex"
              onClick={() => void runSearch(filters)}
            >
              <Radar className="h-4 w-4" />
              雷达扫描
            </button>
            {/* 移动端筛选触发 */}
            <button
              onClick={() => setShowMobileFilter(true)}
              className="btn-secondary lg:hidden"
              aria-label="筛选"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
          {productProfiles.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-600">
              <label htmlFor="product-profile" className="font-semibold text-ink-700">
                我的产品：
              </label>
              <select
                id="product-profile"
                value={selectedProductId}
                onChange={(event) => handleProductSelect(event.target.value)}
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="">选择产品画像</option>
                {productProfiles.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName}
                  </option>
                ))}
              </select>
              {selectedProductId && (
                <span className="text-ink-400">已自动加载产品销售策略</span>
              )}
            </div>
          )}
          {searchStrategy && productContext && filters.query.trim() && (
            <ProductContextPanel
              snapshot={productContext}
              strategy={searchStrategy}
            />
          )}
        </div>
      </div>

      {/* 结果计数 */}
      <div className="border-b border-ink-100 bg-ink-50/50 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-sm text-ink-600">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                正在扫描全球销售机会...
              </span>
            ) : (
              <>
                发现 <span className="font-semibold text-brand-600">{opportunities.length + customers.length}</span> 个销售机会
                {filters.query && (
                  <>
                    {' '}
                    关键词「<span className="font-medium text-ink-900">{filters.query}</span>」
                  </>
                )}
              </>
            )}
          </p>
          {resultCategory === 'leads' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="hidden text-ink-400 sm:inline">排序：</span>
            <button
              onClick={() => setSortBy('intent')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                sortBy === 'intent' ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              意向优先
            </button>
            <button
              onClick={() => setSortBy('time')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                sortBy === 'time' ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              最新发布
            </button>
          </div>
          )}
        </div>
      </div>

      {/* 主体：筛选栏 + 结果 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* 左侧筛选（桌面端） */}
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-6">
              <FilterSidebar filters={filters} onChange={setFilters} resultCount={opportunities.length + customers.length} />
            </div>
          </div>

          {/* 右侧结果 */}
          <div className="min-w-0 flex-1">
            {!loading && !searchError && (
              <div className="mb-4 flex gap-1 rounded-xl bg-ink-100 p-1">
                <button
                  onClick={() => setResultCategory('opportunities')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                    resultCategory === 'opportunities'
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-ink-500 hover:text-ink-700',
                  )}
                >
                  销售机会 {opportunities.length}
                </button>
                <button
                  onClick={() => setResultCategory('leads')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
                    resultCategory === 'leads'
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-ink-500 hover:text-ink-700',
                  )}
                >
                  已确认客户 {customers.length}
                </button>
              </div>
            )}
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CustomerCardSkeleton key={i} />
                ))}
              </div>
            ) : searchError ? (
              <SearchFailureState
                onRetry={() => void runSearch(filters)}
              />
            ) : resultCategory === 'opportunities' && opportunities.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                  />
                ))}
              </div>
            ) : resultCategory === 'leads' && sortedCustomers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedCustomers.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} onGenerateEmail={handleGenerateEmail} />
                ))}
              </div>
            ) : (
              <EmptyState
                category={resultCategory}
                onRetry={() => void runSearch(filters)}
              />
            )}
          </div>
        </div>
      </div>

      {/* 移动端筛选抽屉 */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <h2 className="font-semibold text-ink-900">筛选</h2>
              <button onClick={() => setShowMobileFilter(false)} className="rounded p-1 hover:bg-ink-100">
                <X className="h-5 w-5 text-ink-500" />
              </button>
            </div>
            <FilterSidebar filters={filters} onChange={setFilters} resultCount={opportunities.length + customers.length} />
          </div>
        </div>
      )}

      {/* 开发信生成弹窗 */}
      <Modal
        open={!!emailModal}
        onClose={() => setEmailModal(null)}
        title="AI 生成销售话术"
        description={emailModal ? `为 ${emailModal.customer.displayName} 生成触达内容` : ''}
      >
        {emailModal && (
          <div className="space-y-4">
            {/* 渠道切换 */}
            <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon
                return (
                  <button
                    key={ch.key}
                    onClick={() => handleSwitchChannel(ch.key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                      emailModal.channel === ch.key
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-ink-500 hover:text-ink-700',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {ch.label}
                  </button>
                )
              })}
            </div>

            {emailModal.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                <span className="ml-3 text-sm text-ink-500">
                  AI 正在撰写{CHANNELS.find((c) => c.key === emailModal.channel)?.label}...
                </span>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-700">
                    {emailModal.content}
                  </pre>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-400">AI 生成内容，发送前请审阅修改</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(emailModal.content)}
                      className="btn-secondary"
                    >
                      复制
                    </button>
                    <button onClick={() => setEmailModal(null)} className="btn-primary">
                      完成
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function SearchFailureState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-ink-900">
        暂时无法完成本次搜索
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
        系统暂时无法获取新的市场信息，请稍后重试。
      </p>
      <button onClick={onRetry} className="btn-primary mt-5">
        <Radar className="h-4 w-4" />
        重新搜索
      </button>
    </div>
  )
}

function ProductContextPanel({
  snapshot,
  strategy,
}: {
  snapshot: ProductContextSnapshot
  strategy: SearchStrategy
}) {
  const context = snapshot.context
  const signals = context.buyingSignals?.slice(0, 3) ?? []
  const directions = strategy.searchDirections.slice(0, 3)
  const salesIntentLabel = {
    customer: '寻找潜在客户',
    channel: '寻找销售渠道',
    partnership: '寻找合作机会',
  }[strategy.salesIntent]

  return (
    <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
          <Radar className="h-3.5 w-3.5" />
          产品理解
        </span>
        <span className="text-sm font-semibold text-ink-900">
          {context.product ?? strategy.intent.product}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
          {salesIntentLabel}
        </span>
      </div>

      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-ink-400">产品类别</dt>
          <dd className="mt-1 font-medium text-ink-800">
            {knownValue(context.category, strategy.intent.category)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">目标客户类型</dt>
          <dd className="mt-1 font-medium text-ink-800">
            {knownValue(context.customerType, strategy.intent.customerType)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">关注信号</dt>
          <dd className="mt-1 font-medium text-ink-800">
            {signals.length > 0 ? signals.join('、') : '根据真实来源识别'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">搜索方向</dt>
          <dd className="mt-1 font-medium text-ink-800">
            {directions.length > 0 ? directions.join('、') : '待确认'}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function knownValue(
  primary: string | undefined,
  fallback: string | undefined,
) {
  const value = primary || fallback
  return value && value !== 'Unknown' ? value : '待确认'
}

function EmptyState({
  category,
  onRetry,
}: {
  category: ResultCategory
  onRetry: () => void
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100">
        <Search className="h-7 w-7 text-ink-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink-900">
        {category === 'opportunities'
          ? '暂时没有发现匹配机会'
          : '暂时没有已确认客户'}
      </h3>
      {category === 'opportunities' ? (
        <div className="mt-3 max-w-sm text-left text-sm text-ink-500">
          <p className="mb-2 text-center">换一种搜索方式，可能更容易发现机会：</p>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              尝试更具体的产品
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              添加目标地区
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              添加企业变化关键词
            </li>
          </ul>
        </div>
      ) : (
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          只有企业身份、官网、真实来源和产品匹配度都确认后，才会显示在这里。
        </p>
      )}
      <button onClick={onRetry} className="btn-secondary mt-5">
        重新搜索
      </button>
    </div>
  )
}
