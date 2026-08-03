import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { RadarAssessment, RadarAssessmentDecision } from '@/types'
import {
  groupRadarAssessments,
  splitRadarAssessments,
} from '@/features/radar/radar-grouping'
import { filterRadarClusters } from '@/features/radar/radar-filtering'
import { sortRadarClusters } from '@/features/radar/radar-sorting'
import { buildRadarCsv } from '@/features/radar/radar-export'
import type {
  RadarFilters,
  RadarResultCluster,
  RadarSortKey,
  RadarViewMode,
} from '@/features/radar/radar-types'
import { DEFAULT_RADAR_FILTERS } from '@/features/radar/radar-types'
import { RadarSummaryStats } from './RadarSummaryStats'
import {
  RadarDecisionTabs,
  RadarFilterPanel,
  RadarResultsToolbar,
} from './RadarResultsToolbar'
import { RadarBulkActions } from './RadarBulkActions'
import { RadarCompactList } from './RadarCompactList'
import { RadarTableView } from './RadarTableView'
import { RadarCardView } from './RadarCardView'
import { RadarDetailDrawer } from './RadarDetailDrawer'
import { useDrawerA11y } from './useDrawerA11y'

const VIEW_STORAGE_KEY = 'sales-radar:radar-result-view'

export function RadarWorkspace({
  assessments,
  confirmedLeadCount = 0,
  onShowConfirmedLeads = () => undefined,
}: {
  assessments: RadarAssessment[]
  confirmedLeadCount?: number
  onShowConfirmedLeads?: () => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<RadarFilters>(() =>
    filtersFromSearchParams(searchParams),
  )
  const [sort, setSort] = useState<RadarSortKey>(() =>
    readSort(searchParams.get('radarSort')),
  )
  const [view, setView] = useState<RadarViewMode>(() =>
    readView(searchParams.get('radarView')) || readStoredView() || 'compact',
  )
  const [pageSize, setPageSize] = useState(() =>
    readPageSize(searchParams.get('radarPageSize')),
  )
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailCluster, setDetailCluster] = useState<RadarResultCluster | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const filterDrawerRef = useDrawerA11y<HTMLElement>(
    showMobileFilters,
    () => setShowMobileFilters(false),
  )

  const split = useMemo(() => splitRadarAssessments(assessments), [assessments])
  const clusters = useMemo(() => groupRadarAssessments(split.visible), [split.visible])
  const blockedClusters = useMemo(() => groupRadarAssessments(split.blocked), [split.blocked])
  const sourceTypes = useMemo(
    () => [...new Set(clusters.flatMap((cluster) => cluster.sources.map((source) => source.sourceType)))].sort(),
    [clusters],
  )
  const filteredClusters = useMemo(
    () => filterRadarClusters(clusters, filters),
    [clusters, filters],
  )
  const sortedClusters = useMemo(
    () => sortRadarClusters(filteredClusters, sort),
    [filteredClusters, sort],
  )
  const totalPages = Math.max(1, Math.ceil(sortedClusters.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageClusters = useMemo(
    () => sortedClusters.slice((safePage - 1) * pageSize, safePage * pageSize),
    [pageSize, safePage, sortedClusters],
  )
  const selectedClusters = useMemo(
    () => sortedClusters.filter((cluster) => selectedIds.has(cluster.id)),
    [selectedIds, sortedClusters],
  )
  const decisionCounts = useMemo(() => buildDecisionCounts(clusters), [clusters])
  const evidenceCount = useMemo(
    () => new Set(assessments.map((assessment) => assessment.searchEvidenceId)).size,
    [assessments],
  )
  const entityCount = useMemo(
    () => new Set([...clusters, ...blockedClusters].filter((cluster) => cluster.hasExplicitEntity).map((cluster) => cluster.entityKey)).size,
    [blockedClusters, clusters],
  )

  useEffect(() => {
    setPage(1)
  }, [filters, sort, view, pageSize])

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view])

  useEffect(() => {
    const currentIds = new Set(sortedClusters.map((cluster) => cluster.id))
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => currentIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [sortedClusters])

  useEffect(() => {
    const currentIds = new Set(
      [...clusters, ...blockedClusters].map((cluster) => cluster.id),
    )
    setDetailCluster((current) =>
      current && !currentIds.has(current.id) ? null : current,
    )
  }, [blockedClusters, clusters])

  const updateQuery = useCallback(
    (changes: Record<string, string | null>) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null) next.delete(key)
          else next.set(key, value)
        })
        return next
      }, { replace: true })
    },
    [setSearchParams],
  )

  const changeFilters = (next: RadarFilters) => {
    setFilters(next)
    updateQuery({
      radarDecision: next.decision === 'ALL' ? null : next.decision,
      radarRole: next.entityRole === 'ALL' ? null : next.entityRole,
      radarRisk: next.risk === 'ALL' ? null : next.risk,
      radarSource: next.sourceType === 'ALL' ? null : next.sourceType,
      radarIdentity: next.identity === 'ALL' ? null : next.identity,
      radarMatch: next.matchMin === 0 ? null : String(next.matchMin),
      radarConfidence: next.confidenceMin === 0 ? null : String(next.confidenceMin),
    })
  }

  const resetFilters = () => changeFilters(DEFAULT_RADAR_FILTERS)

  const changeSort = (next: RadarSortKey) => {
    setSort(next)
    updateQuery({ radarSort: next === 'recommended' ? null : next })
  }

  const changeView = (next: RadarViewMode) => {
    setView(next)
    updateQuery({ radarView: next === 'compact' ? null : next })
  }

  const toggleSelection = (id: string, selected: boolean) => {
    setActionStatus(null)
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectCurrentPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      pageClusters.forEach((cluster) => next.add(cluster.id))
      return next
    })
  }

  const exportSelected = () => {
    const targets = selectedClusters.length > 0 ? selectedClusters : pageClusters
    if (targets.length === 0) return
    const blob = new Blob([`\ufeff${buildRadarCsv(targets)}`], { type: 'text/csv;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = `sales-radar-results-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(href)
    setActionStatus(`已导出 ${targets.length} 个真实结果簇`)
  }

  const copySelectedSources = async () => {
    const targets = selectedClusters.length > 0 ? selectedClusters : pageClusters
    const sources = [...new Set(targets.flatMap((cluster) => cluster.sources.map((source) => source.canonicalUrl)))].join('\n')
    if (!sources) return
    try {
      await navigator.clipboard.writeText(sources)
      setActionStatus(`已复制 ${sources.split('\n').length} 个独立来源`)
    } catch {
      setActionStatus('复制失败，请在详情中打开来源')
    }
  }

  return (
    <section aria-label="Radar 结果工作区" className="space-y-3">
      <RadarSummaryStats
        evidenceCount={evidenceCount}
        entityCount={entityCount}
        clusterCount={clusters.length + blockedClusters.length}
      />

      <div className="rounded-2xl border border-ink-200 bg-white px-4 shadow-card sm:px-5">
        <RadarDecisionTabs
          value={filters.decision}
          counts={decisionCounts}
          confirmedLeadCount={confirmedLeadCount}
          onChange={(decision) => changeFilters({ ...filters, decision })}
          onShowConfirmedLeads={onShowConfirmedLeads}
        />
        <RadarResultsToolbar
          filters={filters}
          sort={sort}
          view={view}
          sourceTypes={sourceTypes}
          filteredCount={sortedClusters.length}
          onFiltersChange={changeFilters}
          onSortChange={changeSort}
          onViewChange={changeView}
          onOpenMobileFilters={() => setShowMobileFilters(true)}
        />
      </div>

      {pageClusters.length > 0 && (
        <RadarBulkActions
          selectedCount={selectedClusters.length}
          totalOnPage={pageClusters.length}
          status={actionStatus}
          onSelectPage={selectCurrentPage}
          onClear={() => { setSelectedIds(new Set()); setActionStatus(null) }}
          onExport={exportSelected}
          onCopySources={() => void copySelectedSources()}
        />
      )}

      {pageClusters.length > 0 ? (
        <>
          {view === 'compact' && <RadarCompactList clusters={pageClusters} selectedIds={selectedIds} onSelect={toggleSelection} onOpen={setDetailCluster} />}
          {view === 'table' && <RadarTableView clusters={pageClusters} selectedIds={selectedIds} onSelect={toggleSelection} onOpen={setDetailCluster} />}
          {view === 'cards' && <RadarCardView clusters={pageClusters} selectedIds={selectedIds} onSelect={toggleSelection} onOpen={setDetailCluster} />}
          <Pagination page={safePage} totalPages={totalPages} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); updateQuery({ radarPageSize: size === 25 ? null : String(size) }) }} />
        </>
      ) : (
        <RadarEmptyState hasAssessments={assessments.length > 0} onReset={resetFilters} />
      )}

      {blockedClusters.length > 0 && (
        <details className="group rounded-2xl border border-ink-200 bg-white shadow-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-semibold text-ink-800 sm:px-5">
            <span>无法用于判断的来源（{blockedClusters.length}）</span>
            <ChevronDown className="h-4 w-4 text-ink-400 transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-ink-100 p-3 sm:p-4">
            <p className="mb-3 text-xs leading-5 text-ink-500">这些真实来源因正文、主体或关联不足未进入主要结果，但仍可查看原始来源和阻断原因。</p>
            <RadarCompactList clusters={blockedClusters} selectedIds={new Set()} onSelect={() => undefined} onOpen={setDetailCluster} selectionEnabled={false} />
          </div>
        </details>
      )}

      {showMobileFilters && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink-900/35" onClick={() => setShowMobileFilters(false)} aria-hidden="true" />
          <aside
            ref={filterDrawerRef}
            className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Radar 结果筛选"
            tabIndex={-1}
          >
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-semibold text-brand-700">结果筛选</p><h2 className="mt-1 text-lg font-semibold text-ink-900">缩小销售研究范围</h2></div>
              <button type="button" onClick={() => setShowMobileFilters(false)} aria-label="关闭筛选" className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 text-ink-500"><X className="h-4 w-4" /></button>
            </div>
            <RadarFilterPanel filters={filters} sourceTypes={sourceTypes} onChange={changeFilters} onReset={resetFilters} />
          </aside>
        </div>
      )}

      <RadarDetailDrawer cluster={detailCluster} onClose={() => setDetailCluster(null)} />
    </section>
  )
}

