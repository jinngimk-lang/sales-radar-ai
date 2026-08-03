import {
  ChevronDown,
  Columns3,
  Grid2X2,
  List,
  SlidersHorizontal,
  Table2,
} from 'lucide-react'
import type { RadarAssessmentDecision } from '@/types'
import type {
  RadarFilters,
  RadarSortKey,
  RadarViewMode,
} from '@/features/radar/radar-types'
import { cn } from '@/lib/utils'

const DECISION_TABS: Array<{
  value: RadarFilters['decision']
  label: string
}> = [
  { value: 'ALL', label: '全部结果' },
  { value: 'OPPORTUNITY_CREATED', label: '高匹配机会' },
  { value: 'POTENTIAL_OPPORTUNITY', label: '潜在机会' },
  { value: 'MARKET_SIGNAL_ONLY', label: '市场信号' },
  { value: 'NEEDS_REVIEW', label: '需要判断' },
]

const SORT_OPTIONS: Array<{ value: RadarSortKey; label: string }> = [
  { value: 'recommended', label: 'AI 推荐' },
  { value: 'match-desc', label: '匹配度：高 → 低' },
  { value: 'match-asc', label: '匹配度：低 → 高' },
  { value: 'confidence-desc', label: '可信度：高 → 低' },
  { value: 'confidence-asc', label: '可信度：低 → 高' },
  { value: 'risk-asc', label: '风险：低 → 高' },
  { value: 'risk-desc', label: '风险：高 → 低' },
  { value: 'latest', label: '最新发现' },
  { value: 'earliest', label: '最早发现' },
]

const ROLE_OPTIONS: Array<{
  value: RadarFilters['entityRole']
  label: string
}> = [
  { value: 'ALL', label: '全部角色' },
  { value: 'END_CUSTOMER', label: '终端客户' },
  { value: 'SUPPLIER', label: '供应商' },
  { value: 'PARTNER', label: '合作伙伴' },
  { value: 'DISTRIBUTOR', label: '分销商' },
  { value: 'COMPETITOR', label: '竞争对手' },
  { value: 'UNKNOWN', label: '角色待确认' },
]

const RISK_OPTIONS: Array<{
  value: RadarFilters['risk']
  label: string
}> = [
  { value: 'ALL', label: '全部风险' },
  { value: 'LOW', label: '低风险' },
  { value: 'MEDIUM', label: '中风险' },
  { value: 'HIGH', label: '高风险' },
]

export function RadarDecisionTabs({
  value,
  counts,
  confirmedLeadCount,
  onChange,
  onShowConfirmedLeads,
}: {
  value: RadarFilters['decision']
  counts: Partial<Record<RadarAssessmentDecision | 'ALL', number>>
  confirmedLeadCount: number
  onChange: (value: RadarFilters['decision']) => void
  onShowConfirmedLeads: () => void
}) {
  return (
    <div className="overflow-x-auto border-b border-ink-200">
      <div className="flex min-w-max items-center gap-1" role="tablist" aria-label="Radar 结果分类">
        {DECISION_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={value === tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              'border-b-2 px-3 py-3 text-xs font-semibold transition',
              value === tab.value
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            {tab.label}
            <span className="ml-1.5 tabular-nums text-ink-400">
              {counts[tab.value] ?? 0}
            </span>
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={false}
          onClick={onShowConfirmedLeads}
          className="border-b-2 border-transparent px-3 py-3 text-xs font-semibold text-ink-500 transition hover:text-ink-800"
        >
          已确认客户
          <span className="ml-1.5 tabular-nums text-ink-400">{confirmedLeadCount}</span>
        </button>
      </div>
    </div>
  )
}

export function RadarResultsToolbar({
  filters,
  sort,
  view,
  sourceTypes,
  filteredCount,
  onFiltersChange,
  onSortChange,
  onViewChange,
  onOpenMobileFilters,
}: {
  filters: RadarFilters
  sort: RadarSortKey
  view: RadarViewMode
  sourceTypes: string[]
  filteredCount: number
  onFiltersChange: (filters: RadarFilters) => void
  onSortChange: (sort: RadarSortKey) => void
  onViewChange: (view: RadarViewMode) => void
  onOpenMobileFilters: () => void
}) {
  return (
    <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-500">
          显示 <strong className="tabular-nums text-ink-900">{filteredCount}</strong> 个结果簇
        </span>
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          更多筛选
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          <FilterSelect
            label="企业角色"
            value={filters.entityRole}
            options={ROLE_OPTIONS}
            onChange={(entityRole) =>
              onFiltersChange({
                ...filters,
                entityRole,
              })
            }
          />
          <FilterSelect
            label="风险"
            value={filters.risk}
            options={RISK_OPTIONS}
            onChange={(risk) =>
              onFiltersChange({
                ...filters,
                risk,
              })
            }
          />
          <FilterSelect
            label="来源"
            value={filters.sourceType}
            options={sourceFilterOptions(sourceTypes)}
            onChange={(sourceType) =>
              onFiltersChange({ ...filters, sourceType })
            }
          />
        </div>

        <label className="relative inline-flex items-center">
          <span className="sr-only">排序</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as RadarSortKey)}
            aria-label="Radar 结果排序"
            className="min-h-9 appearance-none rounded-xl border border-ink-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-ink-700 outline-none transition hover:border-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                排序：{option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-400" />
        </label>

        <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1" aria-label="结果视图">
          <ViewButton value="compact" current={view} label="紧凑列表" icon={List} onChange={onViewChange} />
          <ViewButton value="table" current={view} label="表格" icon={Table2} onChange={onViewChange} />
          <ViewButton value="cards" current={view} label="卡片" icon={Grid2X2} onChange={onViewChange} />
        </div>
      </div>
    </div>
  )
}

