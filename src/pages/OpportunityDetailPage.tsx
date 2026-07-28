import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CircleGauge,
  ExternalLink,
  Factory,
  Landmark,
  Lightbulb,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  ApiRequestError,
  getOpportunityById,
  researchOpportunityCompany,
} from '@/services/api'
import type {
  CompanyResearchStatus,
  OpportunityCompanyIntelligenceResult,
  OpportunityDetail,
  OpportunityProductContext,
  OpportunityType,
  SearchProductContextDraft,
} from '@/types'

type ResearchActionStatus = 'idle' | 'running' | 'completed' | 'failed'

const TYPE_META: Record<
  OpportunityType,
  { label: string; icon: typeof Factory }
> = {
  COMPANY_EXPANSION: { label: '企业扩张', icon: Factory },
  INVESTMENT: { label: '企业投资', icon: Landmark },
  DIGITAL_UPGRADE: { label: '数字化升级', icon: RefreshCw },
}

const RESEARCH_STATUS: Record<
  CompanyResearchStatus,
  { label: string; description: string }
> = {
  NOT_STARTED: {
    label: '企业研究尚未开始',
    description: '目前只确认了市场机会，企业身份和业务信息仍待进一步研究。',
  },
  DRAFT: {
    label: '企业信息整理中',
    description: '已建立企业研究记录，部分信息仍待真实来源确认。',
  },
  NEEDS_REVIEW: {
    label: '企业身份已确认',
    description: '企业身份已有来源支持，业务理解和产品相关性仍待复核。',
  },
  READY: {
    label: '企业研究已完成',
    description: '已有可追踪的企业资料和研究结果。',
  },
  FAILED: {
    label: '企业研究未完成',
    description: '现有来源不足以完成企业研究，请保留为市场机会。',
  },
}

