import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, Target } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { DiscoveryModeSwitch } from '@/components/discovery/DiscoveryModeSwitch'
import {
  commercialTargetToMarketTarget,
  getCommercialTarget,
  type CommercialTarget,
} from '@/services/commercial-targets'
import { CUSTOMER_TYPE_META, REGION_META } from '@/data/meta'
import {
  buildCommercialTargetSearchExpression,
  COMMERCIAL_GOAL_LABELS,
  isExactCommercialTargetSearchQuery,
} from '@/features/market-intelligence/commercial-target-search'
import {
  discoverTargetFiltersMatch,
  mapCommercialTargetToDiscoverFilters,
  type DiscoverTargetFilters,
} from '@/features/market-intelligence/discover-target-filters'

interface ObservedTargetFilters {
  targetId: string
  filters: DiscoverTargetFilters
}

export function TargetAwareDiscoverPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('targetId')
  const query = searchParams.get('q') ?? ''
  const [target, setTarget] = useState<CommercialTarget | null>(null)
  const [targetLoading, setTargetLoading] = useState(Boolean(targetId))
  const [targetError, setTargetError] = useState<string | null>(null)
  const [observedTargetFilters, setObservedTargetFilters] =
    useState<ObservedTargetFilters | null>(null)
  const [discoverResetVersion, setDiscoverResetVersion] = useState(0)

  useEffect(() => {
    if (!targetId) {
      setTarget(null)
      setTargetError(null)
      setTargetLoading(false)
      return
    }

    let cancelled = false
    setTargetLoading(true)
    setTargetError(null)
    getCommercialTarget(targetId)
      .then((value) => {
        if (cancelled) return
        if (value.status !== 'ACTIVE') {
          setTarget(null)
          setTargetError('目标已暂停或关闭，请先在目标页启用后再使用。')
          return
        }
        setTarget(value)
      })
      .catch((error) => {
        if (cancelled) return
        setTarget(null)
        setTargetError(
          error instanceof Error ? error.message : '无法恢复这个商业目标',
        )
      })
      .finally(() => {
        if (!cancelled) setTargetLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [targetId])

  const marketTarget = useMemo(
    () => (target ? commercialTargetToMarketTarget(target) : null),
    [target],
  )
  const targetFilterMapping = useMemo(
    () =>
      marketTarget ? mapCommercialTargetToDiscoverFilters(marketTarget) : null,
    [marketTarget],
  )
  const compiledQuery = useMemo(
    () =>
      marketTarget
        ? buildCommercialTargetSearchExpression(marketTarget)
        : '',
    [marketTarget],
  )
  const shouldCompileTargetQuery = Boolean(
    marketTarget &&
      (query.trim() === '' || sameQuery(query, marketTarget.product)),
  )
  const currentTargetFilters =
    target && observedTargetFilters?.targetId === target.id
      ? observedTargetFilters.filters
      : targetFilterMapping?.filters ?? null

  useEffect(() => {
    if (!marketTarget || !shouldCompileTargetQuery || !compiledQuery) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('q', compiledQuery)
    setSearchParams(nextParams, { replace: true })
  }, [
    compiledQuery,
    marketTarget,
    searchParams,
    setSearchParams,
    shouldCompileTargetQuery,
  ])

  const handleTargetFiltersChange = useCallback(
    (filters: DiscoverTargetFilters) => {
      if (!target) return
      setObservedTargetFilters((current) => {
        if (
          current?.targetId === target.id &&
          discoverTargetFiltersMatch(current.filters, filters)
        ) {
          return current
        }
        return { targetId: target.id, filters }
      })
    },
    [target],
  )

  if (targetId && (targetLoading || shouldCompileTargetQuery)) {
    return <TargetSearchLoading />
  }

  const exactTargetQuery = Boolean(
    marketTarget && isExactCommercialTargetSearchQuery(query, marketTarget),
  )
  const hasUnmappedTargetFilters = Boolean(
    targetFilterMapping?.unmappedDimensions.length,
  )
  const exactTargetFilters = Boolean(
    targetFilterMapping &&
      currentTargetFilters &&
      !hasUnmappedTargetFilters &&
      discoverTargetFiltersMatch(
        currentTargetFilters,
        targetFilterMapping.filters,
      ),
  )
  const exactTargetSearch = exactTargetQuery && exactTargetFilters

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-50">
      <div className="shrink-0 px-4 pt-4 sm:px-6 lg:px-8">
        <DiscoveryModeSwitch mode="search" targetId={target?.id ?? null} />
      </div>
      {target ? (
        <CommercialTargetSearchBanner
          target={target}
          exact={exactTargetSearch}
          hasUnmappedTargetFilters={hasUnmappedTargetFilters}
          onBackToRecommendation={() =>
            navigate(`/app/market?targetId=${encodeURIComponent(target.id)}`)
          }
          onSwitchTarget={() => navigate('/app/targets')}
          onRestoreTargetSearch={() => {
            setObservedTargetFilters(null)
            setDiscoverResetVersion((value) => value + 1)
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('q', target.product)
            setSearchParams(nextParams)
          }}
        />
      ) : targetError ? (
        <div className="shrink-0 border-y border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 sm:px-6 lg:px-8">
          目标上下文未恢复：{targetError}。本次搜索仍可继续，但不会归因到已保存商业目标。
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <DiscoverPage
          key={`${target?.id ?? 'free'}:${discoverResetVersion}`}
          initialTargetFilters={targetFilterMapping?.filters}
          onTargetFiltersChange={
            targetFilterMapping ? handleTargetFiltersChange : undefined
          }
        />
      </div>
    </div>
  )
}

function CommercialTargetSearchBanner({
  target,
  exact,
  hasUnmappedTargetFilters,
  onBackToRecommendation,
  onSwitchTarget,
  onRestoreTargetSearch,
}: {
  target: CommercialTarget
  exact: boolean
  hasUnmappedTargetFilters: boolean
  onBackToRecommendation: () => void
  onSwitchTarget: () => void
  onRestoreTargetSearch: () => void
}) {
  const details = [
    COMMERCIAL_GOAL_LABELS[target.goal],
    target.industry,
    target.region ? REGION_META[target.region].label : null,
    target.customerType ? CUSTOMER_TYPE_META[target.customerType].label : null,
  ].filter((value): value is string => Boolean(value))
  const statusLabel = exact
    ? '目标意图已应用'
    : hasUnmappedTargetFilters
      ? '部分目标条件未映射'
      : '临时关键词 / 筛选'
  const statusDescription = exact
    ? ' · 商业目标已编译进本次真实 SearchTask 关键词；可映射的行业/地区/对象类型已作为页面结构化筛选应用，后续实际筛选以页面选择为准'
    : hasUnmappedTargetFilters
      ? ' · 商业目标关键词已应用；行业无法映射到当前结构化筛选，不会偷偷塞进关键词或伪装成已应用条件'
      : ' · 当前关键词或结构化筛选已修改，本次搜索按临时关键词执行，不冒充已保存目标意图；结构化筛选以页面当前选择为准'

  return (
    <section
      data-commercial-target-search-context
      className="shrink-0 border-y border-brand-100 bg-brand-50/85 px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-[1640px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800">
              <Target className="h-3.5 w-3.5" />
              当前商业目标 · {target.name}
            </span>
            <span
              className={
                exact
                  ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800'
                  : 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800'
              }
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-ink-900">
            {target.product}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-ink-500">
            {details.join(' · ')}
            {statusDescription}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!exact && !hasUnmappedTargetFilters ? (
            <button
              type="button"
              onClick={onRestoreTargetSearch}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-50"
            >
              恢复目标条件
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSwitchTarget}
            className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-[10px] font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            切换目标
          </button>
          <button
            type="button"
            onClick={onBackToRecommendation}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-brand-800"
          >
            返回推荐
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </section>
  )
}

function TargetSearchLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-ink-50">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        正在把商业目标编译成真实搜索意图…
      </div>
    </div>
  )
}

function sameQuery(left: string, right: string) {
  return normalize(left) === normalize(right)
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}