export function RadarFilterPanel({
  filters,
  sourceTypes,
  onChange,
  onReset,
}: {
  filters: RadarFilters
  sourceTypes: string[]
  onChange: (filters: RadarFilters) => void
  onReset: () => void
}) {
  return (
    <div className="space-y-5">
      <FilterBlock label="企业角色">
        <select
          value={filters.entityRole}
          onChange={(event) =>
            onChange({
              ...filters,
              entityRole: event.target.value as RadarFilters['entityRole'],
            })
          }
          className="radar-filter-control"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </FilterBlock>
      <FilterBlock label="验证风险">
        <select
          value={filters.risk}
          onChange={(event) =>
            onChange({ ...filters, risk: event.target.value as RadarFilters['risk'] })
          }
          className="radar-filter-control"
        >
          {RISK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </FilterBlock>
      <FilterBlock label="来源类型">
        <select
          value={filters.sourceType}
          onChange={(event) => onChange({ ...filters, sourceType: event.target.value })}
          className="radar-filter-control"
        >
          <option value="ALL">全部来源</option>
          {sourceTypes.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
      </FilterBlock>
      <FilterBlock label="企业主体">
        <select
          value={filters.identity}
          onChange={(event) =>
            onChange({ ...filters, identity: event.target.value as RadarFilters['identity'] })
          }
          className="radar-filter-control"
        >
          <option value="ALL">全部</option>
          <option value="IDENTIFIED">有明确企业</option>
          <option value="UNKNOWN">主体待确认</option>
        </select>
      </FilterBlock>
      <RangeFilter label="最低匹配度" value={filters.matchMin} onChange={(matchMin) => onChange({ ...filters, matchMin })} />
      <RangeFilter label="最低可信度" value={filters.confidenceMin} onChange={(confidenceMin) => onChange({ ...filters, confidenceMin })} />
      <button type="button" onClick={onReset} className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-700 transition hover:border-brand-200 hover:text-brand-700">
        清除全部筛选
      </button>
    </div>
  )
}

function ViewButton({
  value,
  current,
  label,
  icon: Icon,
  onChange,
}: {
  value: RadarViewMode
  current: RadarViewMode
  label: string
  icon: typeof Columns3
  onChange: (value: RadarViewMode) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'flex h-7 w-8 items-center justify-center rounded-lg transition',
        current === value ? 'bg-ink-900 text-white' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="min-h-9 appearance-none rounded-xl border border-ink-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-ink-700 outline-none transition hover:border-ink-300 focus:border-brand-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-400" />
    </label>
  )
}

function sourceFilterOptions(sourceTypes: string[]) {
  return [
    { value: 'ALL', label: '全部来源' },
    ...sourceTypes.map((source) => ({ value: source, label: source })),
  ]
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-ink-800">{label}</span>
      {children}
    </label>
  )
}

function RangeFilter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <FilterBlock label={`${label} · ${value}`}>
      <input
        type="range"
        min="0"
        max="100"
        step="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-brand-600"
      />
    </FilterBlock>
  )
}
