import {
  ArrowRight,
  ArrowUpRight,
  CircleGauge,
  Factory,
  Landmark,
  Lightbulb,
  RefreshCw,
  Route,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  OpportunityType,
  SalesOpportunity,
} from '@/types'
import { resolveSourcePlatform } from '@/lib/sourcePlatform'

const TYPE_META: Record<
  OpportunityType,
  { label: string; icon: typeof Factory }
> = {
  COMPANY_EXPANSION: { label: '企业扩张', icon: Factory },
  INVESTMENT: { label: '企业投资', icon: Landmark },
  DIGITAL_UPGRADE: { label: '数字化升级', icon: RefreshCw },
}

export function OpportunityCard({
  opportunity,
}: {
  opportunity: SalesOpportunity
}) {
  const meta = TYPE_META[opportunity.type]
  const Icon = meta.icon
  const primaryEvidence =
    opportunity.evidence.find((item) => item.isPrimary) ??
    opportunity.evidence[0]
  const source = primaryEvidence?.searchEvidence
  const sourcePlatform = source
    ? resolveSourcePlatform(source.rawUrl, source.platform)
    : null
  const confidence = Math.max(0, Math.min(100, opportunity.confidence))

  let sourceHost = ''
  if (source?.rawUrl) {
    try {
      sourceHost = new URL(source.rawUrl).hostname.replace(/^www\./, '')
    } catch {
      sourceHost = ''
    }
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover">
      <div className="border-b border-ink-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate text-xs font-semibold tracking-wide text-brand-700">
              {meta.label}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              可能相关
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-700">
            <CircleGauge className="h-3.5 w-3.5 text-brand-600" />
            判断可信度 {confidence}%
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div>
          <p className="text-xs font-medium text-ink-500">相关企业</p>
          <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-ink-900">
            {opportunity.companyName || '企业主体待确认'}
          </h3>
          <p className="mt-2 text-[11px] font-medium text-ink-500">
            企业角色 · 待进一步确认
          </p>
          <h4 className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-ink-900">
            {opportunity.title}
          </h4>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-600">
            {opportunity.summary}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <section className="rounded-2xl bg-brand-50/75 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-800">
              <Lightbulb className="h-3.5 w-3.5" />
              为什么值得关注
              <span className="font-medium text-brand-600">商业判断</span>
            </div>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink-700">
              {opportunity.whyItMatters}
            </p>
          </section>

          <section className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-800">
              <Route className="h-3.5 w-3.5 text-brand-600" />
              建议下一步
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-600">
              {opportunity.recommendedNextStep}
            </p>
            <p className="mt-2 text-[11px] text-ink-500">
              这是销售研究建议，需结合后续验证。
            </p>
          </section>

          <section className="rounded-2xl border border-dashed border-ink-300 bg-white p-4">
            <p className="text-xs font-semibold text-ink-800">
              需要验证
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-600">
              企业角色、事件阶段与实际业务需求仍需回到来源并通过后续研究确认。
            </p>
          </section>
        </div>

        <div className="mt-5 border-t border-ink-100 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                真实来源 · {opportunity.evidence.length} 条依据
              </p>
              {source ? (
                <>
                  <p className="mt-1 truncate text-xs font-medium text-ink-700">
                    {source.title || sourceHost || '查看来源页面'}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-sky-700">
                    来源平台 · {sourcePlatform?.label}
                  </p>
                  {primaryEvidence?.excerpt && (
                    <p className="mt-1 line-clamp-1 text-xs text-ink-500">
                      {primaryEvidence.excerpt}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-xs text-ink-500">来源待确认</p>
              )}
            </div>
            {source && (
              <a
                href={source.rawUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="打开真实来源"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <Link
          to={`/app/opportunities/${opportunity.id}`}
          className="mt-4 inline-flex items-center justify-between rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-700"
        >
          查看机会详情
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  )
}