export function OpportunityDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [opportunity, setOpportunity] =
    useState<OpportunityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [researchActionStatus, setResearchActionStatus] =
    useState<ResearchActionStatus>('idle')
  const [researchFailure, setResearchFailure] = useState('')
  const [latestResearch, setLatestResearch] =
    useState<OpportunityCompanyIntelligenceResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)

    getOpportunityById(id)
      .then((result) => {
        if (!cancelled) setOpportunity(result)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleCompanyResearch() {
    if (!opportunity) return
    const evidence =
      opportunity.evidence.find((item) => item.isPrimary) ??
      opportunity.evidence[0]

    if (!evidence) {
      setResearchActionStatus('failed')
      setResearchFailure('当前机会缺少可用于企业研究的真实来源。')
      return
    }

    setResearchActionStatus('running')
    setResearchFailure('')
    try {
      const result = await researchOpportunityCompany(
        opportunity.id,
        evidence.searchEvidence.id,
      )
      setLatestResearch(result)
      setResearchActionStatus('completed')
      navigate(`/app/opportunities/${opportunity.id}/research`)
    } catch (error) {
      setResearchActionStatus('failed')
      setResearchFailure(companyResearchErrorMessage(error))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-16">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="mt-3 text-sm text-ink-500">正在读取销售机会...</p>
        </div>
      </div>
    )
  }

  if (failed || !opportunity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="card px-6 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-ink-300" />
          <h1 className="mt-4 text-lg font-semibold text-ink-900">
            暂时无法查看这个机会
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            该机会可能不存在，或不属于当前账号。
          </p>
          <Link to="/app/discover" className="btn-secondary mt-5">
            返回销售机会
          </Link>
        </div>
      </div>
    )
  }

  const meta = TYPE_META[opportunity.type]
  const TypeIcon = meta.icon
  const research = RESEARCH_STATUS[opportunity.companyResearchStatus]
  const context = productContext(opportunity.productContextSnapshot)
  const showResearchFailure =
    researchActionStatus === 'failed' ||
    (researchActionStatus === 'idle' &&
      opportunity.companyResearchStatus === 'FAILED')

  return (
    <div className="min-h-full bg-ink-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/app/discover"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回销售机会
        </Link>

        <header className="mt-5 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <TypeIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-600">
                  {meta.label}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-ink-900">
                  {opportunity.title}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
                  <Building2 className="h-4 w-4" />
                  {known(opportunity.companyName)}
                </p>
              </div>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
              <CircleGauge className="h-4 w-4" />
              机会匹配度 {opportunity.confidence}%
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm leading-6 text-amber-900">
              这是根据真实市场变化识别的销售机会，不代表企业已经产生采购需求，也不是已确认客户。
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-6">
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-ink-900">机会概览</h2>
              <p className="mt-3 text-sm leading-7 text-ink-600">
                {opportunity.summary}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-brand-50/60 p-4">
                  <p className="text-xs font-semibold text-brand-700">
                    为什么值得关注
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {opportunity.whyItMatters}
                  </p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    推荐下一步
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {opportunity.recommendedNextStep}
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink-900">
                  真实来源
                </h2>
                <span className="text-xs text-ink-400">
                  {opportunity.evidence.length} 条依据
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {opportunity.evidence.length > 0 ? (
                  opportunity.evidence.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-ink-100 bg-ink-50/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900">
                            {known(item.searchEvidence.title)}
                          </p>
                          <p className="mt-1 text-xs text-ink-400">
                            {sourceHost(item.searchEvidence.rawUrl)}
                            {' · '}
                            {formatDate(
                              item.searchEvidence.createdAt ??
                                item.createdAt ??
                                opportunity.createdAt,
                            )}
                          </p>
                        </div>
                        {item.isPrimary && (
                          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">
                            主要来源
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink-600">
                        {item.excerpt}
                      </p>
                      <a
                        href={item.searchEvidence.rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        查看原始来源
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
                    真实来源待确认
                  </p>
                )}
              </div>
            </section>

            <section className="card p-6">
              <h2 className="text-lg font-semibold text-ink-900">产品关联</h2>
              <p className="mt-1 text-sm text-ink-500">
                展示发现该机会时保存的产品方向，不代表企业已经确认需求。
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <ContextItem label="产品" value={context.product} />
                <ContextItem label="产品类别" value={context.category} />
                <ContextItem label="目标行业" value={context.industry} />
                <ContextItem label="目标地区" value={context.region} />
                <ContextItem
                  label="目标客户类型"
                  value={context.customerType}
                />
                <ContextItem
                  label="关注变化"
                  value={context.buyingSignals?.join('、')}
                />
              </dl>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="card p-5">
              <p className="text-xs font-semibold text-brand-600">
                企业研究状态
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">
                {research.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                {research.description}
              </p>

              {researchActionStatus === 'running' && (
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在核验企业身份和真实来源...
                </div>
              )}

              {showResearchFailure && (
                <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-800">
                    企业研究未完成
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rose-700">
                    {researchFailure ||
                      '现有来源不足以完成企业研究，可在确认真实来源后重新尝试。'}
                  </p>
                  <button
                    type="button"
                    onClick={handleCompanyResearch}
                    className="btn-secondary mt-3 w-full"
                  >
                    重新研究
                  </button>
                </div>
              )}

              {opportunity.companies.length > 0 ? (
                <>
                  <div className="mt-5 space-y-3">
                    {opportunity.companies.map((company) => (
                      <div
                        key={company.id}
                        className="rounded-xl border border-ink-100 bg-ink-50 p-4"
                      >
                        <p className="font-semibold text-ink-900">
                          {known(company.companyName)}
                        </p>
                        <dl className="mt-3 space-y-2 text-xs">
                          <SummaryItem
                            label="行业"
                            value={known(company.industry)}
                          />
                          <SummaryItem
                            label="地区"
                            value={known(company.region ?? company.country)}
                          />
                          <SummaryItem
                            label="身份可信度"
                            value={`${company.identityConfidence}%`}
                          />
                        </dl>
                        {company.officialWebsite && (
                          <a
                            href={company.officialWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                          >
                            企业官网
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  <Link
                    to={`/app/opportunities/${opportunity.id}/research`}
                    className="btn-primary mt-4 w-full"
                  >
                    打开企业研究工作区
                  </Link>
                </>
              ) : (
                researchActionStatus === 'idle' &&
                !showResearchFailure && (
                  <>
                    <div className="mt-5 rounded-xl bg-ink-50 p-4 text-sm leading-6 text-ink-500">
                      暂未建立企业画像。当前机会会继续保留，不会自动转为客户。
                    </div>
                    <button
                      type="button"
                      onClick={handleCompanyResearch}
                      className="btn-primary mt-4 w-full"
                    >
                      研究这家公司
                    </button>
                    <p className="mt-2 text-center text-[11px] leading-5 text-ink-400">
                      仅使用当前机会的真实来源，不会创建客户或联系人。
                    </p>
                  </>
                )
              )}

              {latestResearch && (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-800">
                    企业研究已更新
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    已核验 {latestResearch.sources.length} 条真实来源，未知业务信息继续保持待确认。
                  </p>
                </div>
              )}
            </section>

            <section className="card p-5">
              <p className="text-xs font-semibold text-ink-500">发现时间</p>
              <p className="mt-2 text-sm font-medium text-ink-900">
                {formatDate(opportunity.createdAt)}
              </p>
              <p className="mt-4 text-xs leading-5 text-ink-400">
                所有未知信息保持待确认，只有通过现有客户质量规则后才会成为已确认客户。
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function productContext(
  snapshot: OpportunityProductContext,
): SearchProductContextDraft {
  return 'context' in snapshot ? snapshot.context : snapshot
}

function ContextItem({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="rounded-xl border border-ink-100 px-4 py-3">
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink-800">
        {known(value)}
      </dd>
    </div>
  )
}

function SummaryItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right font-medium text-ink-700">{value}</dd>
    </div>
  )
}

function known(value: string | null | undefined) {
  return value && value !== 'Unknown' ? value : '待确认'
}

function sourceHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return '真实来源'
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '时间待确认'
    : date.toLocaleDateString('zh-CN')
}

function companyResearchErrorMessage(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return '系统暂时无法完成企业研究，请稍后重试。'
  }

  switch (error.code) {
    case 'COMPANY_INTELLIGENCE_SOURCE_NOT_ELIGIBLE':
      return '当前来源缺少可验证的网址或正文，请更换真实来源后重试。'
    case 'COMPANY_IDENTITY_NOT_VERIFIED':
      return '当前来源不足以确认企业身份，相关信息继续保持待确认。'
    case 'COMPANY_INTELLIGENCE_EVIDENCE_NOT_FOUND':
      return '所选来源与当前机会不匹配，无法用于企业研究。'
    case 'COMPANY_INTELLIGENCE_OPPORTUNITY_NOT_FOUND':
      return '该机会不存在或不属于当前账号。'
    default:
      return '系统暂时无法完成企业研究，请稍后重试。'
  }
}
