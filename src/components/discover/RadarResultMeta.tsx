import { ShieldAlert } from 'lucide-react'
import type {
  RadarAssessmentDecision,
  RadarEntityRole,
  RadarRiskLevel,
} from '@/types'
import {
  DECISION_LABELS,
  RISK_DESCRIPTIONS,
  RISK_LABELS,
  ROLE_LABELS,
} from '@/features/radar/radar-presentation'
import { cn } from '@/lib/utils'

const DECISION_STYLES: Record<RadarAssessmentDecision, string> = {
  OPPORTUNITY_CREATED: 'border-orange-200 bg-orange-50 text-orange-800',
  POTENTIAL_OPPORTUNITY: 'border-amber-200 bg-amber-50 text-amber-800',
  MARKET_SIGNAL_ONLY: 'border-sky-200 bg-sky-50 text-sky-800',
  NEEDS_REVIEW: 'border-ink-200 bg-ink-50 text-ink-700',
  BLOCKED: 'border-ink-200 bg-ink-100 text-ink-600',
}

const RISK_STYLES: Record<RadarRiskLevel, string> = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-800',
  HIGH: 'border-rose-200 bg-rose-50 text-rose-800',
}

export function DecisionBadge({
  decision,
}: {
  decision: RadarAssessmentDecision
}) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        DECISION_STYLES[decision],
      )}
    >
      {DECISION_LABELS[decision]}
    </span>
  )
}

export function RoleBadge({ role }: { role: RadarEntityRole }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-700">
      {ROLE_LABELS[role]}
    </span>
  )
}

export function RiskBadge({ risk }: { risk: RadarRiskLevel }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        RISK_STYLES[risk],
      )}
      title={RISK_DESCRIPTIONS[risk]}
    >
      <ShieldAlert className="h-3 w-3" />
      {RISK_LABELS[risk]}
    </span>
  )
}

export function ScorePair({
  match,
  confidence,
  compact = false,
}: {
  match: number
  confidence: number
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-ink-200 rounded-xl border border-ink-200 bg-ink-50/70',
        compact ? 'min-w-[158px]' : 'min-w-[188px]',
      )}
    >
      <ScoreCell label="匹配度" value={match} compact={compact} />
      <ScoreCell label="可信度" value={confidence} compact={compact} />
    </div>
  )
}

function ScoreCell({
  label,
  value,
  compact,
}: {
  label: string
  value: number
  compact: boolean
}) {
  return (
    <span className={cn('text-center', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
      <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-400">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-semibold tabular-nums text-ink-900">
        {value}
        <span className="ml-0.5 text-[10px] font-medium text-ink-400">/100</span>
      </span>
    </span>
  )
}

export function formatRadarDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '时间待确认'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
