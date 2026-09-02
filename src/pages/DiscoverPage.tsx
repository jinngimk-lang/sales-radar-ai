import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Factory,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import type {
  Customer,
  SearchFilters,
  OutreachChannel,
  ProductProfile,
  ProductContextSnapshot,
  SearchProductContextDraft,
  SearchStrategy,
  SalesOpportunity,
  RadarAssessment,
  AudienceType,
} from '@/types'
import {
  ApiRequestError,
  searchCustomers,
  generateOutreach,
  understandProduct,
  getProductProfiles,
} from '@/services/api'
import { cacheSearchCommunicationCandidates } from '@/services/communication-candidate-cache'
import { FilterSidebar } from '@/components/discover/FilterSidebar'
import { CustomerCard } from '@/components/discover/CustomerCard'
import { OpportunityCard } from '@/components/discover/OpportunityCard'
import { RadarWorkspace } from '@/components/discover/RadarWorkspace'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import {
  ALL_CUSTOMER_TYPES,
  ALL_INDUSTRIES,
  ALL_REGIONS,
} from '@/data/meta'
import type { DiscoverTargetFilters } from '@/features/market-intelligence/discover-target-filters'

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
type OpportunitySortKey = 'recommended' | 'confidence' | 'latest'
type ResultCategory = 'radar' | 'opportunities' | 'leads'
type AudienceFilter = 'all' | AudienceType

interface DiscoverPageProps {
  initialTargetFilters?: DiscoverTargetFilters
  onTargetFiltersChange?: (filters: DiscoverTargetFilters) => void
}

const AUDIENCE_META: Array<{ key: AudienceFilter; label: string }> = [
  { key: 'all', label: '全部对象' },
  { key: 'person', label: '个人联系人' },
  { key: 'company', label: '企业客户' },
  { key: 'supplier', label: '供应商' },
  { key: 'intermediary', label: '中介 / 渠道' },
]

