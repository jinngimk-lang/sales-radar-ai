import {
  ArrowUpRight,
  Building2,
  CircleGauge,
  Factory,
  Landmark,
  RefreshCw,
} from 'lucide-react'
import type {
  OpportunityType,
  SalesOpportunity,
} from '@/types'

const TYPE_META: Record<
  OpportunityType,
  { label: string; icon: typeof Factory }
> = {
  COMPANY_EXPANSION: { label: '企业扩张', icon: Factory },
  INVESTMENT: { label: '投资动态', icon: Landmark },
  DIGITAL_UPGRADE: { label: '数字化升级', icon: RefreshCw },
}

export function OpportunityCard({
  opportunity,
}: {
  opportunity: SalesOpportunity
}) {
  const meta = TYPE_META[opportunity.type]
  const Icon = meta.icon
  const source = opportunity.evidence[0]?.searchEvidence

  return (
    <article className="card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-600">
              {meta.label}
            </p>
            <h3 className="mt-0.5 truncate font-semibold text-ink-900">
              {opportunity.companyName || '公司待确认'}
            </h3>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600">
          <CircleGauge className="h-3.5 w-3.5" />
          {opportunity.confidence}%
        </span>
      </div>

      <h4 className="mt-4 text-sm font-semibold leading-6 text-ink-900">
        {opportunity.title}
      </h4>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-600">
        {opportunity.summary}
      </p>

      <div className="mt-4 rounded-xl bg-brand-50/60 p-3">
        <p className="text-xs font-semibold text-brand-700">为什么值得关注</p>
        <p className="mt-1 text-xs leading-5 text-ink-600">
          {opportunity.whyItMatters}
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-600">
        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
        <span>{opportunity.recommendedNextStep}</span>
      </div>

      {source && (
        <a
          href={source.rawUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          查看真实来源
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  )
}
