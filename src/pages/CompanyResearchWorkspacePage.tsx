import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  FileSearch,
  Lightbulb,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { getCompanyResearchWorkspace } from '@/services/api'
import type {
  CompanyResearchStatus,
  CompanyResearchWorkspace,
  OpportunityProductContext,
  SearchProductContextDraft,
} from '@/types'

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
  const suggestedDepartments = stringList(hints?.suggestedDepartments)
  const verificationQuestions = stringList(hints?.verificationQuestions)
  const companyName =
    profile?.companyName ?? opportunity.companyName ?? '待确认'

  return (
    <div className="min-h-full bg-ink-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to={`/app/opportunities/${opportunity.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回机会详情
        </Link>

        <header className="mt-5 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-600">
                  企业研究工作区
                </p>
                <h1 className="mt-1 text-2xl font-bold text-ink-900">
                  {companyName}
                </h1>
                <p className="mt-2 text-sm text-ink-500">
                  基于当前销售机会和真实来源整理企业信息。
                </p>
              </div>
            </div>
            <span className="inline-flex self-start rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
              {STATUS_LABELS[workspace.research.status]}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm leading-6 text-amber-900">
              企业画像用于支持销售研究，不代表该企业已经成为客户，也不代表已经产生采购需求。
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-6">
            <section className="card p-6">
              <SectionHeading
                icon={Building2}
                title="企业身份"
                state={profile?.identityStatus === 'VERIFIED' ? '已确认' : '待确认'}
                confirmed={profile?.identityStatus === 'VERIFIED'}
              />
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Fact label="企业名称" value={profile?.companyName} />
                <Fact label="官方网站" value={profile?.officialWebsite} link />
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
              {profile?.description && (
                <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm leading-6 text-ink-600">
                  {profile.description}
                </p>
              )}
            </section>

            <section className="card p-6">
              <SectionHeading
                icon={FileSearch}
                title="销售机会背景"
                state="已确认"
                confirmed
              />
              <h2 className="mt-4 text-lg font-semibold text-ink-900">
                {opportunity.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-ink-600">
                {opportunity.summary}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InfoBox
                  title="为什么值得关注"
                  text={opportunity.whyItMatters}
                />
                <InfoBox
                  title="建议下一步"
                  text={opportunity.recommendedNextStep}
                  advice
                />
              </div>
            </section>

            <section className="card p-6">
              <SectionHeading
                icon={CheckCircle2}
                title="产品关联"
                state="待确认"
              />
              <p className="mt-2 text-sm text-ink-500">
                以下是发现机会时保存的产品方向，不代表企业已经确认需求。
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
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
                title="研究建议"
                state="研究建议"
              />
              <p className="mt-2 text-sm text-ink-500">
                这些内容用于指导后续验证，不是已经确认的企业事实。
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SuggestionList
                  title="建议关注部门"
                  values={suggestedDepartments}
                />
                <SuggestionList
                  title="建议验证问题"
                  values={verificationQuestions}
                />
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className="card p-5">
              <p className="text-xs font-semibold text-brand-600">研究状态</p>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">
                {STATUS_LABELS[workspace.research.status]}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                {researchStatusDescription(workspace.research.status)}
              </p>
              <dl className="mt-4 space-y-2 text-xs">
                <StatusRow
                  label="企业身份"
                  value={
                    profile?.identityStatus === 'VERIFIED'
                      ? '已确认'
                      : '待确认'
                  }
                />
                <StatusRow
                  label="真实来源"
                  value={`${workspace.companySources.length} 条`}
                />
                <StatusRow
                  label="研究版本"
                  value={
                    workspace.research.currentSnapshot?.analysisVersion ??
                    '待确认'
                  }
                />
              </dl>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-900">真实来源</p>
                <span className="text-xs text-ink-400">
                  {workspace.companySources.length ||
                    workspace.searchEvidence.length}{' '}
                  条
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {workspace.companySources.length > 0
                  ? workspace.companySources.map((source) => (
                      <SourceCard
                        key={source.id}
                        title={source.title}
                        url={source.url}
                        excerpt={source.excerpt}
                        confirmed
                      />
                    ))
                  : workspace.searchEvidence.map((item) => (
                      <SourceCard
                        key={item.id}
                        title={item.searchEvidence.title}
                        url={item.searchEvidence.sourceUrl}
                        excerpt={item.excerpt}
                        confirmed={false}
                      />
                    ))}
                {workspace.companySources.length === 0 &&
                  workspace.searchEvidence.length === 0 && (
                    <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
                      真实来源待确认
                    </p>
                  )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
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
    <div className={advice ? 'rounded-xl bg-amber-50 p-4' : 'rounded-xl bg-brand-50/60 p-4'}>
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
            <li key={value} className="flex gap-2 text-sm leading-6 text-ink-600">
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
        <p className="text-sm font-semibold leading-5 text-ink-800">
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

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right font-medium text-ink-700">{value}</dd>
    </div>
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

function researchStatusDescription(status: CompanyResearchStatus) {
  const descriptions: Record<CompanyResearchStatus, string> = {
    NOT_STARTED: '尚未建立企业画像，当前仅保留销售机会和真实来源。',
    DRAFT: '企业资料正在整理，未确认字段继续保持待确认。',
    NEEDS_REVIEW: '企业身份已有来源支持，业务理解仍需进一步验证。',
    READY: '企业资料和研究依据已完成整理。',
    FAILED: '现有来源不足以完成企业研究。',
  }
  return descriptions[status]
}
