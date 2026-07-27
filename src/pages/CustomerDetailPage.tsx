import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  Mail,
  MessageCircle,
  Linkedin,
  Copy,
  Loader2,
  Building2,
  Target,
  TrendingUp,
  Lightbulb,
  ShieldCheck,
  Star,
  Calendar,
  Tag as TagIcon,
  StickyNote,
  X,
  Phone,
  Users,
  Network,
} from 'lucide-react'
import type {
  ChannelProfile,
  LeadResearch,
  ProductProfile,
  ContactProfile,
  Customer,
  OutreachChannel,
  FollowUpStep,
} from '@/types'
import {
  discoverContacts,
  discoverChannel,
  generateFollowUpPlan,
  generateOutreach,
  getRankedContacts,
  getCustomerById,
  getChannelProfile,
  getLeadResearch,
  getProductProfiles,
  rankContacts,
  researchLead,
} from '@/services/api'
import { Avatar } from '@/components/ui/Avatar'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { IntentBadge, IntentScoreBar } from '@/components/ui/IntentBadge'
import { Modal } from '@/components/ui/Modal'
import {
  INDUSTRY_META,
  CUSTOMER_TYPE_META,
  RECOMMENDED_ACTION_META,
} from '@/data/meta'
import { scoreToLevel, intentLevelMeta, cn } from '@/lib/utils'
import { useCrmRecord, useCrmActions } from '@/lib/useCrm'
import { CRMStatusBar } from '@/components/discover/CRMStatusBar'

type Channel = OutreachChannel

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Mail; color: string }> = {
  email: { label: '生成邮件', icon: Mail, color: 'bg-brand-600 hover:bg-brand-700' },
  whatsapp: { label: 'WhatsApp 消息', icon: MessageCircle, color: 'bg-emerald-600 hover:bg-emerald-700' },
  linkedin: { label: 'LinkedIn 私信', icon: Linkedin, color: 'bg-[#0A66C2] hover:bg-[#0a4f9a]' },
  call: { label: '电话话术', icon: Phone, color: 'bg-ink-700 hover:bg-ink-800' },
}

const PROBABILITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

const CHANNEL_LABEL: Record<FollowUpStep['channel'], string> = {
  email: '邮件',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  call: '电话',
}