function Pagination({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-ink-500">
        每页
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 font-semibold text-ink-800">
          <option value="25">25</option><option value="50">50</option><option value="100">100</option>
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="上一页" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-20 text-center tabular-nums text-ink-600">第 {page} / {totalPages} 页</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="下一页" className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function RadarEmptyState({ hasAssessments, onReset }: { hasAssessments: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-ink-200 bg-white px-6 text-center shadow-card">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-100 text-ink-500"><Search className="h-5 w-5" /></span>
      <h3 className="mt-4 text-sm font-semibold text-ink-900">{hasAssessments ? '暂无符合当前筛选的内容' : '暂无相关信息'}</h3>
      <p className="mt-2 max-w-md text-xs leading-5 text-ink-500">{hasAssessments ? '调整判断、角色、风险或分数范围，可以查看其他真实结果。' : '系统不会生成模拟数据。真实来源形成评估后会显示在这里。'}</p>
      {hasAssessments && <button type="button" onClick={onReset} className="mt-4 rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-brand-700">清除筛选</button>}
    </div>
  )
}

function buildDecisionCounts(clusters: RadarResultCluster[]): Partial<Record<RadarAssessmentDecision | 'ALL', number>> {
  const counts: Partial<Record<RadarAssessmentDecision | 'ALL', number>> = { ALL: clusters.length }
  clusters.forEach((cluster) => { counts[cluster.decision] = (counts[cluster.decision] ?? 0) + 1 })
  return counts
}

