import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronDown,
  Compass,
  Link2,
  ShieldCheck,
  Target,
} from 'lucide-react'
import type {
  RadarAssessment,
  RadarAssessmentDecision,
  RadarEntityRole,
  RadarRecommendedAction,
  RadarRiskLevel,
} from '@/types'
import { cn } from '@/lib/utils'
import { resolveSourcePlatform } from '@/lib/sourcePlatform'

const ROLE_LABELS: Record<RadarEntityRole, string> = {
  END_CUSTOMER: '客户',
  SUPPLIER: '供应商',
  PARTNER: '合作伙伴',
  DISTRIBUTOR: '分销商',
  COMPETITOR: '竞争对手',
  UNKNOWN: '未知',
}

const DECISION_META: Record<
  RadarAssessmentDecision,
  { label: string; className: string }
> = {
  OPPORTUNITY_CREATED: {
    label: '🔥 机会',
    className: 'border-brand-200 bg-brand-50 text-brand-800',
  },
  POTENTIAL_OPPORTUNITY: {
    label: '🟡 潜在机会',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  MARKET_SIGNAL_ONLY: {
    label: '🔵 市场信号',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  NEEDS_REVIEW: {
    label: '⚪ 待确认',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  BLOCKED: {
    label: '⚪ 待确认',
    className: 'border-ink-200 bg-ink-50 text-ink-600',
  },
}

const RISK_META: Record<
  RadarRiskLevel,
  { description: string; className: string }
> = {
  LOW: {
    description: '信息较充分',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  MEDIUM: {
    description: '存在部分待确认信息',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  HIGH: {
    description: '需要人工进一步确认',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
}

const ACTION_LABELS: Record<RadarRecommendedAction, string> = {
  CONTACT_RESEARCH: '进一步研究企业与相关部门',
  VERIFY_ENTITY: '核实企业主体和来源关系',
  VERIFY_ROLE: '确认企业在本次搜索中的角色',
  CHECK_PARTNERSHIP: '核实合作方式和业务范围',
  MONITOR_SIGNAL: '持续关注后续市场变化',
  REVIEW_SOURCE: '回到原始来源核对信息',
  NO_ACTION: '暂不采取销售行动',
}

const REASON_LABELS: Record<string, string> = {
  REAL_SOURCE_AVAILABLE: '已关联真实来源',
  EVIDENCE_CONTENT_SUFFICIENT: '来源正文足以支持进一步判断',
  EVIDENCE_TIMESTAMP_AVAILABLE: '来源包含时间信息',
  INVESTMENT_SIGNAL: '发现企业投资信号',
  NEW_FACTORY_SIGNAL: '发现新工厂建设信号',
  FACTORY_EXPANSION_SIGNAL: '发现工厂或产能扩张信号',
  AUTOMATION_UPGRADE_SIGNAL: '发现自动化升级信号',
  DIGITAL_UPGRADE_SIGNAL: '发现数字化升级信号',
  BODY_EVENT_CONFIRMED: '企业变化信号已在正文中确认',
  TITLE_EVENT_CORROBORATED: '标题与正文中的企业变化相互印证',
  PRODUCT_FAMILY_MATCH: '企业变化与当前产品方向相关',
  TARGET_INDUSTRY_MATCH: '企业所属方向与目标行业相关',
  PRODUCT_CONTEXT_MATCH: '来源内容与当前产品方向相关',
  REGION_CONTEXT_MATCH: '来源地区与目标市场相关',
  EXPLICIT_COMPANY_IDENTITY: '来源明确提供企业主体',
  IDENTITY_NEEDS_REVIEW: '企业主体仍需进一步确认',
  ENTITY_ROLE_END_CUSTOMER: '识别为目标客户角色',
  ENTITY_ROLE_SUPPLIER: '识别为供应商角色',
  ENTITY_ROLE_PARTNER: '识别为合作伙伴角色',
  ENTITY_ROLE_DISTRIBUTOR: '识别为分销或渠道角色',
  ENTITY_ROLE_COMPETITOR: '识别为同类市场参与者',
  ENTITY_ROLE_UNKNOWN: '企业角色仍待确认',
  TARGET_ROLE_MATCH: '企业角色与当前销售目标匹配',
  TARGET_ROLE_UNKNOWN: '销售目标或企业角色尚未完全确认',
  TARGET_ROLE_MISMATCH: '企业角色与当前销售目标不匹配',
  SUPPLIER_PAGE_BLOCKED: '供应商页面不作为买家机会',
  MOCK_SOURCE_BLOCKED: '模拟来源不能形成销售判断',
  INVALID_SOURCE_URL: '来源链接需要核对',
  EVIDENCE_CONTENT_INSUFFICIENT: '来源正文不足，无法支持判断',
  PRODUCT_CONTEXT_MISSING: '缺少本次搜索的产品上下文',
  BODY_EVENT_MISSING: '正文中没有明确企业变化信号',
  PRODUCT_RELEVANCE_INSUFFICIENT: '与当前产品方向的相关性不足',
  OPPORTUNITY_SCORE_INSUFFICIENT: '综合评分不足，保留为研究信息',
  USER_GOAL_BUYER: '本次搜索目标是寻找客户',
  USER_GOAL_SUPPLIER: '本次搜索目标是寻找供应商',
  USER_GOAL_PARTNER: '本次搜索目标是寻找合作伙伴',
  USER_GOAL_DISTRIBUTOR: '本次搜索目标是寻找分销渠道',
  USER_GOAL_COMPETITOR: '本次搜索目标是研究竞争对手',
  USER_GOAL_MARKET_EXPLORATION: '本次搜索目标是探索市场',
  USER_GOAL_UNKNOWN: '本次搜索目标仍待确认',
  USER_INTENT_MATCH: '企业角色与本次搜索目标匹配',
  USER_INTENT_MISMATCH: '企业角色与本次搜索目标不完全匹配',
  USER_INTENT_NEEDS_REVIEW: '搜索目标匹配关系需要进一步判断',
  EVIDENCE_STATUS_VALID: '来源信息已通过当前证据检查',
  EVIDENCE_STATUS_REJECTED: '来源信息未通过当前证据检查',
  IDENTITY_STATUS_VERIFIED: '企业主体已通过当前身份检查',
  TITLE_ONLY_EVENT_BLOCKED: '事件只出现在标题，正文尚未支持',
  MARKET_SIGNAL_RETAINED: '保留为可继续观察的市场信息',
  ENTITY_VERIFICATION_REQUIRED: '企业主体需要确认',
  ROLE_VERIFICATION_REQUIRED: '企业角色需要确认',
}

export function RadarAssessmentCard({
  assessment,
}: {
  assessment: RadarAssessment
}) {
  const decision = DECISION_META[assessment.decision]
  const risk = RISK_META[assessment.riskLevel]
  const companyName =
    assessment.evidence.companyName || '企业主体待确认'
  const sourceHost = sourceHostname(assessment.evidence.rawUrl)
  const sourcePlatform = resolveSourcePlatform(
    assessment.evidence.rawUrl,
    assessment.evidence.platform,
  )
  const scoreItems = getScoreItems(assessment)

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card transition duration-200 hover:border-ink-300 hover:shadow-card-hover">
      <header className="border-b border-ink-100 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                decision.className,
              )}
            >
              {decision.label}
            </span>
            <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-700">
              {ROLE_LABELS[assessment.entityRole]}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
              来源 · {sourcePlatform.label}
            </span>
          </div>
          <div className="text-right">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                risk.className,
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {assessment.riskLevel}
            </span>
            <p className="mt-1 text-[10px] text-ink-500">
              {risk.description}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-600">
            <Building2 className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              企业主体 · {ROLE_LABELS[assessment.entityRole]}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink-900">
              {companyName}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-600">
              {assessment.evidence.title || '来源标题待确认'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ScoreMetric
            icon={Target}
            label="匹配度"
            value={assessment.matchScore}
            description="与当前搜索目标的相关程度"
            barClassName="bg-brand-600"
          />
          <ScoreMetric
            icon={ShieldCheck}
            label="可信度"
            value={assessment.confidenceScore}
            description="来源和信息确认程度"
            barClassName="bg-violet-600"
          />
        </div>

        <section className="mt-4 rounded-2xl border border-ink-200 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-800">
            <Compass className="h-3.5 w-3.5 text-brand-600" />
            建议下一步
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            {ACTION_LABELS[assessment.recommendedAction]}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-ink-500">
            这是销售研究建议，不代表企业已经产生采购行为。
          </p>
        </section>

        <section className="mt-3 rounded-2xl border border-dashed border-ink-300 p-4">
          <p className="text-xs font-semibold text-ink-800">
            需要用户判断
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-600">
            {verificationText(assessment)}
          </p>
        </section>

        <details className="group mt-3 rounded-2xl border border-ink-200 bg-ink-50/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-ink-800">
            <span>为什么这样判断</span>
            <span className="flex items-center gap-2 text-[11px] font-medium text-ink-500">
              {assessment.reasonCodes.length} 项依据
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-ink-200 px-4 py-3">
            {assessment.reasonCodes.length > 0 ? (
              <ul className="space-y-3">
                {assessment.reasonCodes.map((code) => (
                  <li key={code} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    <span className="min-w-0">
                      <span className="block text-xs leading-5 text-ink-700">
                        {REASON_LABELS[code] || '系统记录的判断依据'}
                      </span>
                      <code className="mt-0.5 block break-all text-[10px] text-ink-400">
                        {code}
                      </code>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-5 text-ink-500">
                当前没有可展示的判断原因。
              </p>
            )}
          </div>
        </details>

        <details className="group mt-3 rounded-2xl border border-ink-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-ink-800">
            <span>评分组成</span>
            <span className="flex items-center gap-2 text-[11px] font-medium text-ink-500">
              读取已有贡献分
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="grid gap-2 border-t border-ink-200 p-3 sm:grid-cols-2">
            {scoreItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3 py-2.5"
              >
                <span className="text-[11px] text-ink-600">
                  {item.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-ink-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </details>

        <footer className="mt-4 border-t border-ink-100 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                <Link2 className="h-3.5 w-3.5" />
                真实来源
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-ink-800">
                {sourceHost || assessment.evidence.provider}
              </p>
              <p className="mt-1 text-[11px] text-ink-500">
                来源平台：{sourcePlatform.label}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-500">
                <CalendarDays className="h-3 w-3" />
                {assessment.evidence.publishedAt
                  ? `发布时间 ${formatDate(assessment.evidence.publishedAt)}`
                  : `收录时间 ${formatDate(assessment.evidence.createdAt)}`}
              </p>
              <a
                href={assessment.evidence.rawUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all text-[11px] leading-5 text-brand-700 hover:underline"
              >
                {assessment.evidence.rawUrl}
              </a>
            </div>
            <a
              href={assessment.evidence.rawUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="打开真实来源"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </footer>
      </div>
    </article>
  )
}

function ScoreMetric({
  icon: Icon,
  label,
  value,
  description,
  barClassName,
}: {
  icon: typeof Target
  label: string
  value: number
  description: string
  barClassName: string
}) {
  const displayValue = formatScore(value)

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
          <Icon className="h-3.5 w-3.5 text-brand-600" />
          {label}
        </span>
        <strong className="text-lg font-semibold tabular-nums text-ink-950">
          {displayValue} <span className="text-xs text-ink-400">/ 100</span>
        </strong>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <span
          className={cn('block h-full rounded-full', barClassName)}
          style={{ width: `${displayValue}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-ink-500">
        {description}
      </p>
    </div>
  )
}

function getScoreItems(assessment: RadarAssessment) {
  const { confidence, match } = assessment.scoreBreakdown

  return [
    { label: 'Evidence Quality · 证据质量', value: confidence.evidenceQuality },
    { label: 'Event Signal · 事件信号', value: confidence.eventSignal },
    {
      label: 'Product Relevance · 产品相关',
      value: match.productRelevance,
    },
    {
      label: 'Identity Confidence · 身份可信',
      value: confidence.identityConfidence,
    },
    { label: 'Role Fit · 角色匹配', value: match.entityRoleFit },
    { label: 'User Intent Fit · 目标匹配', value: match.userIntentFit },
    { label: 'Event Relevance · 事件相关', value: match.eventRelevance },
  ]
}

function verificationText(assessment: RadarAssessment) {
  if (assessment.decision === 'BLOCKED') {
    return '核对来源正文、企业主体和事件关系，再决定是否继续研究。'
  }
  if (assessment.entityRole === 'UNKNOWN') {
    return '企业主体及其在本次搜索中的角色仍待确认。'
  }
  if (assessment.decision === 'POTENTIAL_OPPORTUNITY') {
    return '确认企业变化的阶段，以及它是否与当前产品方向存在实际业务关联。'
  }
  if (assessment.decision === 'MARKET_SIGNAL_ONLY') {
    return '确认这条市场变化是否能够形成可行动的企业机会。'
  }
  if (assessment.decision === 'NEEDS_REVIEW') {
    return '核对正文、企业主体和事件关系，避免将标题或一般介绍当作事实。'
  }
  return '确认项目阶段、相关部门和实际需求；当前结果不代表采购事实。'
}

function sourceHostname(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待确认'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}