/** 客户详情页 */
export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ channel: Channel; content: string; loading: boolean } | null>(null)
  const [followUpPlan, setFollowUpPlan] = useState<FollowUpStep[] | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [contacts, setContacts] = useState<ContactProfile[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string>()
  const [channelProfile, setChannelProfile] = useState<ChannelProfile | null>(
    null,
  )
  const [channelLoading, setChannelLoading] = useState(false)
  const [leadResearchResult, setLeadResearchResult] =
    useState<LeadResearch | null>(null)
  const [leadResearchLoading, setLeadResearchLoading] = useState(false)
  const [researchProducts, setResearchProducts] = useState<ProductProfile[]>([])
  const [researchProductId, setResearchProductId] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCustomerById(id).then((data) => {
      setCustomer(data || null)
      setLoading(false)
    })
    getRankedContacts(id)
      .then((ranked) => {
        setContacts(ranked)
        setSelectedContactId(
          ranked.find(
            (contact) =>
              contact.priorityRank === 1 && contact.name !== 'Unknown',
          )?.id,
        )
      })
      .catch(() => setContacts([]))
    getChannelProfile(id)
      .then(setChannelProfile)
      .catch(() => setChannelProfile(null))
    getLeadResearch(id)
      .then(setLeadResearchResult)
      .catch(() => setLeadResearchResult(null))
    getProductProfiles()
      .then((products) => {
        setResearchProducts(products)
        setResearchProductId((current) => current || products[0]?.id || '')
      })
      .catch(() => setResearchProducts([]))
  }, [id])

  const handleDiscoverContacts = async () => {
    if (!customer || contactsLoading) return
    setContactsLoading(true)
    try {
      const discovered = await discoverContacts(customer.id)
      setContacts(discovered)
      const firstVerified = discovered.find((contact) => contact.name !== 'Unknown')
      setSelectedContactId(firstVerified?.id)
    } finally {
      setContactsLoading(false)
    }
  }

  const handleRankContacts = async () => {
    if (!customer || contactsLoading) return
    setContactsLoading(true)
    try {
      const ranked = await rankContacts(customer.id)
      setContacts(ranked)
      setSelectedContactId(
        ranked.find(
          (contact) =>
            contact.priorityRank === 1 && contact.name !== 'Unknown',
        )?.id,
      )
    } finally {
      setContactsLoading(false)
    }
  }

  const handleDiscoverChannel = async () => {
    if (!customer || channelLoading) return
    setChannelLoading(true)
    try {
      setChannelProfile(await discoverChannel(customer.id))
    } finally {
      setChannelLoading(false)
    }
  }

  const handleGenerateChannelOutreach = async () => {
    if (!customer) return
    setModal({ channel: 'email', content: '', loading: true })
    const content = await generateOutreach(
      customer.id,
      'email',
      selectedContactId,
      'channel',
    )
    setModal({ channel: 'email', content, loading: false })
  }

  const handleLeadResearch = async () => {
    if (!customer || leadResearchLoading) return
    setLeadResearchLoading(true)
    try {
      setLeadResearchResult(
        await researchLead(customer.id, researchProductId || undefined),
      )
    } finally {
      setLeadResearchLoading(false)
    }
  }

  const handleGenerate = async (channel: Channel) => {
    if (!customer) return
    setModal({ channel, content: '', loading: true })
    const content = await generateOutreach(
      customer.id,
      channel,
      selectedContactId,
    )
    setModal({ channel, content, loading: false })
  }

  const handleGeneratePlan = async () => {
    if (!customer || planLoading) return
    setPlanLoading(true)
    const plan = await generateFollowUpPlan(customer.id, selectedContactId)
    setFollowUpPlan(plan)
    setPlanLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-ink-500">未找到该客户</p>
        <Link to="/app/discover" className="btn-primary mt-4">
          返回客户搜索
        </Link>
      </div>
    )
  }

  const analysis = customer.analysis
  const level = scoreToLevel(analysis.intentScore)
  const probMeta = intentLevelMeta[analysis.purchaseProbability]
  const actionMeta = customer.recommendedAction ? RECOMMENDED_ACTION_META[customer.recommendedAction] : null
  const typeMeta = CUSTOMER_TYPE_META[customer.customerType]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 返回 */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        返回结果列表
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ===== 主列 ===== */}
        <div className="min-w-0 space-y-6">
          {/* 客户信息卡 */}
          <div className="card overflow-hidden">
            <div className="border-b border-ink-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <Avatar initials={customer.initials} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-ink-900">{customer.displayName}</h1>
                      <PlatformIcon platform={customer.platform} className="h-5 w-5" />
                    </div>
                    <p className="mt-1 font-mono text-sm text-ink-500">@{customer.username}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
                      <span className="flex items-center gap-1">
                        <PlatformIcon platform={customer.platform} className="h-3.5 w-3.5" />
                        {customer.platform}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {customer.country}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {INDUSTRY_META[customer.industry].label}
                      </span>
                      <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-600">
                        {typeMeta.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <IntentBadge level={level} />
                </div>
              </div>

              {/* AI 推荐行动高亮条 */}
              {actionMeta && (
                <div className={cn('mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ring-1', actionMeta.color)}>
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-semibold">推荐行动 · {actionMeta.label}</span>
                    <span className="ml-1.5 opacity-75">{actionMeta.desc}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 原始内容 */}
            <div className="p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
                <MessageCircle className="h-4 w-4" />
                原始内容
              </h2>
              <div className="mt-3 rounded-xl bg-ink-50 px-5 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-ink-400">
                  <Clock className="h-3 w-3" />
                  {customer.postedAt}
                </div>
                <p className="leading-relaxed text-ink-800">{customer.postContent}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => window.open(customer.sourceUrl, '_blank')}
                  className="btn-ghost text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  查看原始帖子
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(customer.postContent)}
                  className="btn-ghost text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制内容
                </button>
              </div>
            </div>
          </div>

          {/* AI 分析区 */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-100 bg-brand-50/40 px-6 py-4">
              <Sparkles className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-semibold text-ink-900">AI 深度分析</h2>
            </div>

            <div className="grid gap-px bg-ink-100 sm:grid-cols-2">
              <AnalysisCell icon={Building2} label="客户背景" value={analysis.background} />
              <AnalysisCell icon={Target} label="核心需求" value={analysis.need} />
              <AnalysisCell
                icon={TrendingUp}
                label="购买概率"
                value={
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', probMeta.dot)} />
                    {PROBABILITY_LABEL[analysis.purchaseProbability]} ({analysis.purchaseProbability})
                  </span>
                }
              />
              <AnalysisCell icon={Lightbulb} label="推荐销售策略" value={analysis.salesStrategy} />
            </div>

            {/* 意向评分 */}
            <div className="border-t border-ink-100 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">购买意向评分</p>
              <IntentScoreBar score={analysis.intentScore} className="mt-2 max-w-md" />
              {analysis.needKeywords && analysis.needKeywords.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">需求关键词</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {analysis.needKeywords.map((kw) => (
                      <span key={kw} className="chip bg-brand-50 text-brand-700">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {analysis.tags.map((tag) => (
                  <span key={tag} className="chip bg-ink-50 text-ink-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 销售触达 + 跟进计划 */}
          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-ink-900">
                  Lead Research
                </h2>
              </div>
              <button
                onClick={handleLeadResearch}
                disabled={leadResearchLoading}
                className="btn-secondary text-xs"
              >
                {leadResearchLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {leadResearchResult?.generatedAt ? '重新研究' : 'AI研究客户'}
              </button>
            </div>
            {researchProducts.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-600">
                <label htmlFor="lead-research-product" className="font-semibold">
                  对比产品：
                </label>
                <select
                  id="lead-research-product"
                  value={researchProductId}
                  onChange={(event) => setResearchProductId(event.target.value)}
                  className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-800 focus:border-brand-400 focus:outline-none"
                >
                  {researchProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {leadResearchResult?.matchScore != null ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                    AI匹配评分
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-700">
                    {leadResearchResult.matchScore}/100
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    购买可能性：{leadResearchResult.purchaseLikelihood ?? 'Unknown'}
                  </p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs font-semibold text-ink-500">
                    为什么值得联系
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">
                    {leadResearchResult.contactReason ?? 'Unknown'}
                  </p>
                </div>
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-xs font-semibold text-ink-500">
                    推荐销售角度
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">
                    {leadResearchResult.recommendedAngle ?? 'Unknown'}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50/60 p-4 ring-1 ring-amber-100">
                  <p className="text-xs font-semibold text-amber-700">
                    风险提醒
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-amber-900">
                    {(leadResearchResult.riskFactors?.length
                      ? leadResearchResult.riskFactors
                      : ['Unknown']
                    ).map((risk) => (
                      <li key={risk}>· {risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-ink-50 p-3 text-sm text-ink-400">
                尚未生成结构化客户研究。AI只会使用现有 Lead 和产品证据。
              </p>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-ink-900">渠道分析</h2>
              </div>
              <button
                onClick={handleDiscoverChannel}
                disabled={channelLoading}
                className="btn-secondary text-xs"
              >
                {channelLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {channelProfile ? '重新分析' : '分析渠道价值'}
              </button>
            </div>
            {channelProfile ? (
              <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip bg-violet-50 text-violet-700">
                    {channelProfile.channelType}
                  </span>
                  <span className="text-sm font-semibold text-ink-900">
                    渠道评分 {channelProfile.channelScore}/100
                  </span>
                  <span className="text-xs text-ink-400">
                    可信度 {channelProfile.confidence}%
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">
                  {channelProfile.recommendationReason}
                </p>
                <div className="mt-3 rounded-lg bg-white p-3 text-sm text-ink-600 ring-1 ring-ink-100">
                  <span className="font-semibold text-ink-800">合作方式：</span>
                  {channelProfile.cooperationStrategy}
                </div>
                {channelProfile.channelType !== 'unknown' && (
                  <button
                    onClick={handleGenerateChannelOutreach}
                    className="btn-primary mt-3 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    生成渠道合作邀请
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-ink-50 p-3 text-sm text-ink-400">
                尚未分析渠道价值。系统不会虚构代理身份或销售网络。
              </p>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-ink-900">关键联系人</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDiscoverContacts}
                  disabled={contactsLoading}
                  className="btn-secondary text-xs"
                >
                  {contactsLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {contacts.length > 0 ? '刷新联系人' : '发现联系人'}
                </button>
                {contacts.length > 0 && (
                  <button
                    onClick={handleRankContacts}
                    disabled={contactsLoading}
                    className="btn-primary text-xs"
                  >
                    推荐排序
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              仅展示来源中可验证的信息；选择联系人后，销售触达将匹配其职责重点。
            </p>
            {contacts.length > 0 ? (
              <div className="mt-4 space-y-2">
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                      selectedContactId === contact.id
                        ? 'border-brand-300 bg-brand-50/60'
                        : 'border-ink-100 bg-ink-50/40 hover:border-ink-200',
                    )}
                  >
                    <input
                      type="radio"
                      name="outreach-contact"
                      className="mt-1"
                      checked={selectedContactId === contact.id}
                      disabled={contact.name === 'Unknown'}
                      onChange={() => setSelectedContactId(contact.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        {contact.priorityRank != null && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {contact.priorityRank}
                          </span>
                        )}
                        <span className="font-semibold text-ink-900">
                          {contact.name}
                        </span>
                        <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                          {contact.contactRole}
                        </span>
                        <span className="text-xs text-ink-400">
                          可信度 {contact.confidence}%
                        </span>
                        {contact.contactScore != null && (
                          <span className="text-xs font-semibold text-brand-700">
                            联系评分 {contact.contactScore}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-ink-600">
                        {contact.jobTitle} · {contact.company}
                      </span>
                      <span className="mt-1 block truncate text-xs text-ink-400">
                        来源：{contact.source}
                      </span>
                      {contact.recommendationReason && (
                        <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                          推荐原因：{contact.recommendationReason}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-ink-50 p-3 text-sm text-ink-400">
                尚未发现联系人。系统不会根据公司名称猜测姓名或联系方式。
              </p>
            )}
          </div>

          {/* 销售触达 + 跟进计划 */}
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-ink-900">一键生成销售触达</h2>
            </div>
            <p className="mt-1 text-sm text-ink-500">
              基于客户背景与需求，AI 自动生成多渠道开发话术
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(Object.keys(CHANNEL_META) as Channel[]).map((ch) => {
                const meta = CHANNEL_META[ch]
                return (
                  <button
                    key={ch}
                    onClick={() => handleGenerate(ch)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]',
                      meta.color,
                    )}
                  >
                    <meta.icon className="h-4 w-4" />
                    {meta.label}
                  </button>
                )
              })}
            </div>

            {/* AI 跟进计划 */}
            <div className="mt-6 border-t border-ink-100 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-ink-900">AI 跟进计划</h3>
                </div>
                <button onClick={handleGeneratePlan} disabled={planLoading} className="btn-secondary text-xs">
                  {planLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {followUpPlan ? '重新生成' : '生成计划'}
                </button>
              </div>

              {followUpPlan ? (
                <ol className="mt-4 space-y-2">
                  {followUpPlan.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {step.day}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-ink-400">第 {step.day} 天</span>
                          <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                            {step.channel === 'call' ? (
                              <Phone className="h-3 w-3" />
                            ) : (
                              (() => {
                                const Icon = CHANNEL_META[step.channel as Channel]?.icon
                                return Icon ? <Icon className="h-3 w-3" /> : null
                              })()
                            )}
                            {CHANNEL_LABEL[step.channel]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-700">{step.action}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-ink-400">
                  点击「生成计划」，AI 将基于客户意向等级，制定多渠道、分时间节点的跟进节奏。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ===== 侧栏：CRM 面板 ===== */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <CrmPanel customerId={customer.id} customerName={customer.displayName} />
        </aside>
      </div>

      {/* 生成结果弹窗 */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `${CHANNEL_META[modal.channel].label} · 话术草稿` : ''}
        description={customer.displayName}
      >
        {modal?.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <span className="ml-3 text-sm text-ink-500">AI 正在生成...</span>
          </div>
        ) : (
          modal && (
            <div className="space-y-4">
              <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-700">
                  {modal.content}
                </pre>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-400">AI 生成内容，发送前请审阅修改</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(modal.content)}
                  className="btn-secondary"
                >
                  <Copy className="h-4 w-4" />
                  复制
                </button>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  )
}

/** 侧栏 CRM 面板：收藏 / 状态 / 标签 / 备注 */
function CrmPanel({ customerId, customerName }: { customerId: string; customerName: string }) {
  const crm = useCrmRecord(customerId)
  const { toggleFav, addTag, removeTag, updateNote } = useCrmActions(customerId)
  const [tagInput, setTagInput] = useState('')
  const [noteInput, setNoteInput] = useState(crm.note ?? '')

  useEffect(() => {
    setNoteInput(crm.note ?? '')
  }, [crm.note])

  const handleAddTag = () => {
    if (!tagInput.trim()) return
    addTag(tagInput)
    setTagInput('')
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          CRM 跟进
        </h3>
        <button
          onClick={toggleFav}
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
            crm.isFavorited ? 'bg-amber-50 text-amber-700' : 'text-ink-500 hover:bg-ink-100',
          )}
        >
          <Star className={cn('h-3.5 w-3.5', crm.isFavorited && 'fill-amber-400 text-amber-500')} />
          {crm.isFavorited ? '已收藏' : '收藏'}
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* 跟进状态 */}
        <CRMStatusBar customerId={customerId} variant="full" />

        {/* 自定义标签 */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <TagIcon className="h-3.5 w-3.5" />
            自定义标签
          </p>
          {crm.customTags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {crm.customTags.map((tag) => (
                <span
                  key={tag}
                  className="chip flex items-center gap-1 bg-brand-50 text-brand-700"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-brand-400 hover:text-brand-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="添加标签，如「重点客户」"
              className="flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
            />
            <button onClick={handleAddTag} className="btn-secondary px-2.5 py-1.5 text-xs">
              添加
            </button>
          </div>
        </div>

        {/* 备注 */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <StickyNote className="h-3.5 w-3.5" />
            销售备注
          </p>
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onBlur={() => updateNote(noteInput)}
            placeholder={`记录关于 ${customerName} 的沟通要点...`}
            rows={4}
            className="w-full resize-none rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
          />
          <p className="mt-1 text-[11px] text-ink-400">失焦自动保存</p>
        </div>

        {/* 时间戳 */}
        <div className="border-t border-ink-100 pt-3 text-[11px] text-ink-400">
          {crm.lastContactedAt && (
            <p>最近联系：{new Date(crm.lastContactedAt).toLocaleString('zh-CN')}</p>
          )}
          <p>最后更新：{new Date(crm.updatedAt).toLocaleString('zh-CN')}</p>
        </div>
      </div>
    </div>
  )
}

function AnalysisCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-ink-900">{value}</div>
    </div>
  )
}
