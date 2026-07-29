import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileSearch,
  History,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import {
  getCompanyResearchWorkspace,
  getResearchTraceDetails,
  researchOpportunityCompany,
} from '@/services/api'
import type {
  CompanyResearchStatus,
  CompanyResearchWorkspace,
  OpportunityProductContext,
  ResearchInformationType,
  ResearchTraceDetails,
  ResearchTraceStatus,
  ResearchTraceStep,
  ResearchTraceStepV2,
  SearchProductContextDraft,
} from '@/types'

type WorkspaceTab =
  | 'overview'
  | 'opportunity'
  | 'product'
  | 'sources'
  | 'trace'

const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'overview', label: '企业概览' },
  { id: 'opportunity', label: '机会背景' },
  { id: 'product', label: '产品关联' },
  { id: 'sources', label: '来源与判断' },
  { id: 'trace', label: '机会判断依据' },
]

const STATUS_LABELS: Record<CompanyResearchStatus, string> = {
  NOT_STARTED: '研究尚未开始',
  DRAFT: '信息整理中',
  NEEDS_REVIEW: '部分信息待确认',
  READY: '企业研究已完成',
  FAILED: '研究未完成',
}

export function CompanyResearchWorkspacePage() {
  const { id = '' } = useParams()
  const [workspace, setWorkspace] =
    useState<CompanyResearchWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')
  const [trace, setTrace] = useState<ResearchTraceDetails | null>(null)
  const [traceLoading, setTraceLoading] = useState(true)
  const [traceFailed, setTraceFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)

    getCompanyResearchWorkspace(id)
      .then((result) => {
        if (!cancelled) setWorkspace(result)
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

  useEffect(() => {
    let cancelled = false
    setTraceLoading(true)
    setTraceFailed(false)

    getResearchTraceDetails(id)
      .then((result) => {
        if (!cancelled) setTrace(result)
      })
      .catch(() => {
        if (!cancelled) setTraceFailed(true)
      })
      .finally(() => {
        if (!cancelled) setTraceLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleRefreshResearch() {
    if (!workspace?.permissions.eligibleSearchEvidenceId) return

    setRefreshing(true)
    setRefreshMessage('')
    try {
      await researchOpportunityCompany(
        workspace.opportunity.id,
        workspace.permissions.eligibleSearchEvidenceId,
      )
      const [nextWorkspace, nextTrace] = await Promise.all([
        getCompanyResearchWorkspace(id),
        getResearchTraceDetails(id),
      ])
      setWorkspace(nextWorkspace)
      setTrace(nextTrace)
      setTraceFailed(false)
      setRefreshMessage('企业研究已更新')
    } catch {
      setRefreshMessage('暂时无法更新企业研究，请稍后重试。')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-16">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="mt-3 text-sm text-ink-500">
            正在整理企业研究资料...
          </p>
        </div>
      </div>
    )
  }

  if (failed || !workspace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="card px-6 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-ink-300" />
          <h1 className="mt-4 text-lg font-semibold text-ink-900">
            暂时无法打开企业研究
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            该销售机会可能不存在，或不属于当前账号。
          </p>
          <Link to="/app/discover" className="btn-secondary mt-5">
            返回销售机会
          </Link>
        </div>
      </div>
    )
  }

  const profile = workspace.companyProfile
  const opportunity = workspace.opportunity
  const context = productContext(workspace.productContextSnapshot)
  const hints = workspace.research.currentSnapshot?.researchHints
  const relevance =
    workspace.research.currentSnapshot?.relevanceAssessment
  const verificationQuestions = stringList(hints?.verificationQuestions)
  const relevanceReasons = stringList(relevance?.reasons)
  const matchedApplications = stringList(relevance?.matchedApplications)
  const matchedSignals = stringList(relevance?.matchedSignals)
  const companyName =
    profile?.companyName ?? opportunity.companyName ?? '待确认'
  const sourceCount =
    workspace.companySources.length || workspace.searchEvidence.length
  const canRefresh =
    Boolean(workspace.permissions.eligibleSearchEvidenceId) &&
    (workspace.permissions.canRefresh || workspace.permissions.canResearch)
  const groundedSourceIds = new Set(
    trace?.steps
      .flatMap((step) => step.supportingSources)
      .filter(
        (source) =>
          source.referenceType === 'SEARCH_EVIDENCE' ||
          source.referenceType === 'COMPANY_SOURCE',
      )
      .map((source) => source.id) ?? [],
  )
  const supportedFacts =
    trace?.steps
      .flatMap((step) => step.supportedClaims)
      .filter(
        (claim) =>
          claim.claimType === 'FACT' &&
          claim.supportingSourceIds.some((sourceId) =>
            groundedSourceIds.has(sourceId),
          ),
      )
      .slice(0, 5) ?? []
  const completionChecks = [
    sourceCount > 0,
    profile?.identityStatus === 'VERIFIED',
    Boolean(workspace.research.currentSnapshot),
    supportedFacts.length > 0,
  ]
  const completedChecks = completionChecks.filter(Boolean).length
  const completionPercent = completedChecks * 25
  const productRelevanceReasons =
    relevanceReasons.length > 0
      ? relevanceReasons
      : [opportunity.whyItMatters].filter(Boolean)
  const productVerificationQuestions =
    verificationQuestions.length > 0
      ? verificationQuestions
      : [
          '该企业是否存在与当前产品方向相关的实际项目？',
          '当前变化处于规划、实施还是完成阶段？',
          '负责评估该方向的是哪个业务或技术部门？',
        ]

  return (
    <div className="min-h-full bg-ink-50">
      <div className="sticky top-0 z-30 border-b border-ink-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
          <Link
            to={`/app/opportunities/${opportunity.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回机会详情
          </Link>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-ink-900">
                    {companyName}
                  </h1>
                  <ResearchStatusBadge status={workspace.research.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span>{sourceCount} 条真实来源</span>
                  <span>
                    最近更新：
                    {formatDateTime(
                      workspace.research.lastUpdatedAt ??
                        profile?.updatedAt ??
                        opportunity.updatedAt,
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {refreshMessage && (
                <span className="hidden text-xs text-ink-500 xl:inline">
                  {refreshMessage}
                </span>
              )}
              <button
                type="button"
                onClick={handleRefreshResearch}
                disabled={!canRefresh || refreshing}
                className="btn-primary whitespace-nowrap"
                title={
                  canRefresh
                    ? '使用现有真实来源更新企业研究'
                    : '当前没有可用于更新研究的真实来源'
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? '更新中...' : '更新研究'}
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 border-t border-ink-100 py-3 text-xs md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
            <div className="min-w-0">
              <span className="font-semibold text-ink-500">发现原因：</span>
              <span className="line-clamp-1 text-ink-700">
                {opportunity.whyItMatters}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ink-400">关联机会</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700">
                {opportunityTypeLabel(opportunity.type)}
              </span>
            </div>
            <div className="min-w-[150px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink-400">研究完成度</span>
                <span className="font-semibold text-ink-700">
                  {completedChecks}/4 项
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          <nav
            className="-mb-px flex gap-1 overflow-x-auto scrollbar-thin"
            aria-label="企业研究工作区"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-5 text-amber-900">
            企业画像用于支持销售研究，不代表该企业已经成为客户；销售机会也不代表已经产生采购需求。
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <main className="min-w-0">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <section className="card p-6">
                  <SectionHeading
                    icon={ShieldCheck}
                    title="研究信息状态"
                    state="Evidence First"
                    confirmed={supportedFacts.length > 0}
                  />
                  <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          已确认信息
                        </p>
                        <span className="text-xs text-emerald-700">
                          {supportedFacts.length} 项
                        </span>
                      </div>
                      {traceLoading ? (
                        <p className="mt-4 text-xs text-emerald-700">
                          正在核对 CompanySource 与 Evidence...
                        </p>
                      ) : supportedFacts.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                          {supportedFacts.map((fact) => (
                            <li
                              key={fact.id}
                              className="flex gap-2 text-sm leading-6 text-ink-700"
                            >
                              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                              {fact.text}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm leading-6 text-ink-500">
                          暂无可由明确来源支持的企业事实。
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-amber-900">
                          待验证信息
                        </p>
                        <span className="text-xs text-amber-700">
                          不自动补全
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <VerificationItem label="采购状态" />
                        <VerificationItem label="技术负责人" />
                        <VerificationItem label="项目阶段" />
                        <VerificationItem label="供应商情况" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="card p-6">
                  <SectionHeading
                    icon={Building2}
                    title="企业理解"
                    state="研究整理"
                  />
                  <p className="mt-2 text-sm text-ink-500">
                    企业画像用于组织研究，不代表已经成为客户。
                  </p>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Fact label="企业名称" value={profile?.companyName} />
                    <Fact
                      label="官方网站"
                      value={profile?.officialWebsite}
                      link
                    />
                    <Fact label="规范域名" value={profile?.normalizedDomain} />
                    <Fact label="行业" value={profile?.industry} />
                    <Fact
                      label="国家/地区"
                      value={profile?.region ?? profile?.country}
                    />
                    <Fact
                      label="企业类型"
                      value={companyTypeLabel(profile?.companyType)}
                    />
                  </dl>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <InfoBlock
                      label="业务描述"
                      value={profile?.description}
                    />
                    <InfoBlock
                      label="业务模式"
                      value={profile?.businessModel}
                    />
                    <InfoBlock
                      label="产品与服务"
                      value={profile?.products.join('、')}
                    />
                    <InfoBlock
                      label="涉及行业"
                      value={profile?.industries.join('、')}
                    />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'opportunity' && (
              <section className="card p-6">
                <SectionHeading
                  icon={FileSearch}
                  title="机会背景"
                  state="商业判断"
                />
                <h2 className="mt-5 text-xl font-semibold text-ink-900">
                  {opportunity.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink-600">
                  {opportunity.summary}
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <InfoBox
                    title="为什么值得关注"
                    text={opportunity.whyItMatters}
                  />
                  <InfoBox
                    title="推荐下一步"
                    text={opportunity.recommendedNextStep}
                    advice
                  />
                </div>
                <p className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs leading-5 text-amber-800">
                  这是基于真实市场变化形成的商业机会判断，不构成采购事实。
                </p>
              </section>
            )}

            {activeTab === 'product' && (
              <div className="space-y-5">
                <section className="card p-6">
                  <SectionHeading
                    icon={CheckCircle2}
                    title="当前产品方向"
                    state="研究背景"
                  />
                  <p className="mt-2 text-sm text-ink-500">
                    展示发现机会时保存的产品与市场方向。
                  </p>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Fact label="产品" value={context.product} />
                    <Fact label="产品类别" value={context.category} />
                    <Fact label="目标行业" value={context.industry} />
                    <Fact label="目标地区" value={context.region} />
                    <Fact label="目标客户" value={context.customerType} />
                    <Fact
                      label="关注变化"
                      value={context.buyingSignals?.join('、')}
                    />
                  </dl>
                </section>

                <section className="card p-6">
                  <SectionHeading
                    icon={Lightbulb}
                    title="关联原因"
                    state="商业判断"
                  />
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <ReasonList
                      title="为什么可能相关"
                      values={productRelevanceReasons}
                    />
                    <ReasonList
                      title="匹配的应用与变化"
                      values={[
                        ...matchedApplications,
                        ...matchedSignals,
                      ]}
                      emptyText="待进一步确认具体应用与变化"
                    />
                  </div>
                </section>

                <section className="card p-6">
                  <SectionHeading
                    icon={CircleHelp}
                    title="待验证问题"
                    state="建议"
                  />
                  <SuggestionList
                    title="销售研究需要继续确认"
                    values={productVerificationQuestions}
                  />
                  <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs leading-5 text-amber-800">
                    产品关联只是商业相关性判断，不等于企业需求确认，也不代表采购已经发生。
                  </p>
                </section>
              </div>
            )}

            {activeTab === 'sources' && (
              <section className="card p-6">
                <SectionHeading
                  icon={ShieldCheck}
                  title="来源与判断"
                  state="Evidence First"
                  confirmed={Boolean(trace?.detailsSummary.confirmedFacts)}
                />
                <p className="mt-2 text-sm text-ink-500">
                  真实来源、已确认事实、商业判断和建议保持分层展示。
                </p>
                <SourceMappingPanel
                  trace={trace}
                  loading={traceLoading}
                  failed={traceFailed}
                />
              </section>
            )}

            {activeTab === 'trace' && (
              <section className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                      <History className="h-5 w-5 text-brand-600" />
                      机会判断依据
                    </h2>
                    <p className="mt-1 text-sm text-ink-500">
                      研究记录默认收起，需要时再查看完整路径。
                    </p>
                  </div>
                  {trace && (
                    <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-medium text-ink-500">
                      {trace.summary.completed} 项已完成
                    </span>
                  )}
                </div>

                <TracePanel
                  trace={trace}
                  loading={traceLoading}
                  failed={traceFailed}
                />
              </section>
            )}
          </main>

          <SourceRail
            workspace={workspace}
            supportedFacts={supportedFacts}
            traceLoading={traceLoading}
          />
        </div>
      </div>
    </div>
  )
}

function ResearchStatusBadge({ status }: { status: CompanyResearchStatus }) {
  const ready = status === 'READY'
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        ready
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700'
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function SourceRail({
  workspace,
  supportedFacts,
  traceLoading,
}: {
  workspace: CompanyResearchWorkspace
  supportedFacts: ResearchTraceStepV2['supportedClaims']
  traceLoading: boolean
}) {
  const sources =
    workspace.companySources.length > 0
      ? workspace.companySources.map((source) => ({
          id: source.id,
          title: source.title,
          url: source.url,
          excerpt: source.excerpt,
          confirmed: true,
        }))
      : workspace.searchEvidence.map((item) => ({
          id: item.id,
          title: item.searchEvidence.title,
          url: item.searchEvidence.sourceUrl,
          excerpt: item.excerpt,
          confirmed: false,
        }))

  return (
    <aside className="space-y-4 lg:sticky lg:top-48 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:pr-1 scrollbar-thin">
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">真实来源</p>
            <p className="mt-1 text-xs text-ink-400">研究只引用明确关联来源</p>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {sources.length} 条
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {sources.length > 0 ? (
            sources.map((source) => (
              <SourceCard key={source.id} {...source} />
            ))
          ) : (
            <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
              真实来源待确认
            </p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink-900">支持事实</p>
          <span className="text-xs text-ink-400">
            {supportedFacts.length} 项
          </span>
        </div>
        {traceLoading ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            正在核对来源...
          </div>
        ) : supportedFacts.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {supportedFacts.map((fact) => (
              <li
                key={fact.id}
                className="flex gap-2 text-xs leading-5 text-ink-600"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {fact.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-ink-50 p-4 text-xs leading-5 text-ink-500">
            暂无具有明确来源支持的企业事实。
          </p>
        )}
      </section>
    </aside>
  )
}

function SectionHeading({
  icon: Icon,
  title,
  state,
  confirmed = false,
}: {
  icon: typeof Building2
  title: string
  state: string
  confirmed?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
        <Icon className="h-5 w-5 text-brand-600" />
        {title}
      </h2>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          confirmed
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}
      >
        {state}
      </span>
    </div>
  )
}

function Fact({
  label,
  value,
  link = false,
}: {
  label: string
  value?: string | null
  link?: boolean
}) {
  const display = known(value)
  return (
    <div className="rounded-xl border border-ink-100 px-4 py-3">
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink-800">
        {link && value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-brand-600"
          >
            {display}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          display
        )}
      </dd>
    </div>
  )
}

function InfoBlock({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-ink-700">{known(value)}</p>
    </div>
  )
}

function InfoBox({
  title,
  text,
  advice = false,
}: {
  title: string
  text: string
  advice?: boolean
}) {
  return (
    <div
      className={
        advice
          ? 'rounded-xl bg-amber-50 p-4'
          : 'rounded-xl bg-brand-50/60 p-4'
      }
    >
      <p className="text-xs font-semibold text-ink-700">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-700">{text}</p>
    </div>
  )
}

function SuggestionList({
  title,
  values,
}: {
  title: string
  values: string[]
}) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {values.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {values.map((value) => (
            <li
              key={value}
              className="flex gap-2 text-sm leading-6 text-ink-600"
            >
              <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-500">待确认</p>
      )}
    </div>
  )
}

function VerificationItem({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-white/70 px-3 py-2.5">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-amber-800">待确认</p>
    </div>
  )
}

function ReasonList({
  title,
  values,
  emptyText = '待确认',
}: {
  title: string
  values: string[]
  emptyText?: string
}) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {values.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {values.map((value) => (
            <li
              key={value}
              className="flex gap-2 text-sm leading-6 text-ink-600"
            >
              <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-brand-500" />
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ink-500">{emptyText}</p>
      )}
    </div>
  )
}

function SourceCard({
  title,
  url,
  excerpt,
  confirmed,
}: {
  title?: string | null
  url: string
  excerpt?: string | null
  confirmed: boolean
}) {
  return (
    <article className="rounded-xl border border-ink-100 bg-ink-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-5 text-ink-800">
          {known(title)}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            confirmed
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {confirmed ? '已确认' : '待确认'}
        </span>
      </div>
      {excerpt && (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink-500">
          {excerpt}
        </p>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
      >
        查看来源
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </article>
  )
}

function SourceMappingPanel({
  trace,
  loading,
  failed,
}: {
  trace: ResearchTraceDetails | null
  loading: boolean
  failed: boolean
}) {
  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl bg-ink-50 px-4 py-5 text-sm text-ink-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        正在整理来源与判断...
      </div>
    )
  }

  if (failed || !trace) {
    return (
      <div className="mt-6 rounded-xl bg-ink-50 px-4 py-5 text-sm text-ink-500">
        暂时无法读取来源映射，企业研究资料不受影响。
      </div>
    )
  }

  const sources = Array.from(
    new Map(
      trace.steps
        .flatMap((step) => step.supportingSources)
        .map((source) => [source.id, source]),
    ).values(),
  )
  const claims = trace.steps.flatMap((step) => step.supportedClaims)

  if (sources.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-5">
        <p className="text-sm font-semibold text-amber-800">来源仍需确认</p>
        <p className="mt-1 text-xs leading-5 text-amber-700">
          当前没有可用于支持企业事实的显式关联来源。
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      {sources.map((source) => {
        const sourceClaims = claims.filter((claim) =>
          claim.supportingSourceIds.includes(source.id),
        )
        const facts = sourceClaims.filter(
          (claim) => claim.claimType === 'FACT',
        )
        const assessments = sourceClaims.filter(
          (claim) => claim.claimType === 'ASSESSMENT',
        )
        const recommendations = sourceClaims.filter(
          (claim) => claim.claimType === 'RECOMMENDATION',
        )

        return (
          <article
            key={source.id}
            className="rounded-xl border border-ink-100 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{source.title}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {source.role === 'CONTEXT' ? '研究背景' : '真实来源'}
                </p>
              </div>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                >
                  打开来源
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {source.excerpt && (
              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2.5 text-xs leading-5 text-ink-600">
                {source.excerpt}
              </p>
            )}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ClaimGroup
                title="支持事实"
                claims={facts}
                emptyText="没有已确认事实"
                tone="fact"
              />
              <ClaimGroup
                title="商业判断"
                claims={assessments}
                emptyText="没有关联判断"
                tone="assessment"
              />
              <ClaimGroup
                title="研究建议"
                claims={recommendations}
                emptyText="没有关联建议"
                tone="recommendation"
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ClaimGroup({
  title,
  emptyText,
  claims,
  tone,
}: {
  title: string
  emptyText: string
  claims: ResearchTraceStepV2['supportedClaims']
  tone: 'fact' | 'assessment' | 'recommendation'
}) {
  const toneClass =
    tone === 'fact'
      ? 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
      : tone === 'recommendation'
        ? 'border-violet-100 bg-violet-50/50 text-violet-800'
        : 'border-brand-100 bg-brand-50/50 text-brand-800'

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-xs font-semibold">{title}</p>
      <div className="mt-2 space-y-2">
        {claims.length > 0 ? (
          claims.map((claim) => (
            <p key={claim.id} className="text-xs leading-5">
              {claim.text}
            </p>
          ))
        ) : (
          <p className="text-xs leading-5 opacity-70">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

function TracePanel({
  trace,
  loading,
  failed,
}: {
  trace: ResearchTraceDetails | null
  loading: boolean
  failed: boolean
}) {
  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl bg-ink-50 px-4 py-5 text-sm text-ink-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        正在整理判断依据...
      </div>
    )
  }

  if (failed || !trace) {
    return (
      <div className="mt-6 rounded-xl bg-ink-50 px-4 py-5 text-sm text-ink-500">
        暂时无法读取研究记录，企业研究资料不受影响。
      </div>
    )
  }

  return (
    <details className="group mt-6 rounded-xl border border-ink-100 bg-ink-50/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            查看完整研究路径
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {trace.summary.completed} 项完成 · {trace.summary.needsReview}{' '}
            项待确认
          </p>
        </div>
        <ChevronDown className="h-5 w-5 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-ink-100 px-5 py-5">
        <div className="relative space-y-5">
          <div className="absolute bottom-4 left-[15px] top-4 w-px bg-ink-200" />
          {trace.steps.map((step) => (
            <TraceStepCard key={step.id} step={step} />
          ))}
        </div>
      </div>
    </details>
  )
}

const TRACE_STATUS_LABELS: Record<ResearchTraceStatus, string> = {
  COMPLETED: '已完成',
  PARTIAL: '部分完成',
  NEEDS_REVIEW: '待确认',
  FAILED: '未完成',
}

const INFORMATION_LABELS: Record<ResearchInformationType, string> = {
  FACT: '已确认事实',
  ASSESSMENT: '商业判断',
  RECOMMENDATION: '研究建议',
}

function TraceStepCard({ step }: { step: ResearchTraceStep }) {
  const completed = step.status === 'COMPLETED'
  const typeClass =
    step.informationType === 'FACT'
      ? 'bg-emerald-50 text-emerald-700'
      : step.informationType === 'RECOMMENDATION'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-brand-50 text-brand-700'

  return (
    <article className="relative pl-10">
      <div
        className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-ink-50 ${
          completed
            ? 'bg-emerald-500 text-white'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <CircleHelp className="h-4 w-4" />
        )}
      </div>

      <div className="rounded-xl border border-ink-100 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink-900">{step.title}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeClass}`}
              >
                {INFORMATION_LABELS[step.informationType]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              {step.summary}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-ink-400">
            {TRACE_STATUS_LABELS[step.status]}
          </span>
        </div>

        {step.sourceReferences.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {step.sourceReferences.map((source) =>
              source.url ? (
                <a
                  key={`${source.type}:${source.id}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-brand-600"
                >
                  <span className="truncate">
                    {source.title ?? '真实来源'}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <span
                  key={`${source.type}:${source.id}`}
                  className="rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-600"
                >
                  {source.title ?? '研究背景'}
                </span>
              ),
            )}
          </div>
        )}

        {step.pendingVerifications.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">仍需确认</p>
            <ul className="mt-1 space-y-1">
              {step.pendingVerifications.map((item) => (
                <li key={item} className="text-xs leading-5 text-amber-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-4 border-t border-ink-100 pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-ink-500">
            查看判断原因
          </summary>
          <div className="mt-3 space-y-3 text-xs text-ink-500">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <span>版本：{step.version ?? '待确认'}</span>
              <span>
                置信度：
                {step.confidence === null
                  ? '待确认'
                  : `${step.confidence}%`}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDateTime(step.timestamp)}
              </span>
            </div>
            <ul className="space-y-1">
              {step.reasons.map((reason) => (
                <li key={reason} className="leading-5">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </article>
  )
}

function productContext(
  snapshot: OpportunityProductContext,
): SearchProductContextDraft {
  return 'context' in snapshot ? snapshot.context : snapshot
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function known(value: string | null | undefined) {
  return value && value !== 'Unknown' ? value : '待确认'
}

function companyTypeLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    MANUFACTURER: '制造企业',
    INTEGRATOR: '系统集成商',
    DISTRIBUTOR: '经销商',
    SOFTWARE_COMPANY: '软件企业',
    UNKNOWN: '待确认',
  }
  return value ? labels[value] ?? value : '待确认'
}

function opportunityTypeLabel(value: string) {
  const labels: Record<string, string> = {
    COMPANY_EXPANSION: '企业扩张',
    INVESTMENT: '企业投资',
    DIGITAL_UPGRADE: '数字化升级',
  }
  return labels[value] ?? '企业变化'
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '待确认'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '待确认'
    : date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
}
