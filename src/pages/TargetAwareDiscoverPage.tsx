import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Loader2, Target } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DiscoverPage } from '@/pages/DiscoverPage'
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

export function TargetAwareDiscoverPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetId = searchParams.get('targetId')
  const query = searchParams.get('q') ?? ''
  const [target, setTarget] = useState<CommercialTarget | null>(null)
  const [targetLoading, setTargetLoading] = useState(Boolean(targetId))
  const [targetError, setTargetError] = useState<string | null>(null)

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
        if (!cancelled) setTarget(value)
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

  if (targetId && (targetLoading || shouldCompileTargetQuery)) {
    return <TargetSearchLoading />
  }

  const exactTargetSearch = Boolean(
    marketTarget && isExactCommercialTargetSearchQuery(query, marketTarget),
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-50">
      {target ? (
        <CommercialTargetSearchBanner
          target={target}
          exact={exactTargetSearch}
          onBackToRecommendation={() =>
            navigate(`/app/market?targetId=${encodeURIComponent(target.id)}`)
          }
          onSwitchTarget={() => navigate('/app/targets')}
          onRestoreTargetSearch={() => {
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('q', target.product)
            setSearchParams(nextParams)
          }}
        />
      ) : targetError ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 sm:px-6 lg:px-8">
          目标上下文未恢复：{targetError}。本次搜索仍可继续，但不会归因到已保存商业目标。
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <DiscoverPage />
      </div>
    </div>
  )
}

function CommercialTargetSearchBanner({
  target,
  exact,
  onBackToRecommendation,
  onSwitchTarget,
  onRestoreTargetSearch,
}: {
  target: CommercialTarget
  exact: boolean
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

  return (
    <section
      data-commercial-target-search-context
      className="shrink-0 border-b border-brand-100 bg-brand-50/85 px-4 py-3 sm:px-6 lg:px-8"
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
              {exact ? '目标搜索已应用' : '临时搜索'}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-ink-900">
            {target.product}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-ink-500">
            {details.join(' · ')}
            {exact
              ? ' · 已编译进本次真实 SearchTask 关键词'
              : ' · 当前关键词已修改，本次结果不冒充已保存目标的精确运行'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!exact ? (
            <button
              type="button"
              onClick={onRestoreTargetSearch}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-50"
            >
              恢复目标搜索
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
        正在把商业目标编译成真实搜索条件…
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
