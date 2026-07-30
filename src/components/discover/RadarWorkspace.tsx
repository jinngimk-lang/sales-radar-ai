import { useMemo, useState } from 'react'
import {
  ChevronDown,
  CircleAlert,
  CircleGauge,
  RadioTower,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type {
  RadarAssessment,
  RadarAssessmentDecision,
  RadarEntityRole,
  RadarRiskLevel,
} from '@/types'
import { cn } from '@/lib/utils'
import { RadarAssessmentCard } from './RadarAssessmentCard'

type DecisionFilter = RadarAssessmentDecision | 'ALL'
type RoleFilter = RadarEntityRole | 'ALL'
type RiskFilter = RadarRiskLevel | 'ALL'
type RadarSort =
  | 'recommended'
  | 'match'
  | 'confidence'
  | 'latest'
  | 'risk'

const DECISION_FILTERS: Array<{
  key: DecisionFilter
  label: string
  icon: typeof Search
}> = [
  { key: 'ALL', label: '全部', icon: Search },
  {
    key: 'OPPORTUNITY_CREATED',
    label: '高匹配机会',
    icon: Sparkles,
  },
  {
    key: 'POTENTIAL_OPPORTUNITY',
    label: '潜在机会',
    icon: CircleGauge,
  },
  {
    key: 'MARKET_SIGNAL_ONLY',
    label: '市场信号',
    icon: RadioTower,
  },
  {
    key: 'NEEDS_REVIEW',
    label: '需要判断',
    icon: CircleAlert,
  },
  {
    key: 'BLOCKED',
    label: '暂不推荐',
    icon: ShieldAlert,
  },
]

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'ALL', label: '全部角色' },
  { value: 'END_CUSTOMER', label: '客户' },
  { value: 'SUPPLIER', label: '供应商' },
  { value: 'PARTNER', label: '合作伙伴' },
  { value: 'DISTRIBUTOR', label: '分销商' },
  { value: 'COMPETITOR', label: '竞争对手' },
  { value: 'UNKNOWN', label: '未知' },
]

const RISK_OPTIONS: Array<{ value: RiskFilter; label: string }> = [
  { value: 'ALL', label: '全部风险' },
  { value: 'LOW', label: '低风险' },
  { value: 'MEDIUM', label: '中风险' },
  { value: 'HIGH', label: '高风险' },
]

const RISK_PRIORITY: Record<RadarRiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
}

export function RadarWorkspace({
  assessments,
}: {
  assessments: RadarAssessment[]
}) {
  const [decision, setDecision] = useState<DecisionFilter>('ALL')
  const [entityRole, setEntityRole] = useState<RoleFilter>('ALL')
  const [risk, setRisk] = useState<RiskFilter>('ALL')
  const [sortBy, setSortBy] = useState<RadarSort>('recommended')

  const visibleAssessments = useMemo(() => {
    const filtered = assessments.filter((assessment) => {
      const decisionMatches =
        decision === 'ALL' || assessment.decision === decision
      const roleMatches =
        entityRole === 'ALL' || assessment.entityRole === entityRole
      const riskMatches =
        risk === 'ALL' || assessment.riskLevel === risk

      return decisionMatches && roleMatches && riskMatches
    })

    if (sortBy === 'recommended') {
      // Preserve the order returned by Radar API. The frontend does not add a
      // second recommendation formula or alter the stored Decision.
      return filtered
    }

    return [...filtered].sort((left, right) => {
      if (sortBy === 'match') return right.matchScore - left.matchScore
      if (sortBy === 'confidence') {
        return right.confidenceScore - left.confidenceScore
      }
      if (sortBy === 'latest') {
        return (
          assessmentTime(right) - assessmentTime(left)
        )
      }
      return (
        RISK_PRIORITY[left.riskLevel] -
        RISK_PRIORITY[right.riskLevel]
      )
    })
  }, [assessments, decision, entityRole, risk, sortBy])

  const hasActiveFilters =
    decision !== 'ALL' || entityRole !== 'ALL' || risk !== 'ALL'

  const resetFilters = () => {
    setDecision('ALL')
    setEntityRole('ALL')
    setRisk('ALL')
  }

  return (
    <section aria-label="Radar 判断工作区">
      <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-700">
              <RadioTower className="h-4 w-4" />
              RADAR WORKSPACE
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink-900">
              真实信息与你当前销售目标的关系
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              默认展示全部已有判断，包括低匹配和暂不推荐内容。评分用于帮助排序，不代表企业已经成为客户。
            </p>
          </div>

          <label className="flex shrink-0 items-center gap-2 text-xs text-ink-500">
            <span>排序</span>
            <SelectShell>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as RadarSort)
                }
                aria-label="Radar 信息排序"
                className="appearance-none bg-transparent py-2.5 pl-3 pr-9 font-medium text-ink-700 outline-none"
              >
                <option value="recommended">AI推荐</option>
                <option value="match">匹配度最高</option>
                <option value="confidence">可信度最高</option>
                <option value="latest">最新发现</option>
                <option value="risk">风险最低</option>
              </select>
            </SelectShell>
          </label>
        </div>

        <div className="mt-5 border-t border-ink-100 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            判断分类
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {DECISION_FILTERS.map((item) => {
              const count =
                item.key === 'ALL'
                  ? assessments.length
                  : assessments.filter(
                      (assessment) =>
                        assessment.decision === item.key,
                    ).length
              const Icon = item.icon

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDecision(item.key)}
                  className={cn(
                    'flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition',
                    decision === item.key
                      ? 'border-brand-200 bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50',
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <span className="text-xs font-semibold">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="企业角色"
              value={entityRole}
              options={ROLE_OPTIONS}
              onChange={(value) => setEntityRole(value as RoleFilter)}
            />
            <FilterSelect
              label="风险"
              value={risk}
              options={RISK_OPTIONS}
              onChange={(value) => setRisk(value as RiskFilter)}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl px-3 py-2 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
              >
                清除筛选
              </button>
            )}
          </div>

          <p className="text-xs text-ink-500">
            显示{' '}
            <span className="font-semibold text-ink-900">
              {visibleAssessments.length}
            </span>{' '}
            / {assessments.length} 条判断
          </p>
        </div>
      </div>

      {visibleAssessments.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visibleAssessments.map((assessment) => (
            <RadarAssessmentCard
              key={assessment.id}
              assessment={assessment}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-3xl border border-ink-200 bg-white px-6 text-center shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
            <Search className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-ink-900">
            {assessments.length === 0
              ? '暂无相关信息'
              : '暂无符合当前筛选的内容'}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            {assessments.length === 0
              ? '系统不会生成模拟信息。真实评估结果产生后会显示在这里。'
              : '调整判断分类、企业角色或风险筛选，可以查看其他已有结果。'}
          </p>
          {assessments.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              查看全部结果
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-500">
      <span>{label}</span>
      <SelectShell>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label}筛选`}
          className="appearance-none bg-transparent py-2 pl-3 pr-8 font-medium text-ink-700 outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SelectShell>
    </label>
  )
}

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex rounded-xl border border-ink-200 bg-white transition hover:border-ink-300 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
      {children}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
    </span>
  )
}

function assessmentTime(assessment: RadarAssessment) {
  const value =
    assessment.evidence.publishedAt ||
    assessment.evidence.createdAt ||
    assessment.createdAt
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}
