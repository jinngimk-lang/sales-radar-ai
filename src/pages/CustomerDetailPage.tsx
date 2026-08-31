import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import type {
  ContactProfile,
  Customer,
  LeadOutcome,
  LeadOutcomeStatus,
  LeadResearch,
  OutreachChannel,
} from '@/types'
import {
  createLeadOutcome,
  discoverContacts,
  generateOutreach,
  getCustomerById,
  getLeadOutcome,
  getLeadResearch,
  getRankedContacts,
  rankContacts,
  researchLead,
  submitLeadResearchFeedback,
  updateLeadOutcome,
} from '@/services/api'
import { CommunicationEvidencePanel } from '@/components/communication/CommunicationEvidencePanel'
import { Avatar } from '@/components/ui/Avatar'
import { IntentBadge, IntentScoreBar } from '@/components/ui/IntentBadge'
import { Modal } from '@/components/ui/Modal'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import {
  CUSTOMER_TYPE_META,
  INDUSTRY_META,
  RECOMMENDED_ACTION_META,
} from '@/data/meta'
import { cn, intentLevelMeta, scoreToLevel } from '@/lib/utils'

type Channel = OutreachChannel

const CHANNEL_META: Record<
  Channel,
  { label: string; icon: typeof Mail; color: string }
> = {
  email: { label: '邮件草稿', icon: Mail, color: 'bg-brand-600 hover:bg-brand-700' },
  whatsapp: {
    label: 'WhatsApp 草稿',
    icon: MessageCircle,
    color: 'bg-emerald-600 hover:bg-emerald-700',
  },
  linkedin: {
    label: 'LinkedIn 草稿',
    icon: ExternalLink,
    color: 'bg-[#0A66C2] hover:bg-[#0a4f9a]',
  },
  call: { label: '电话话术', icon: Phone, color: 'bg-ink-700 hover:bg-ink-800' },
}

const OUTCOME_LABELS: Record<LeadOutcomeStatus, string> = {
  NEW: '未记录业务结果',
  CONTACTED: '历史：已联系',
  REPLIED: '历史：已回复',
  MEETING: '历史：已会议',
  QUALIFIED: '历史：已确认机会',
  PROPOSAL: '历史：方案阶段',
  WON: '已成交',
  LOST: '不匹配 / 已关闭',
}

