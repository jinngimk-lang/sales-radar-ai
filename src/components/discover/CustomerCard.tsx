import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Copy,
  MapPin,
  Clock,
  Sparkles,
  ArrowUpRight,
  Star,
  Check,
  Briefcase,
  Hash,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import type { Customer, LeadResearch } from '@/types'
import { researchLead } from '@/services/api'
import { Avatar } from '@/components/ui/Avatar'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { IntentBadge, IntentScoreBar } from '@/components/ui/IntentBadge'
import { INDUSTRY_META, CUSTOMER_TYPE_META, FOLLOW_UP_STATUS_META, RECOMMENDED_ACTION_META } from '@/data/meta'
import { scoreToLevel, cn } from '@/lib/utils'
import { useCrmRecord, useCrmActions } from '@/lib/useCrm'
import { CRMStatusBar } from '@/components/discover/CRMStatusBar'

interface CustomerCardProps {
  customer: Customer
  onGenerateEmail: (customer: Customer, channel?: 'email' | 'whatsapp' | 'linkedin') => void
}

/** 客户结果卡片：完整呈现 10 项关键信息 + CRM 跟进 */
export function CustomerCard({ customer, onGenerateEmail }: CustomerCardProps) {
  const navigate = useNavigate()
  const analysis = customer.analysis
  const level = scoreToLevel(analysis.intentScore)
  const crm = useCrmRecord(customer.id)
  const { toggleFav } = useCrmActions(customer.id)
  const [copied, setCopied] = useState(false)
  const [research, setResearch] = useState<LeadResearch | null>(null)
  const [researchVisible, setResearchVisible] = useState(false)
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchError, setResearchError] = useState<string | null>(null)

  const actionMeta = customer.recommendedAction ? RECOMMENDED_ACTION_META[customer.recommendedAction] : null
  const typeMeta = CUSTOMER_TYPE_META[customer.customerType]
  const statusMeta = FOLLOW_UP_STATUS_META[crm.followUpStatus]

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(customer.sourceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleResearch = async () => {
    if (researchLoading) return
    if (research) {
      setResearchVisible((visible) => !visible)
      return
    }
    setResearchLoading(true)
    setResearchError(null)
    try {
      setResearch(await researchLead(customer.id))
      setResearchVisible(true)
    } catch (error) {
      setResearchError(
        error instanceof Error ? error.message : 'AI 客户分析失败',
      )
    } finally {
      setResearchLoading(false)
    }
  }

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
      onClick={() => navigate(`/app/customer/${customer.id}`)}
    >
      {/* 左上角收藏按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleFav()
        }}
        className={cn(
          'absolute right-4 top-4 rounded-lg p-1.5 transition-all',
          crm.isFavorited
            ? 'text-amber-500 opacity-100'
            : 'text-ink-300 opacity-0 hover:bg-ink-100 hover:text-ink-500 group-hover:opacity-100',
        )}
        aria-label={crm.isFavorited ? '取消收藏' : '收藏'}
      >
        <Star className={cn('h-4 w-4', crm.isFavorited && 'fill-amber-400')} />
      </button>

      {/* ===== 1. 头部：平台 / 用户名 / 地区 / 时间 ===== */}
      <div className="flex items-start gap-3 pr-8">
        <Avatar initials={customer.initials} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-ink-900">{customer.displayName}</h3>
            <PlatformIcon platform={customer.platform} className="h-4 w-4 shrink-0" />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
            <span className="font-mono">@{customer.username}</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {customer.country}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {customer.postedAt}
            </span>
          </div>
          {/* 职位 / 公司（若有） */}
          {(customer.jobTitle || customer.company) && (
            <div className="mt-1 flex items-center gap-1 text-xs text-ink-400">
              <Briefcase className="h-3 w-3" />
              {[customer.jobTitle, customer.company].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <IntentBadge level={level} />
      </div>

      {/* ===== 2. 元信息条：客户类型 + 行业 + 跟进状态 ===== */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          {typeMeta.label}
        </span>
        <span className="chip bg-ink-50 text-ink-600">
          {INDUSTRY_META[customer.industry].label}
        </span>
        <span className={cn('chip', statusMeta.color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dotClass)} />
          {statusMeta.label}
        </span>
      </div>

      {/* ===== 3. 原始内容 ===== */}
      <div className="mt-3 rounded-xl bg-ink-50 px-4 py-3">
        <p className="text-sm leading-relaxed text-ink-700 line-clamp-3">
          {customer.postContent}
        </p>
      </div>

      {/* ===== 4. AI 分析区：评分 + 关键词 + 判断原因 ===== */}
      <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI 分析
          </div>
          <div className="text-xs text-ink-400">
            评分 <span className="font-bold text-ink-900">{analysis.intentScore}</span>/100
          </div>
        </div>

        <IntentScoreBar score={analysis.intentScore} className="mt-2.5" />

        {/* 需求关键词 */}
        {analysis.needKeywords && analysis.needKeywords.length > 0 && (
          <div className="mt-3">
            <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
              <Hash className="h-3 w-3" />
              需求关键词
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {analysis.needKeywords.slice(0, 5).map((kw) => (
                <span key={kw} className="chip bg-white text-brand-600 ring-1 ring-brand-100">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI 判断原因 */}
        {analysis.reasoning && (
          <div className="mt-3 rounded-lg bg-white/70 p-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">AI 判断原因</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{analysis.reasoning}</p>
          </div>
        )}
      </div>

      {/* ===== 5. AI 推荐行动（高亮 CTA） ===== */}
      {actionMeta && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs ring-1',
            actionMeta.color,
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold">推荐行动 · {actionMeta.label}</span>
            <span className="ml-1.5 opacity-70">{actionMeta.desc}</span>
          </div>
        </div>
      )}

      {((research && researchVisible) || researchError) && (
        <div className="mt-3 rounded-xl border border-brand-100 bg-white p-4">
          {researchError ? (
            <p className="text-xs text-red-600">{researchError}</p>
          ) : research ? (
            <div className="space-y-2 text-xs text-ink-600">
              <p><span className="font-semibold text-ink-800">客户画像：</span>{research.customerPersona}</p>
              <p>
                <span className="font-semibold text-ink-800">行业：</span>{research.industry}
                {' · '}
                <span className="font-semibold text-ink-800">客户类型：</span>{research.companyType}
              </p>
              <p>
                <span className="font-semibold text-ink-800">潜在痛点：</span>
                {research.painPoints.length ? research.painPoints.join('、') : 'Unknown'}
              </p>
              <p>
                <span className="font-semibold text-ink-800">购买信号：</span>
                {research.buyingSignals.length ? research.buyingSignals.join('、') : 'Unknown'}
              </p>
              <p><span className="font-semibold text-ink-800">沟通策略：</span>{research.recommendedApproach}</p>
              <p>
                <span className="font-semibold text-ink-800">销售价值：</span>
                {research.leadQuality === 'high' ? '高' : research.leadQuality === 'medium' ? '中' : '低'}
                {' · '}
                <span className="font-semibold text-ink-800">客户类别：</span>{research.leadCategory}
              </p>
              <p><span className="font-semibold text-ink-800">判断原因：</span>{research.qualityReason}</p>
              <p><span className="font-semibold text-ink-800">下一步：</span>{research.salesRecommendation}</p>
              <p>
                <span className="font-semibold text-ink-800">销售建议：</span>
                客户类型 {research.companyProfile.companyType}
                {' · '}优先级 {research.priority}
              </p>
              <p>
                <span className="font-semibold text-ink-800">购买信号：</span>
                {research.buyingSignalDetails.length
                  ? research.buyingSignalDetails.map((item) => item.signal).join('、')
                  : 'Unknown'}
              </p>
              <p>
                <span className="font-semibold text-ink-800">推荐切入点：</span>
                {research.salesAngle.firstMessageHook}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* ===== 6. 操作栏 ===== */}
      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => window.open(customer.sourceUrl, '_blank')}
          className="btn-ghost px-2.5 py-1.5 text-xs"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          来源
        </button>
        <button
          onClick={() => window.open(customer.profileUrl, '_blank')}
          className="btn-ghost px-2.5 py-1.5 text-xs"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          主页
        </button>
        <button onClick={handleCopyLink} className="btn-ghost px-2.5 py-1.5 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
        <button
          onClick={handleResearch}
          disabled={researchLoading}
          className="btn-ghost px-2.5 py-1.5 text-xs disabled:cursor-wait disabled:opacity-60"
        >
          {researchLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {researchLoading ? '正在分析客户...' : research ? '查看AI洞察' : 'AI分析客户'}
        </button>
        <button
          onClick={() => onGenerateEmail(customer, 'email')}
          className="ml-auto btn-primary px-3 py-1.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          生成开发信
        </button>
      </div>

      {/* ===== 7. CRM 跟进状态条 ===== */}
      <CRMStatusBar customerId={customer.id} className="mt-3 border-t border-ink-100 pt-3" />
    </article>
  )
}

/** 加载骨架屏 */
export function CustomerCardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-ink-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-ink-200" />
          <div className="h-3 w-48 rounded bg-ink-100" />
        </div>
      </div>
      <div className="mt-4 h-20 rounded-xl bg-ink-100" />
      <div className="mt-4 h-32 rounded-xl bg-ink-100" />
      <div className="mt-4 h-8 rounded-xl bg-ink-100" />
    </div>
  )
}