function filtersFromSearchParams(searchParams: URLSearchParams): RadarFilters {
  return {
    decision: readDecision(searchParams.get('radarDecision')),
    entityRole: readFromSet(searchParams.get('radarRole'), ['END_CUSTOMER', 'SUPPLIER', 'PARTNER', 'DISTRIBUTOR', 'COMPETITOR', 'UNKNOWN'], 'ALL') as RadarFilters['entityRole'],
    risk: readFromSet(searchParams.get('radarRisk'), ['LOW', 'MEDIUM', 'HIGH'], 'ALL') as RadarFilters['risk'],
    sourceType: searchParams.get('radarSource') || 'ALL',
    identity: readFromSet(searchParams.get('radarIdentity'), ['IDENTIFIED', 'UNKNOWN'], 'ALL') as RadarFilters['identity'],
    matchMin: readScore(searchParams.get('radarMatch')),
    confidenceMin: readScore(searchParams.get('radarConfidence')),
  }
}

function readDecision(value: string | null): RadarFilters['decision'] {
  return readFromSet(value, ['OPPORTUNITY_CREATED', 'POTENTIAL_OPPORTUNITY', 'MARKET_SIGNAL_ONLY', 'NEEDS_REVIEW'], 'ALL') as RadarFilters['decision']
}

function readSort(value: string | null): RadarSortKey {
  return readFromSet(value, ['recommended', 'match-desc', 'match-asc', 'confidence-desc', 'confidence-asc', 'risk-asc', 'risk-desc', 'latest', 'earliest'], 'recommended') as RadarSortKey
}

function readView(value: string | null): RadarViewMode | null {
  return readFromSet(value, ['compact', 'table', 'cards'], null) as RadarViewMode | null
}

function readStoredView(): RadarViewMode | null {
  if (typeof window === 'undefined') return null
  return readView(window.localStorage.getItem(VIEW_STORAGE_KEY))
}

function readPageSize(value: string | null): number {
  const size = Number(value)
  return [25, 50, 100].includes(size) ? size : 25
}

function readScore(value: string | null): number {
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : 0
}

function readFromSet<T>(value: string | null, values: string[], fallback: T): string | T {
  return value && values.includes(value) ? value : fallback
}