const CHANNELS: { key: OutreachChannel; label: string; icon: typeof Mail }[] = [
  { key: 'email', label: '开发信', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
]

/** 客户搜索页面 */
export function DiscoverPage({
  initialTargetFilters,
  onTargetFiltersChange,
}: DiscoverPageProps = {}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectingForAssistant = searchParams.get('selectFor') === 'assistant'
  const [filters, setFilters] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    query: searchParams.get('q') || '',
    regions: initialTargetFilters?.region ? [initialTargetFilters.region] : [],
    customerTypes: initialTargetFilters?.customerType
      ? [initialTargetFilters.customerType]
      : [],
  })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([])
  const [radarAssessments, setRadarAssessments] = useState<
    RadarAssessment[]
  >([])
  const [resultCategory, setResultCategory] =
    useState<ResultCategory>('radar')
  const [loading, setLoading] = useState(true)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>('intent')
  const [opportunitySort, setOpportunitySort] =
    useState<OpportunitySortKey>('recommended')
  const [audienceFilter, setAudienceFilter] =
    useState<AudienceFilter>('all')
  const [searchStrategy, setSearchStrategy] =
    useState<SearchStrategy | null>(null)
  const [productContext, setProductContext] =
    useState<ProductContextSnapshot | null>(null)
  const [productProfiles, setProductProfiles] = useState<ProductProfile[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [industryFocus, setIndustryFocus] = useState(
    initialTargetFilters?.industry ?? '',
  )
  const [hasSearched, setHasSearched] = useState(
    Boolean(searchParams.get('q')?.trim()),
  )
  const initialSearchTriggeredRef = useRef(false)
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

  useEffect(() => {
    onTargetFiltersChange?.({
      industry: industryFocus,
      region: filters.regions[0] ?? '',
      customerType: filters.customerTypes[0] ?? '',
    })
  }, [
    filters.customerTypes,
    filters.regions,
    industryFocus,
    onTargetFiltersChange,
  ])

  // 搜索
  const runSearch = useCallback(async (currentFilters: SearchFilters) => {
    const searchRequestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = searchRequestId
    setHasSearched(true)
    setLoading(true)
    setSearchError(null)
    setCustomers([])
    setOpportunities([])
    setRadarAssessments([])
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
          industry:
            industryFocus ||
            (selectedProductId
              ? undefined
              : productResult?.productUnderstanding.industry),
          applications: selectedProductId
            ? undefined
            : productResult?.productUnderstanding.applications,
          region: currentFilters.regions[0],
          customerType: currentFilters.customerTypes[0],
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
      cacheSearchCommunicationCandidates(result.customers)
      setSearchStrategy(result.strategy)
      setProductContext(result.productContext)
      setCustomers(result.customers)
      setOpportunities(result.opportunities)
      setRadarAssessments(result.radarAssessments)
      setResultCategory(selectingForAssistant ? 'leads' : 'radar')
    } catch (error) {
      if (searchRequestIdRef.current !== searchRequestId) return
      console.error('[DiscoverPage] Search failed', error)
      setCustomers([])
      setOpportunities([])
      setRadarAssessments([])
      setSearchError(searchFailureCode(error))
    } finally {
      if (searchRequestIdRef.current === searchRequestId) {
        setLoading(false)
      }
    }
  }, [industryFocus, selectedProductId, selectingForAssistant])

  useEffect(() => {
    if (initialSearchTriggeredRef.current) return
    initialSearchTriggeredRef.current = true

    if (filters.query.trim()) {
      void runSearch(filters)
    } else {
      setLoading(false)
    }
  }, [filters, runSearch])

  useEffect(() => {
    const currentQuery = searchParams.get('q') || ''
    if (currentQuery === filters.query) return

    // 同步 URL
    if (filters.query) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('q', filters.query)
      setSearchParams(nextParams, { replace: true })
    } else {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('q')
      setSearchParams(nextParams, { replace: true })
    }

  }, [filters.query, searchParams, setSearchParams])

  const handleQueryChange = (value: string) => {
    setFilters((f) => ({ ...f, query: value }))
    setHasSearched(false)
    setSearchError(null)
  }

  const updateSearchTarget = (
    update: (current: SearchFilters) => SearchFilters,
  ) => {
    setFilters((current) => update(current))
    setHasSearched(false)
    setSearchError(null)
  }

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId)
    const product = productProfiles.find((item) => item.id === productId)
    if (product) {
      setFilters((current) => ({
        ...current,
        query: product.productName,
      }))
      setIndustryFocus(product.industry || '')
      setHasSearched(false)
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
    const audiencePriority: Record<AudienceType, number> = {
      person: 0,
      company: 1,
      supplier: 2,
      intermediary: 3,
    }
    const typeDifference =
      audiencePriority[customerAudience(a)] - audiencePriority[customerAudience(b)]
    if (typeDifference !== 0) return typeDifference
    if (sortBy === 'intent') return b.analysis.intentScore - a.analysis.intentScore
    return 0 // 时间排序暂用原顺序
  })
  const visibleCustomers =
    audienceFilter === 'all'
      ? sortedCustomers
      : sortedCustomers.filter(
          (customer) => customerAudience(customer) === audienceFilter,
        )
  const audienceCounts = customers.reduce<Record<AudienceType, number>>(
    (counts, customer) => ({
      ...counts,
      [customerAudience(customer)]: counts[customerAudience(customer)] + 1,
    }),
    { person: 0, company: 0, supplier: 0, intermediary: 0 },
  )

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    if (opportunitySort === 'confidence') {
      return b.confidence - a.confidence
    }
    if (opportunitySort === 'latest') {
      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      )
    }
    return 0
  })
  const currentResultCount =
    resultCategory === 'radar'
      ? radarAssessments.length
      : resultCategory === 'opportunities'
        ? opportunities.length
        : customers.length

  return (
    <div className="h-full overflow-y-auto bg-ink-50 scrollbar-thin">
      <div className="mx-auto max-w-[1640px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="workspace-kicker">OPPORTUNITY DISCOVERY</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-ink-900 sm:text-4xl">
              发现正在发生变化的企业机会
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500 sm:text-base">
              告诉系统你销售什么、面向谁。我们会从真实来源中寻找企业变化，
              并把值得研究的机会与个人、企业、供应商和中介分层呈现。
            </p>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-ink-500 lg:flex">
            <span>设置销售目标</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
            <span>理解市场方向</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
            <span className="text-brand-700">发现机会</span>
          </div>
        </header>

        {selectingForAssistant && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-900">
                为 AI 销售助手选择联系对象
              </p>
              <p className="mt-1 text-xs leading-5 text-brand-800/75">
                搜索后可从个人、企业、供应商或中介中选择。点击卡片底部“进入 AI 联络”继续生成话术。
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/assistant')}
              className="btn-secondary shrink-0 text-xs"
            >
              返回助手
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
          <div className="border-b border-ink-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Crosshair className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">
                    设置销售目标
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500">
                    产品越具体，发现方向越准确
                  </p>
                </div>
              </div>
              {productProfiles.length > 0 && (
                <label className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-medium">从我的产品选择</span>
                  <span className="relative">
                    <select
                      value={selectedProductId}
                      onChange={(event) =>
                        handleProductSelect(event.target.value)
                      }
                      className="appearance-none rounded-lg border border-ink-200 bg-white py-2 pl-3 pr-8 font-medium text-ink-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                    >
                      <option value="">选择产品画像</option>
                      {productProfiles.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.productName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                  </span>
                </label>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="group flex min-h-14 flex-1 items-center gap-3 rounded-2xl border border-ink-300 bg-white px-4 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
                <Search className="h-5 w-5 shrink-0 text-ink-400 group-focus-within:text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    产品或服务
                  </span>
                  <input
                    value={filters.query}
                    onChange={(event) =>
                      handleQueryChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        filters.query.trim() &&
                        !loading
                      ) {
                        void runSearch(filters)
                      }
                    }}
                    placeholder="例如：工业自动化 SaaS"
                    className="mt-0.5 w-full bg-transparent text-sm font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:outline-none"
                  />
                </span>
                {filters.query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange('')}
                    className="rounded-lg p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                    aria-label="清空产品"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>

              <button
                type="button"
                onClick={() => void runSearch(filters)}
                disabled={!filters.query.trim() || loading}
                className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,0.9)] transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <Radar className="h-[18px] w-[18px]" />
                )}
                {loading ? '正在扫描' : '开始扫描'}
              </button>

              <button
                type="button"
                onClick={() => setShowMobileFilter(true)}
                className="btn-secondary lg:hidden"
                aria-label="更多筛选"
              >
                <SlidersHorizontal className="h-4 w-4" />
                更多筛选
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <SearchTargetSelect
                icon={Factory}
                label="行业"
                value={industryFocus}
                placeholder="选择行业"
                options={ALL_INDUSTRIES.map((item) => ({
                  value: item.label,
                  label: item.label,
                }))}
                onChange={(value) => {
                  setIndustryFocus(value)
                  setHasSearched(false)
                  setSearchError(null)
                }}
              />
              <SearchTargetSelect
                icon={MapPin}
                label="地区"
                value={filters.regions[0] ?? ''}
                placeholder="不限地区"
                options={ALL_REGIONS.map((item) => ({
                  value: item.key,
                  label: item.label,
                }))}
                onChange={(value) =>
                  updateSearchTarget((current) => ({
                    ...current,
                    regions: value
                      ? [value as SearchFilters['regions'][number]]
                      : [],
                  }))
                }
              />
              <SearchTargetSelect
                icon={Users}
                label="客户类型"
                value={filters.customerTypes[0] ?? ''}
                placeholder="不限客户类型"
                options={ALL_CUSTOMER_TYPES.map((item) => ({
                  value: item.key,
                  label: item.label,
                }))}
                onChange={(value) =>
                  updateSearchTarget((current) => ({
                    ...current,
                    customerTypes: value
                      ? [
                          value as SearchFilters['customerTypes'][number],
                        ]
                      : [],
                  }))
                }
              />
            </div>

            {searchStrategy && productContext && filters.query.trim() && (
              <ProductContextPanel
                snapshot={productContext}
                strategy={searchStrategy}
              />
            )}

            <div className="mt-3 flex flex-col gap-1 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-[11px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
              <span><strong className="text-ink-700">Radar Credits</strong> · 本轮不会扣除积分</span>
              <span>结果数量由真实来源和去重结果决定；数量上限设置尚未接入搜索服务。</span>
            </div>
          </div>
        </section>

        {!hasSearched ? (
          <DiscoveryStartState hasTarget={Boolean(filters.query.trim())} />
        ) : (
          <section className="mt-7">
            {loading ? (
              <ScanProgress query={filters.query} />
            ) : searchError ? (
              <SearchFailureState
                errorCode={searchError}
                onRetry={() => void runSearch(filters)}
              />
            ) : (
              <>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  <ResultCategoryButton
                    active={resultCategory === 'radar'}
                    icon={Radar}
                    title={`真实信息 ${radarAssessments.length}`}
                    description="查看来源、评分、风险与待确认事项"
                    onClick={() => setResultCategory('radar')}
                  />
                  <ResultCategoryButton
                    active={resultCategory === 'opportunities'}
                    icon={Target}
                    title={`销售机会 ${opportunities.length}`}
                    description="企业变化形成的商业机会判断"
                    onClick={() => setResultCategory('opportunities')}
                  />
                  <ResultCategoryButton
                    active={resultCategory === 'leads'}
                    icon={CheckCircle2}
                    title={`联系人与企业 ${customers.length}`}
                    description="个人、企业、供应商与中介分层展示"
                    onClick={() => setResultCategory('leads')}
                  />
                </div>

                {resultCategory === 'leads' && customers.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2.5">
                    {AUDIENCE_META.map((item) => {
                      const count = item.key === 'all'
                        ? customers.length
                        : audienceCounts[item.key]
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAudienceFilter(item.key)}
                          className={cn(
                            'rounded-xl px-3 py-2 text-xs font-medium transition',
                            audienceFilter === item.key
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                          )}
                        >
                          {item.label} <span className="ml-1 opacity-70">{count}</span>
                        </button>
                      )
                    })}
                    <p className="ml-auto px-2 text-[10px] text-ink-400">
                      不因缺少公司域名隐藏个人账号；评分用于排序，不作为展示门槛
                    </p>
                  </div>
                )}

                {resultCategory !== 'radar' && <div className="mt-5 flex items-center justify-between border-b border-ink-200 pb-4">
                  <p className="text-sm text-ink-600">
                    当前显示{' '}
                    <span className="font-semibold text-ink-900">
                      {currentResultCount}
                    </span>{' '}
                    项
                  </p>
                  {resultCategory === 'opportunities' ? (
                    <label className="flex items-center gap-2 text-xs text-ink-500">
                      <span className="hidden sm:inline">排序</span>
                      <span className="relative">
                        <select
                          value={opportunitySort}
                          onChange={(event) =>
                            setOpportunitySort(
                              event.target.value as OpportunitySortKey,
                            )
                          }
                          aria-label="销售机会排序"
                          className="appearance-none rounded-xl border border-ink-200 bg-white py-2 pl-3 pr-8 font-medium text-ink-700 outline-none transition hover:border-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                        >
                          <option value="recommended">推荐关注</option>
                          <option value="confidence">可信程度 ↓</option>
                          <option value="latest">最新发现 ↓</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                      </span>
                    </label>
                  ) : resultCategory === 'leads' ? (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="hidden text-ink-400 sm:inline">
                        排序
                      </span>
                      <button
                        onClick={() => setSortBy('intent')}
                        className={cn(
                          'rounded-lg px-2.5 py-1.5 font-medium transition-colors',
                          sortBy === 'intent'
                            ? 'bg-white text-brand-700 shadow-sm ring-1 ring-ink-200'
                            : 'text-ink-500 hover:text-ink-700',
                        )}
                      >
                        意向优先
                      </button>
                      <button
                        onClick={() => setSortBy('time')}
                        className={cn(
                          'rounded-lg px-2.5 py-1.5 font-medium transition-colors',
                          sortBy === 'time'
                            ? 'bg-white text-brand-700 shadow-sm ring-1 ring-ink-200'
                            : 'text-ink-500 hover:text-ink-700',
                        )}
                      >
                        最新发布
                      </button>
                    </div>
                  ) : null}
                </div>}

                {resultCategory === 'radar' ? (
                  <div className="mt-5">
                    <RadarWorkspace
                      assessments={radarAssessments}
                      confirmedLeadCount={customers.length}
                      onShowConfirmedLeads={() => setResultCategory('leads')}
                    />
                  </div>
                ) : (
                  <div className="mt-5 flex gap-6">
                    <aside className="hidden w-60 shrink-0 lg:block">
                      <div className="sticky top-6">
                        <FilterSidebar
                          filters={filters}
                          onChange={setFilters}
                          resultCount={currentResultCount}
                          mode={resultCategory}
                        />
                      </div>
                    </aside>

                    <div className="min-w-0 flex-1">
                      {resultCategory === 'opportunities' &&
                      opportunities.length > 0 ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                          {sortedOpportunities.map((opportunity) => (
                            <OpportunityCard
                              key={opportunity.id}
                              opportunity={opportunity}
                            />
                          ))}
                        </div>
                      ) : resultCategory === 'leads' &&
                        visibleCustomers.length > 0 ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                          {visibleCustomers.map((customer) => (
                            <CustomerCard
                              key={customer.id}
                              customer={customer}
                              onGenerateEmail={handleGenerateEmail}
                            />
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
                )}
              </>
            )}
          </section>
        )}
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
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              resultCount={currentResultCount}
              mode={resultCategory}
            />
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