const OUTCOME_ACTIONS: Array<{
  status: LeadOutcomeStatus
  label: string
  icon: typeof Trophy
}> = [
  { status: 'WON', label: '记录成交', icon: Trophy },
  { status: 'LOST', label: '记录不匹配', icon: XCircle },
]

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<ContactProfile[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string>()
  const [research, setResearch] = useState<LeadResearch | null>(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchFeedback, setResearchFeedback] = useState<'useful' | 'not_useful' | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [leadOutcome, setLeadOutcome] = useState<LeadOutcome | null>(null)
  const [outcomeNote, setOutcomeNote] = useState('')
  const [outcomeLoading, setOutcomeLoading] = useState(false)
  const [modal, setModal] = useState<{
    channel: Channel
    content: string
    loading: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getCustomerById(id),
      getRankedContacts(id).catch(() => []),
      getLeadResearch(id).catch(() => null),
      getLeadOutcome(id).catch(() => null),
    ])
      .then(([nextCustomer, nextContacts, nextResearch, nextOutcome]) => {
        if (cancelled) return
        setCustomer(nextCustomer || null)
        setContacts(nextContacts)
        setSelectedContactId(
          nextContacts.find(
            (contact) => contact.priorityRank === 1 && contact.name !== 'Unknown',
          )?.id,
        )
        setResearch(nextResearch)
        setLeadOutcome(nextOutcome)
        setOutcomeNote(nextOutcome?.note ?? '')
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '对象详情读取失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const handleResearch = async () => {
    if (!customer || researchLoading) return
    setResearchLoading(true)
    setError(null)
    try {
      setResearch(await researchLead(customer.id))
      setResearchFeedback(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '客户研究失败')
    } finally {
      setResearchLoading(false)
    }
  }

  const handleResearchFeedback = async (feedbackType: 'useful' | 'not_useful') => {
    if (!customer || feedbackLoading) return
    setFeedbackLoading(true)
    try {
      await submitLeadResearchFeedback(customer.id, {
        rating: feedbackType === 'useful' ? 5 : 2,
        feedbackType,
      })
      setResearchFeedback(feedbackType)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '反馈保存失败')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleDiscoverContacts = async () => {
    if (!customer || contactsLoading) return
    setContactsLoading(true)
    setError(null)
    try {
      const discovered = await discoverContacts(customer.id)
      setContacts(discovered)
      setSelectedContactId(
        discovered.find((contact) => contact.name !== 'Unknown')?.id,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '公开联系人抓取失败')
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
          (contact) => contact.priorityRank === 1 && contact.name !== 'Unknown',
        )?.id,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '联系人排序失败')
    } finally {
      setContactsLoading(false)
    }
  }

  const handleGenerate = async (channel: Channel) => {
    if (!customer) return
    setModal({ channel, content: '', loading: true })
    try {
      const content = await generateOutreach(
        customer.id,
        channel,
        selectedContactId,
      )
      setModal({ channel, content, loading: false })
    } catch (cause) {
      setModal(null)
      setError(cause instanceof Error ? cause.message : '话术生成失败')
    }
  }

  const handleOutcomeChange = async (status: LeadOutcomeStatus) => {
    if (!customer || outcomeLoading) return
    setOutcomeLoading(true)
    setError(null)
    try {
      const input = { status, note: outcomeNote.trim() || undefined }
      const saved = leadOutcome
        ? await updateLeadOutcome(customer.id, input)
        : await createLeadOutcome(customer.id, input)
      setLeadOutcome(saved)
      setOutcomeNote(saved.note ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '业务结果保存失败')
    } finally {
      setOutcomeLoading(false)
    }
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
        <p className="text-ink-500">未找到该对象</p>
        <Link to="/app/discover" className="btn-primary mt-4">
          返回发现
        </Link>
      </div>
    )
  }

  const analysis = customer.analysis
  const level = scoreToLevel(analysis.intentScore)
  const probabilityMeta = intentLevelMeta[analysis.purchaseProbability]
  const actionMeta = customer.recommendedAction
    ? RECOMMENDED_ACTION_META[customer.recommendedAction]
    : null
  const typeMeta = CUSTOMER_TYPE_META[customer.customerType]

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-5 border-b border-ink-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar initials={customer.initials} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-ink-950 sm:text-2xl">
                    {customer.displayName}
                  </h1>
                  <PlatformIcon platform={customer.platform} className="h-5 w-5" />
                  <IntentBadge level={level} />
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {customer.company || customer.username} · {customer.country} · {typeMeta.label}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  {INDUSTRY_META[customer.industry].label}
                  {customer.jobTitle ? ` · ${customer.jobTitle}` : ''}
                </p>
              </div>
            </div>
            <a
              href={customer.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
            >
              查看原始来源
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid gap-px bg-ink-100 md:grid-cols-[1.25fr_0.75fr]">
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                来源内容
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                {customer.postContent}
              </p>
            </div>
            <div className="bg-white p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                AI 判断（非事实）
              </p>
              <div className="mt-3">
                <IntentScoreBar score={analysis.intentScore} />
              </div>
              <p className="mt-3 text-xs leading-5 text-ink-600">
                购买概率：
                <span className="inline-flex items-center gap-1 font-semibold text-ink-800">
                  <span className={cn('h-2 w-2 rounded-full', probabilityMeta.dot)} />
                  {analysis.purchaseProbability}
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-ink-500">
                {analysis.reasoning || analysis.suggestion}
              </p>
            </div>
          </div>

          {actionMeta ? (
            <div className="border-t border-ink-100 px-5 py-3 text-xs text-ink-600 sm:px-6">
              <span className="font-semibold text-ink-900">建议下一步：</span>
              {actionMeta.label} · {actionMeta.desc}
            </div>
          ) : null}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-ink-900">深度研究</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-500">
                基于当前对象和产品证据判断匹配度；研究分数不会自动变成机会或沟通事实。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleResearch()}
              disabled={researchLoading}
              className="btn-secondary text-xs"
            >
              {researchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {research?.generatedAt ? '重新研究' : '开始研究'}
            </button>
          </div>

          {research?.matchScore != null ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FactCell label="匹配评分" value={`${research.matchScore}/100`} />
              <FactCell label="购买可能性" value={research.purchaseLikelihood ?? 'Unknown'} />
              <FactCell label="为什么值得联系" value={research.contactReason ?? 'Unknown'} />
              <FactCell label="推荐切入角度" value={research.recommendedAngle ?? 'Unknown'} />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-500">
              尚未运行深度研究。
            </div>
          )}

          {research?.matchScore != null ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
              <span className="text-xs text-ink-500">这个判断有帮助吗？</span>
              <button
                type="button"
                onClick={() => void handleResearchFeedback('useful')}
                disabled={feedbackLoading || Boolean(researchFeedback)}
                className="btn-secondary text-xs"
              >
                <ThumbsUp className="h-3.5 w-3.5" /> 有帮助
              </button>
              <button
                type="button"
                onClick={() => void handleResearchFeedback('not_useful')}
                disabled={feedbackLoading || Boolean(researchFeedback)}
                className="btn-secondary text-xs"
              >
                <ThumbsDown className="h-3.5 w-3.5" /> 需要改进
              </button>
              {researchFeedback ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 已记录
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-ink-900">公开联系人</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-500">
                只保存公开观察到的业务联系方式；不会猜测邮箱格式、私人号码或联系人姓名。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleDiscoverContacts()}
                disabled={contactsLoading}
                className="btn-secondary text-xs"
              >
                {contactsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {contacts.length ? '刷新联系人' : '抓取联系人'}
              </button>
              {contacts.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void handleRankContacts()}
                  disabled={contactsLoading}
                  className="btn-secondary text-xs"
                >
                  推荐排序
                </button>
              ) : null}
            </div>
          </div>

          {contacts.length ? (
            <div className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100">
              {contacts.map((contact) => (
                <label
                  key={contact.id}
                  className={cn(
                    'flex cursor-pointer gap-3 bg-white p-4 transition hover:bg-ink-50',
                    selectedContactId === contact.id && 'bg-brand-50/60',
                  )}
                >
                  <input
                    type="radio"
                    name="selected-contact"
                    checked={selectedContactId === contact.id}
                    disabled={contact.name === 'Unknown'}
                    onChange={() => setSelectedContactId(contact.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-900">{contact.name}</span>
                      {contact.jobTitle !== 'Unknown' ? (
                        <span className="text-xs text-ink-500">{contact.jobTitle}</span>
                      ) : null}
                      <span className="text-[10px] text-ink-400">可信度 {contact.confidence}%</span>
                    </span>
                    <span className="mt-1 block text-[10px] text-ink-400">来源：{contact.source}</span>
                    <span className="mt-2 flex flex-wrap gap-2 text-xs">
                      {contact.email !== 'Unknown' ? (
                        <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2 py-1 text-brand-700">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </a>
                      ) : null}
                      {contact.phone !== 'Unknown' ? (
                        <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2 py-1 text-ink-700">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </a>
                      ) : null}
                      {contact.profileUrl !== 'Unknown' ? (
                        <a href={contact.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2 py-1 text-ink-700">
                          <ExternalLink className="h-3 w-3" /> 公开主页
                        </a>
                      ) : null}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-4 py-6 text-center text-xs text-ink-500">
              尚未发现可归因公开联系人。
            </div>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-ink-900">沟通准备</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            这里只生成草稿。复制、打开邮箱或生成话术都不会把状态改成“已发送”。
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(CHANNEL_META) as Channel[]).map((channel) => {
              const meta = CHANNEL_META[channel]
              const Icon = meta.icon
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => void handleGenerate(channel)}
                  className={cn(
                    'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white',
                    meta.color,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </section>

        <CommunicationEvidencePanel leadId={customer.id} />

        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-ink-900">业务结果</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-500">
                “已发送 / 已回复 / 已约会议”由上面的沟通事实自动推导；这里仅记录独立业务结果。
              </p>
            </div>
            <span className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700">
              {OUTCOME_LABELS[leadOutcome?.status ?? 'NEW']}
            </span>
          </div>

          <textarea
            value={outcomeNote}
            onChange={(event) => setOutcomeNote(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="记录成交依据、关闭原因或下一步（可选）"
            className="mt-4 w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {OUTCOME_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => void handleOutcomeChange(action.status)}
                  disabled={outcomeLoading}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition',
                    leadOutcome?.status === action.status
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                  )}
                >
                  {outcomeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal ? `${CHANNEL_META[modal.channel].label} · 仅为草稿` : ''}
        description={customer.displayName}
      >
        {modal?.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <span className="ml-3 text-sm text-ink-500">AI 正在生成…</span>
          </div>
        ) : modal ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-700">
                {modal.content}
              </pre>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-400">生成内容不代表已发送；真实发送后请在“沟通事实”提交可归因凭证。</p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(modal.content)}
                className="btn-secondary"
              >
                <Copy className="h-4 w-4" />
                复制草稿
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function FactCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 text-xs leading-5 text-ink-700">{value}</p>
    </div>
  )
}
