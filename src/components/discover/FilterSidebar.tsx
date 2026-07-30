import { Filter, RotateCcw, Star } from 'lucide-react'
import type { SearchFilters, Platform, Region, CustomerType, IntentLevel, FollowUpStatus } from '@/types'
import {
  ALL_PLATFORMS,
  ALL_REGIONS,
  ALL_CUSTOMER_TYPES,
  ALL_INTENT_LEVELS,
  ALL_FOLLOW_UP_STATUSES,
  PLATFORM_META,
} from '@/data/meta'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { cn } from '@/lib/utils'

interface FilterSidebarProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  resultCount: number
  mode?: 'radar' | 'opportunities' | 'leads'
}

/** 多选勾选项 */
function CheckItem({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-600 transition-colors hover:bg-ink-50">
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border transition-all',
          checked
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-ink-300 bg-white',
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="flex-1">{children}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink-100 py-4 last:border-b-0">
      <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

/** 左侧筛选栏 */
export function FilterSidebar({
  filters,
  onChange,
  resultCount,
  mode = 'opportunities',
}: FilterSidebarProps) {
  const togglePlatform = (p: Platform) => {
    onChange({
      ...filters,
      platforms: filters.platforms.includes(p)
        ? filters.platforms.filter((x) => x !== p)
        : [...filters.platforms, p],
    })
  }

  const toggleRegion = (r: Region) => {
    onChange({
      ...filters,
      regions: filters.regions.includes(r)
        ? filters.regions.filter((x) => x !== r)
        : [...filters.regions, r],
    })
  }

  const toggleCustomerType = (t: CustomerType) => {
    onChange({
      ...filters,
      customerTypes: filters.customerTypes.includes(t)
        ? filters.customerTypes.filter((x) => x !== t)
        : [...filters.customerTypes, t],
    })
  }

  const toggleIntent = (l: IntentLevel) => {
    onChange({
      ...filters,
      intentLevels: filters.intentLevels.includes(l)
        ? filters.intentLevels.filter((x) => x !== l)
        : [...filters.intentLevels, l],
    })
  }

  const toggleFollowUp = (s: FollowUpStatus) => {
    const list = filters.followUpStatuses ?? []
    onChange({
      ...filters,
      followUpStatuses: list.includes(s) ? list.filter((x) => x !== s) : [...list, s],
    })
  }

  const toggleFavoriteOnly = () => {
    onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
  }

  const reset = () => {
    onChange({
      ...filters,
      platforms: [],
      regions: [],
      customerTypes: [],
      intentLevels: [],
      followUpStatuses: [],
      favoritesOnly: false,
    })
  }

  const hasSearchFilters =
    filters.platforms.length > 0 ||
    filters.regions.length > 0 ||
    filters.customerTypes.length > 0
  const hasLeadFilters =
    filters.intentLevels.length > 0 ||
    (filters.followUpStatuses?.length ?? 0) > 0 ||
    filters.favoritesOnly
  const hasActiveFilters =
    hasSearchFilters || (mode === 'leads' && hasLeadFilters)

  return (
    <aside className="card flex flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-ink-500" />
          <h2 className="text-sm font-semibold text-ink-900">筛选条件</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-ink-500 transition-colors hover:text-brand-600"
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </button>
        )}
      </div>

      <div className="px-2">
        {mode === 'leads' && (
          <>
            {/* 客户管理条件只属于已确认客户，不用于机会判断 */}
            <div className="py-3">
              <button
                onClick={toggleFavoriteOnly}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  filters.favoritesOnly
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    : 'text-ink-600 hover:bg-ink-50',
                )}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    filters.favoritesOnly &&
                      'fill-amber-400 text-amber-500',
                  )}
                />
                仅看收藏客户
              </button>
            </div>

            <FilterGroup title="跟进状态">
              {ALL_FOLLOW_UP_STATUSES.map((s) => (
                <CheckItem
                  key={s.key}
                  checked={
                    filters.followUpStatuses?.includes(s.key) ?? false
                  }
                  onChange={() => toggleFollowUp(s.key)}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        s.dotClass,
                      )}
                    />
                    {s.label}
                  </span>
                </CheckItem>
              ))}
            </FilterGroup>
          </>
        )}

        <FilterGroup title="真实来源平台">
          {ALL_PLATFORMS.map((p) => (
            <CheckItem
              key={p.name}
              checked={filters.platforms.includes(p.name)}
              onChange={() => togglePlatform(p.name)}
            >
              <span className="flex items-center gap-2">
                <PlatformIcon platform={p.name} className="h-4 w-4" />
                {p.label}
              </span>
            </CheckItem>
          ))}
        </FilterGroup>

        <FilterGroup title="国家 / 地区">
          {ALL_REGIONS.map((r) => (
            <CheckItem
              key={r.key}
              checked={filters.regions.includes(r.key)}
              onChange={() => toggleRegion(r.key)}
            >
              {r.label}
            </CheckItem>
          ))}
        </FilterGroup>

        <FilterGroup title="客户类型">
          {ALL_CUSTOMER_TYPES.map((t) => (
            <CheckItem
              key={t.key}
              checked={filters.customerTypes.includes(t.key)}
              onChange={() => toggleCustomerType(t.key)}
            >
              {t.label}
            </CheckItem>
          ))}
        </FilterGroup>

        {mode === 'leads' && (
          <FilterGroup title="购买意向">
            {ALL_INTENT_LEVELS.map((l) => (
              <CheckItem
                key={l.key}
                checked={filters.intentLevels.includes(l.key)}
                onChange={() => toggleIntent(l.key)}
              >
                {l.label}
              </CheckItem>
            ))}
          </FilterGroup>
        )}
      </div>

      <div className="border-t border-ink-100 px-5 py-3">
        <p className="text-xs text-ink-500">
          当前显示{' '}
          <span className="font-semibold text-brand-600">{resultCount}</span>{' '}
          个
          {mode === 'radar'
            ? '评估信息'
            : mode === 'opportunities'
              ? '销售机会'
              : '已确认客户'}
        </p>
        {filters.platforms.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {filters.platforms.map((p) => (
              <span
                key={p}
                className="chip"
                style={{ backgroundColor: `${PLATFORM_META[p].color}15`, color: PLATFORM_META[p].color }}
              >
                {PLATFORM_META[p].label}
              </span>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