function SearchTargetSelect({
  icon: Icon,
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  icon: LucideIcon
  label: string
  value: string
  placeholder: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="relative flex min-h-12 items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 px-3 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
      <Icon className="h-4 w-4 shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-ink-400">
          {label}
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-0.5 w-full appearance-none bg-transparent pr-6 text-xs font-medium text-ink-800 outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
    </label>
  )
}

function DiscoveryStartState({ hasTarget }: { hasTarget: boolean }) {
  const steps = [
    {
      icon: Building2,
      title: '描述你的产品',
      description: '输入具体产品或服务，让系统保留真实产品语义。',
    },
    {
      icon: Target,
      title: '明确目标市场',
      description: '补充行业、地区和客户类型，减少无关信息。',
    },
    {
      icon: Sparkles,
      title: '查看本次发现',
      description: '个人、企业、供应商与中介分层展示，评分不作为隐藏门槛。',
    },
  ]

  return (
    <section className="mt-7 rounded-3xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-700">
            {hasTarget ? '销售目标已准备' : '从一个销售目标开始'}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-ink-900">
            {hasTarget
              ? '点击开始扫描，寻找真实企业变化'
              : '三步完成一次机会发现'}
          </h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-ink-500">
          这里不会用历史数据填充本次结果；搜索失败或没有匹配时，会如实展示状态。
        </p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-ink-200 bg-ink-50/50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-ink-200">
                <step.icon className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-semibold text-ink-400">
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-ink-900">
              {step.title}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-ink-500">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ScanProgress({ query }: { query: string }) {
  return (
    <section>
      <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-5 py-4 shadow-card">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Radar className="h-5 w-5 animate-spin [animation-duration:3s]" />
          <span className="absolute inset-0 animate-ping rounded-full border border-brand-300/50 [animation-duration:2s]" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">
            正在寻找与“{query}”相关的企业变化
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            当前只展示本次任务返回的真实结果。
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-3xl border border-ink-200 bg-white p-5 shadow-card"
          >
            <div className="h-8 w-28 rounded-xl bg-ink-100" />
            <div className="mt-6 h-4 w-2/5 rounded bg-ink-100" />
            <div className="mt-3 h-6 w-4/5 rounded bg-ink-100" />
            <div className="mt-5 h-20 rounded-2xl bg-ink-100" />
            <div className="mt-4 h-16 rounded-2xl bg-ink-100" />
          </div>
        ))}
      </div>
    </section>
  )
}

function ResultCategoryButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-w-[250px] flex-1 rounded-2xl border p-4 text-left transition sm:min-w-0',
        active
          ? 'border-brand-200 bg-white shadow-card ring-1 ring-brand-100'
          : 'border-ink-200 bg-ink-50/60 hover:bg-white',
      )}
    >
      <span className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            active
              ? 'bg-brand-50 text-brand-700'
              : 'bg-white text-ink-500 ring-1 ring-ink-200',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span>
          <span
            className={cn(
              'block text-sm font-semibold',
              active ? 'text-brand-800' : 'text-ink-800',
            )}
          >
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-ink-500">
            {description}
          </span>
        </span>
      </span>
    </button>
  )
}

function SearchFailureState({
  errorCode,
  onRetry,
}: {
  errorCode: string
  onRetry: () => void
}) {
  const authenticationRequired = errorCode === 'AUTHENTICATION_REQUIRED'
  const systemError = errorCode === 'RADAR_SYSTEM_ERROR'
  const providerBusy = errorCode === 'PROVIDER_RATE_LIMIT'

  return (
    <div className="card px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-ink-900">
        {authenticationRequired
          ? '登录状态已失效'
          : providerBusy
            ? '本次扫描尚未完成'
          : systemError
            ? '暂时无法读取判断结果'
            : '暂时无法完成本次搜索'}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
        {authenticationRequired
          ? '请重新登录后查看本次市场扫描结果。'
          : providerBusy
            ? '真实来源暂未返回可展示信息。系统已完成自动重试，本次不会混入历史或模拟结果。'
          : systemError
            ? '市场信息已经完成处理，但判断结果暂时无法读取，请稍后重试。'
            : '系统暂时无法获取新的市场信息，请稍后重试。'}
      </p>
      <button onClick={onRetry} className="btn-primary mt-5">
        <Radar className="h-4 w-4" />
        {authenticationRequired || systemError || providerBusy
          ? '重新扫描'
          : '重新搜索'}
      </button>
    </div>
  )
}

function searchFailureCode(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 429 || error.code === 'RATE_LIMIT') {
      return 'PROVIDER_RATE_LIMIT'
    }
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.code === 'AUTHENTICATION_REQUIRED'
    ) {
      return 'AUTHENTICATION_REQUIRED'
    }
    if (error.status >= 500) return 'RADAR_SYSTEM_ERROR'
  }
  return 'SEARCH_UNAVAILABLE'
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

function customerAudience(customer: Customer): AudienceType {
  if (customer.audienceType) return customer.audienceType
  if (customer.customerType === 'Individual' || customer.leadType === 'person') {
    return 'person'
  }
  return customer.customerType === 'Agent' ? 'intermediary' : 'company'
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
          : '暂时没有联系人或企业结果'}
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
