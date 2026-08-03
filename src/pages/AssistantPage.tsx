import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import type {
  ChatSession,
  ContactProfile,
  OutreachChannel,
  OutreachGeneration,
  SalesAgentAction,
  SalesAgentHistoryMessage,
  SalesAgentModelOption,
} from '@/types'
import {
  ApiRequestError,
  generateOutreachBundle,
  getChatSessions,
  discoverContacts,
  getRuntimeCapabilities,
  runSalesAgent,
} from '@/services/api'
import { Avatar } from '@/components/ui/Avatar'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { cn } from '@/lib/utils'

const CHANNELS: Array<{
  value: OutreachChannel
  label: string
  icon: typeof Mail
}> = [
  { value: 'email', label: '邮件', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'call', label: '电话', icon: Phone },
]

const QUICK_OBJECTIVES = [
  '围绕对方最近关注的问题提供一个低压力解决思路',
  '分享相关案例并确认是否愿意安排 15 分钟交流',
  '确认项目时间、现有方案和决策角色',
]

export function AssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedLeadId = searchParams.get('leadId') ?? ''
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState('')
  const [query, setQuery] = useState('')
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState(false)
  const [contactId, setContactId] = useState('')
  const [channel, setChannel] = useState<OutreachChannel>('email')
  const [objective, setObjective] = useState(QUICK_OBJECTIVES[0])
  const [language, setLanguage] = useState<'auto' | 'zh' | 'en'>('auto')
  const [tone, setTone] = useState<'mirror' | 'formal' | 'concise' | 'consultative'>('mirror')
  const [generation, setGeneration] = useState<OutreachGeneration | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  const loadSessions = useCallback(() => {
    setSessionsLoading(true)
    getChatSessions()
      .then((items) => {
        setSessions(items)
        setSessionsError(false)
      })
      .catch(() => setSessionsError(true))
      .finally(() => setSessionsLoading(false))
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (
      requestedLeadId &&
      sessions.some((session) => session.id === requestedLeadId)
    ) {
      setActiveSessionId(requestedLeadId)
    }
  }, [requestedLeadId, sessions])

  const chooseSession = (sessionId: string) => {
    setActiveSessionId(sessionId)
    const next = new URLSearchParams(searchParams)
    if (sessionId) next.set('leadId', sessionId)
    else next.delete('leadId')
    setSearchParams(next, { replace: true })
  }

  const filteredSessions = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return sessions
    return sessions.filter((session) =>
      [
        session.customerName,
        session.displayName,
        session.company,
        session.jobTitle,
        ...session.contacts.flatMap((contact) => [
          contact.name,
          contact.jobTitle,
          contact.company,
          contact.email,
          contact.phone,
        ]),
      ]
        .filter(Boolean)
        .some((item) => item!.toLowerCase().includes(value)),
    )
  }, [query, sessions])

  const activeSession = sessions.find((item) => item.id === activeSessionId) ?? null
  const selectedContact =
    activeSession?.contacts.find((item) => item.id === contactId) ??
    activeSession?.contacts[0] ??
    null

  useEffect(() => {
    setContactId(activeSession?.contacts[0]?.id ?? '')
    setGeneration(null)
    setDraft('')
    setError(null)
    setContactError(null)
  }, [activeSessionId])

  useEffect(() => {
    if (generation) setDraft(channelDraft(generation, channel))
  }, [channel, generation])

  const generate = async () => {
    if (!activeSession || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await generateOutreachBundle(activeSession.id, {
        contactId: selectedContact?.id,
        objective: objective.trim() || undefined,
        language,
        tone,
      })
      setGeneration(result)
      setDraft(channelDraft(result, channel))
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : '暂时无法生成话术，请稍后重试。',
      )
    } finally {
      setLoading(false)
    }
  }

  const copyDraft = async () => {
    if (!draft) return
    await navigator.clipboard?.writeText(draft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const refreshPublicContacts = async () => {
    if (!activeSession || contactLoading) return
    setContactLoading(true)
    setContactError(null)
    try {
      const contacts = await discoverContacts(activeSession.id)
      const contactScore = contacts.reduce(
        (highest, contact) =>
          Math.max(highest, contact.contactScore ?? contact.confidence ?? 0),
        0,
      )
      const hasActionableContact = contacts.some((contact) =>
        [contact.email, contact.phone, contact.profileUrl].some(
          (value) => Boolean(known(value)),
        ),
      )
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                contacts,
                contactReadiness: hasActionableContact ? 'ready' : 'research',
                assistantScores: {
                  ...sessionScore(session),
                  contact: contactScore,
                },
              }
            : session,
        ),
      )
      setContactId(contacts[0]?.id ?? '')
      if (contacts.length === 0) {
        setContactError('没有在允许抓取的公开页面中发现邮箱、电话或社交主页。')
      }
    } catch (requestError) {
      setContactError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : '暂时无法补充公开联系方式。',
      )
    } finally {
      setContactLoading(false)
    }
  }

  return (
    <div className="flex h-full bg-white">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <div className="p-3">
          <Link to="/app/discover?selectFor=assistant" className="workspace-primary-action w-full justify-start">
            <Plus className="h-4 w-4" />
            选择新的销售机会
          </Link>
        </div>
        <div className="px-3">
          <div className="flex items-center gap-2 rounded-full border border-ink-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-ink-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索联系人或企业"
              className="w-full bg-transparent text-sm placeholder:text-ink-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
          {!query.trim() ? (
            <div className="mx-1 rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-5 text-xs leading-5 text-ink-500">
              输入联系人、企业或职位关键词后，这里才会展示匹配的真实来源对象。
            </div>
          ) : sessionsLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl p-2">
                <div className="h-9 w-9 animate-pulse rounded-full bg-ink-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                  <div className="h-2.5 w-40 animate-pulse rounded bg-ink-50" />
                </div>
              </div>
            ))
          ) : sessionsError ? (
            <div className="px-3 py-4 text-xs leading-relaxed text-rose-600">
              <p>暂时无法加载联系人与企业。</p>
              <button type="button" onClick={loadSessions} className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700">
                <RefreshCw className="h-3 w-3" /> 重新加载
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="px-3 py-4 text-xs leading-relaxed text-ink-500">
              <p>没有匹配该关键词的联系人或企业。</p>
              <Link to="/app/discover?selectFor=assistant" className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700">
                去发现销售机会 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <>
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                搜索结果 · {filteredSessions.length}
              </p>
              {filteredSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => chooseSession(session.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors',
                    activeSessionId === session.id ? 'bg-brand-50' : 'hover:bg-ink-50',
                  )}
                >
                  <Avatar initials={session.initials} src={session.avatarUrl} alt={session.customerName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink-900">{session.customerName}</span>
                      <PlatformIcon platform={session.platform} className="h-3 w-3" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                      {audienceLabel(session.audienceType)} · 综合 {sessionScore(session).overall}
                    </span>
                    <span className={cn(
                      'mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                      session.contactReadiness === 'ready'
                        ? 'bg-emerald-50 text-emerald-700'
                        : session.contactReadiness === 'review'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-brand-50 text-brand-700',
                    )}>
                      {readinessLabel(session.contactReadiness)}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-ink-50">
        <header className="flex min-h-[76px] items-center justify-between border-b border-ink-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-700">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="workspace-kicker">AGENTIC SALES EXECUTION</p>
              <h1 className="mt-1 text-sm font-semibold text-ink-900">AI 销售执行助手</h1>
              <p className="text-xs text-ink-500">一句话编排寻客、联系人补全、研究与个性化触达</p>
            </div>
          </div>
          <Link to="/app/discover?selectFor=assistant" className="btn-ghost text-xs">
            <Search className="h-3.5 w-3.5" />
            发现更多机会
          </Link>
        </header>

        <div className="border-b border-ink-200 bg-white px-4 py-3 md:hidden">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            联系对象
            <select
              value={activeSessionId}
              onChange={(event) => chooseSession(event.target.value)}
              disabled={sessionsLoading || sessionsError}
              className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink-800"
            >
              <option value="">
                {sessionsLoading
                  ? '正在加载真实来源对象…'
                  : sessionsError
                    ? '暂时无法加载'
                    : '选择个人、企业、供应商或中介'}
              </option>
              {filteredSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.customerName}{session.company ? ` · ${session.company}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin sm:px-6">
          <div className="mx-auto mb-5 max-w-6xl">
            <SalesAgentPanel
              activeSession={activeSession}
              onRefreshLeads={loadSessions}
              onSelectLead={chooseSession}
            />
          </div>
          {!activeSession ? (
            <AssistantStartState
              sessions={filteredSessions}
              loading={sessionsLoading}
              onSelect={chooseSession}
            />
          ) : (
            <div className="mx-auto max-w-6xl space-y-4">
              <AudienceHeader session={activeSession} contact={selectedContact} />

              <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <section className="space-y-4">
                  <div className="workspace-panel p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">观察到的沟通习惯</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ProfileChip label={languageLabel(activeSession.communicationProfile.language)} />
                      <ProfileChip label={toneLabel(activeSession.communicationProfile.tone)} />
                      <ProfileChip label={activeSession.communicationProfile.preferredPlatform} />
                    </div>
                    <p className="mt-4 text-xs leading-6 text-ink-600">
                      {activeSession.communicationProfile.evidenceExcerpt}
                    </p>
                    {activeSession.communicationProfile.observedTopics.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {activeSession.communicationProfile.observedTopics.map((topic) => (
                          <span key={topic} className="rounded-full bg-ink-100 px-2 py-1 text-[10px] text-ink-600">{topic}</span>
                        ))}
                      </div>
                    )}
                    <a
                      href={activeSession.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
                    >
                      查看内容来源 <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="workspace-panel p-5">
                    <h2 className="text-sm font-semibold text-ink-900">本次联系设置</h2>
                    <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-ink-800">公开联系方式</p>
                          <p className="mt-0.5 text-[10px] leading-4 text-ink-500">
                            当前 {activeSession.contacts.length} 条；可重新检查官网及公开社交主页中的邮箱、电话和个人主页。
                          </p>
                        </div>
                        <button type="button" onClick={() => void refreshPublicContacts()} disabled={contactLoading} className="btn-secondary shrink-0 px-2.5 py-1.5 text-[10px] disabled:opacity-60">
                          <RefreshCw className={cn('h-3 w-3', contactLoading && 'animate-spin')} />
                          {contactLoading ? '抓取中' : '补充联系人'}
                        </button>
                      </div>
                      {contactError && <p className="mt-2 text-[10px] leading-4 text-amber-700">{contactError}</p>}
                    </div>
                    <label className="mt-4 block text-xs font-medium text-ink-600">
                      联系对象
                      <select
                        value={contactId}
                        onChange={(event) => setContactId(event.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-800"
                      >
                        {activeSession.contacts.length === 0 && <option value="">企业通用联系人</option>}
                        {activeSession.contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name} · {contact.jobTitle}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block text-xs font-medium text-ink-600">
                      联系目标
                      <textarea
                        value={objective}
                        onChange={(event) => setObjective(event.target.value)}
                        rows={3}
                        className="mt-1.5 w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm leading-6 text-ink-800"
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {QUICK_OBJECTIVES.map((item) => (
                        <button key={item} type="button" onClick={() => setObjective(item)} className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] text-ink-600 hover:border-brand-300">
                          {item.slice(0, 14)}…
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-700">
                        <option value="auto">自动匹配语言</option>
                        <option value="zh">简体中文</option>
                        <option value="en">English</option>
                      </select>
                      <select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-700">
                        <option value="mirror">匹配对方风格</option>
                        <option value="formal">正式专业</option>
                        <option value="concise">简洁直接</option>
                        <option value="consultative">顾问式沟通</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="workspace-panel overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {CHANNELS.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setChannel(item.value)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
                              channel === item.value ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100',
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => void generate()}
                      disabled={loading}
                      className="workspace-primary-action justify-center"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generation ? '重新生成' : '生成个性化话术'}
                    </button>
                  </div>

                  <div className="min-h-[500px] p-5 sm:p-6">
                    {error ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
                    ) : generation ? (
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">AI DRAFT · {generation.provider}</p>
                            <h2 className="mt-1 text-base font-semibold text-ink-900">发送前可继续编辑</h2>
                          </div>
                          <button type="button" onClick={() => void copyDraft()} className="workspace-secondary-action">
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? '已复制' : '复制话术'}
                          </button>
                        </div>
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          className="mt-5 min-h-[320px] w-full resize-y rounded-2xl border border-ink-200 bg-ink-50/70 p-4 text-sm leading-7 text-ink-800 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                        />
                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-ink-100 bg-ink-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs leading-5 text-ink-500">
                            系统不会自动发送。点击后会打开对应应用，由你最后确认收件人和内容。
                          </p>
                          <ContactAction
                            session={activeSession}
                            contact={selectedContact}
                            channel={channel}
                            draft={draft}
                            generation={generation}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <h2 className="mt-4 text-base font-semibold text-ink-900">生成真正针对这个人的话术</h2>
                        <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
                          AI 会结合公开内容、角色、企业背景、购买信号、沟通平台和你设置的目标生成四个渠道版本。
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AgentChatEntry extends SalesAgentHistoryMessage {
  id: string
  actions?: SalesAgentAction[]
  model?: string
  requiresApproval?: boolean
}

const AGENT_STARTERS = [
  '帮我寻找 10 家正在扩张的工业自动化潜在客户，优先补全决策人联系方式并准备首封邮件。',
  '从现有结果里选出最值得联系的 5 个个人或企业，说明证据、风险和下一步。',
  '研究当前选中的对象，补充公开联系人，并按对方内容习惯生成中文和英文销售话术。',
]

const FALLBACK_AGENT_MODELS: SalesAgentModelOption[] = [
  {
    id: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    description: '复杂寻客、研究与多步销售编排，质量优先',
  },
  {
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    description: '日常研究与话术生成，速度和成本更均衡',
  },
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    description: '快速筛选、联系人整理与高频轻量任务',
  },
]

function SalesAgentPanel({
  activeSession,
  onRefreshLeads,
  onSelectLead,
}: {
  activeSession: ChatSession | null
  onRefreshLeads: () => void
  onSelectLead: (id: string) => void
}) {
  const [messages, setMessages] = useState<AgentChatEntry[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [modelOptions, setModelOptions] = useState<SalesAgentModelOption[]>(FALLBACK_AGENT_MODELS)
  const [selectedModel, setSelectedModel] = useState(FALLBACK_AGENT_MODELS[0].id)
  const [agentConfigured, setAgentConfigured] = useState<boolean | null>(null)
  const [checkingConfiguration, setCheckingConfiguration] = useState(false)

  const loadAgentCapability = useCallback(async () => {
    setCheckingConfiguration(true)
    try {
      const capabilities = await getRuntimeCapabilities()
      const capability = capabilities.salesAgent
      const options = capability?.models?.length
        ? capability.models
        : FALLBACK_AGENT_MODELS
      setModelOptions(options)
      setSelectedModel((current) => {
        if (options.some((option) => option.id === current)) return current
        if (capability?.model && options.some((option) => option.id === capability.model)) {
          return capability.model
        }
        return options[0]?.id ?? FALLBACK_AGENT_MODELS[0].id
      })
      setAgentConfigured(Boolean(capability?.enabled))
    } catch {
      setAgentConfigured(null)
    } finally {
      setCheckingConfiguration(false)
    }
  }, [])

  useEffect(() => {
    void loadAgentCapability()
  }, [loadAgentCapability])

  const selectedModelDetails =
    modelOptions.find((option) => option.id === selectedModel) ?? modelOptions[0]

  const submit = async (preset?: string) => {
    const content = (preset ?? input).trim()
    if (!content || running) return
    if (agentConfigured === false) {
      setAgentError(missingOpenAIKeyMessage())
      return
    }
    const userMessage: AgentChatEntry = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    const history = messages.map(({ role, content: historyContent }) => ({
      role,
      content: historyContent,
    }))
    setMessages((current) => [...current, userMessage])
    setInput('')
    setAgentError(null)
    setRunning(true)
    try {
      const result = await runSalesAgent({
        message: content,
        leadId: activeSession?.id,
        history,
        model: selectedModel,
      })
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.message,
          actions: result.actions,
          model: result.model,
          requiresApproval: result.requiresApproval,
        },
      ])
      if (result.actions.some((action) => action.tool === 'discover_leads')) {
        onRefreshLeads()
      }
      if (result.leadIds[0]) onSelectLead(result.leadIds[0])
    } catch (requestError) {
      if (
        requestError instanceof ApiRequestError &&
        requestError.code === 'OPENAI_NOT_CONFIGURED'
      ) {
        setAgentConfigured(false)
      }
      setAgentError(agentErrorMessage(requestError))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
      <div className="border-b border-brand-100 bg-gradient-to-r from-brand-50 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <p className="workspace-kicker">GPT SALES OPERATOR</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-ink-900">
                用一句话让 Agent 开始寻客和销售准备
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-500">
                Agent 会自行调用真实搜索、候选人列表、官网联系人补全、客户研究和多渠道话术工具，并把每一步结果展示在下方。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-ink-500">
              模型
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                disabled={running}
                className="max-w-[180px] bg-transparent text-xs font-semibold text-ink-800 focus:outline-none"
                aria-label="选择 AI 销售模型"
              >
                {modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold',
              agentConfigured === false
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : agentConfigured === true
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-ink-200 bg-ink-50 text-ink-500',
            )}>
              <span className={cn(
                'h-1.5 w-1.5 rounded-full',
                agentConfigured === false
                  ? 'bg-rose-500'
                  : agentConfigured === true
                    ? 'bg-emerald-500'
                    : 'bg-ink-300',
              )} />
              {agentConfigured === false
                ? 'Railway 后端未配置密钥'
                : agentConfigured === null
                  ? '正在检测后端配置'
                  : activeSession
                    ? `当前对象：${activeSession.customerName}`
                    : '自主选择工具'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-ink-200 bg-ink-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-800">{selectedModelDetails?.label ?? selectedModel}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-ink-500">{selectedModelDetails?.description}</p>
          </div>
          {agentConfigured === false && (
            <button type="button" onClick={() => void loadAgentCapability()} disabled={checkingConfiguration} className="btn-secondary shrink-0 px-3 py-1.5 text-[10px] disabled:opacity-60">
              <RefreshCw className={cn('h-3 w-3', checkingConfiguration && 'animate-spin')} />
              重新检测配置
            </button>
          )}
        </div>
        {messages.length === 0 ? (
          <div className="grid gap-2 lg:grid-cols-3">
            {AGENT_STARTERS.map((starter, index) => (
              <button
                key={starter}
                type="button"
                onClick={() => void submit(starter)}
                disabled={running}
                className="group rounded-2xl border border-ink-200 bg-ink-50/60 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/45 disabled:opacity-60"
              >
                <span className="text-[10px] font-semibold text-brand-700">任务 {index + 1}</span>
                <span className="mt-2 block text-xs leading-5 text-ink-700">{starter}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700">
                  直接执行 <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[82%]',
                    message.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'border border-ink-200 bg-ink-50 text-ink-800',
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-1.5 border-t border-ink-200/80 pt-3">
                      {message.actions.map((action) => (
                        <div key={action.id} className="flex items-start gap-2 text-[11px] leading-5 text-ink-600">
                          <span className={cn(
                            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                            action.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500',
                          )} />
                          <span><strong className="font-semibold text-ink-800">{toolLabel(action.tool)}</strong> · {action.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {message.role === 'assistant' && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      <span>{message.model}</span>
                      {message.requiresApproval && <span>外部发送待确认</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                GPT 正在选择并调用销售工具，真实搜索可能需要 30–90 秒…
              </div>
            )}
          </div>
        )}

        {agentError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700">
            {agentError}
          </div>
        )}

        <div className="mt-4 flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-sm focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }}
            rows={2}
            placeholder="例如：寻找新加坡 10–100 人电商公司，找到负责人联系方式，研究后生成第一轮触达方案"
            className="min-h-[50px] flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-ink-800 placeholder:text-ink-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!input.trim() || running}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:bg-ink-200"
            aria-label="让 Agent 执行"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-ink-400">
          Agent 只使用真实来源字段；外部发送必须由已连接的邮箱/社交渠道返回消息 ID 后才会标记为已发送。
        </p>
      </div>
    </section>
  )
}

function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    discover_leads: '寻找新客户',
    list_sales_candidates: '读取候选对象',
    inspect_lead: '核对客户详情',
    discover_public_contacts: '补全公开联系人',
    research_lead: '研究客户与信号',
    generate_outreach: '生成个性化话术',
  }
  return labels[tool] ?? tool
}

function missingOpenAIKeyMessage() {
  return '生产后端没有读取到 OPENAI_API_KEY。请把密钥添加到 Railway 目标 Service 的 Production Variables（不要放进 VITE_* 或浏览器变量），保存后重新部署，再点击“重新检测配置”。'
}

function agentErrorMessage(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return 'GPT 销售代理暂时无法执行，请稍后重试。'
  }
  if (error.code === 'OPENAI_NOT_CONFIGURED') {
    return missingOpenAIKeyMessage()
  }
  if (error.code === 'UNSUPPORTED_OPENAI_MODEL') {
    return '所选模型没有被当前后端启用，请换用模型列表中的其他模型。'
  }
  if (error.code === 'OPENAI_RESPONSES_ERROR') {
    if (/model|access|permission|not exist|not found/i.test(error.message)) {
      return `后端已读取到 API Key，但当前账号没有所选模型权限。请换一个模型或在 OpenAI 项目中开通权限。OpenAI 返回：${error.message}`
    }
    if (/api.?key|auth|unauthor|invalid.*key/i.test(error.message)) {
      return `后端已读取到 API Key，但 OpenAI 拒绝了认证。请检查密钥所属项目、状态与额度。OpenAI 返回：${error.message}`
    }
  }
  return error.message
}

function AssistantStartState({
  sessions,
  loading,
  onSelect,
}: {
  sessions: ChatSession[]
  loading: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div className="mx-auto max-w-6xl">
      {!loading && sessions.length > 0 && (
        <section className="rounded-3xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">或者手动选择一个现有对象</h2>
              <p className="mt-1 text-xs text-ink-500">当前有 {sessions.length} 个真实来源对象，可直接进入联系人与话术工作区</p>
            </div>
            <Link to="/app/discover?selectFor=assistant" className="workspace-secondary-action shrink-0">
              查看全部机会 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sessions.slice(0, 6).map((session) => (
              <button key={session.id} type="button" onClick={() => onSelect(session.id)} className="flex items-center gap-3 rounded-2xl border border-ink-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/35">
                <Avatar initials={session.initials} src={session.avatarUrl} alt={session.customerName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">{session.customerName}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-500">{audienceLabel(session.audienceType)} · 综合 {sessionScore(session).overall}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AudienceHeader({ session, contact }: { session: ChatSession; contact: ContactProfile | null }) {
  const scores = sessionScore(session)
  return (
    <section className="workspace-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar initials={session.initials} src={session.avatarUrl} alt={session.customerName} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-ink-900">{contact?.name !== 'Unknown' ? contact?.name : session.customerName}</h2>
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold',
              session.contactReadiness === 'ready'
                ? 'bg-emerald-50 text-emerald-700'
                : session.contactReadiness === 'review'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-brand-50 text-brand-700',
            )}>
              <ShieldCheck className="h-3 w-3" /> {readinessLabel(session.contactReadiness)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-500">
            {session.company ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            {contact?.jobTitle !== 'Unknown' ? `${contact?.jobTitle} · ` : ''}{session.company ?? session.displayName}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-ink-500">
            <span className="rounded-full bg-ink-100 px-2 py-1">{audienceLabel(session.audienceType)}</span>
            <span className="rounded-full bg-ink-100 px-2 py-1">综合 {scores.overall}</span>
            <span className="rounded-full bg-ink-100 px-2 py-1">意向 {scores.intent}</span>
            <span className="rounded-full bg-ink-100 px-2 py-1">联系 {scores.contact}</span>
          </div>
        </div>
      </div>
      <a href={session.profileUrl || session.sourceUrl} target="_blank" rel="noreferrer" className="workspace-secondary-action">
        查看公开主页 <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </section>
  )
}

function ContactAction({
  session,
  contact,
  channel,
  draft,
  generation,
}: {
  session: ChatSession
  contact: ContactProfile | null
  channel: OutreachChannel
  draft: string
  generation: OutreachGeneration
}) {
  const action = contactAction(session, contact, channel, draft, generation)
  return (
    <a
      href={action.href}
      target={action.external ? '_blank' : undefined}
      rel={action.external ? 'noreferrer' : undefined}
      className="workspace-primary-action shrink-0 justify-center"
    >
      <Send className="h-4 w-4" />
      {action.label}
    </a>
  )
}

function contactAction(
  session: ChatSession,
  contact: ContactProfile | null,
  channel: OutreachChannel,
  draft: string,
  generation: OutreachGeneration,
) {
  const email = known(contact?.email)
  const phone = known(contact?.phone)
  const profile =
    known(contact?.profileUrl) || known(session.profileUrl) || session.sourceUrl
  if (channel === 'email' && email) {
    const subject = generation.content.email.subjectOptions[0] || ''
    return {
      href: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`,
      label: '打开邮箱确认发送',
      external: false,
    }
  }
  if (channel === 'whatsapp' && phone) {
    const digits = phone.replace(/\D/g, '')
    return {
      href: `https://wa.me/${digits}?text=${encodeURIComponent(draft)}`,
      label: '打开 WhatsApp',
      external: true,
    }
  }
  if (channel === 'call' && phone) {
    return { href: `tel:${phone}`, label: '拨打公开电话', external: false }
  }
  return {
    href: profile,
    label: channel === 'linkedin' ? '打开 LinkedIn / 主页' : '打开公开主页',
    external: true,
  }
}

function channelDraft(generation: OutreachGeneration, channel: OutreachChannel) {
  const content = generation.content
  if (channel === 'email') {
    return [content.email.opening, '', content.email.body, '', content.email.cta]
      .filter(Boolean)
      .join('\n')
  }
  if (channel === 'linkedin') {
    return [content.linkedin.connectionMessage, '', content.linkedin.firstMessage]
      .filter(Boolean)
      .join('\n')
  }
  if (channel === 'whatsapp') return content.whatsapp.message
  return [content.callScript.opening, '', ...content.callScript.questions.map((item, index) => `${index + 1}. ${item}`)]
    .filter(Boolean)
    .join('\n')
}

function known(value: string | null | undefined) {
  return value && value !== 'Unknown' ? value : null
}

function ProfileChip({ label }: { label: string }) {
  return <span className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">{label}</span>
}

function languageLabel(value: ChatSession['communicationProfile']['language']) {
  return { zh: '偏好中文', en: '偏好英文', mixed: '中英混合', unknown: '语言待确认' }[value]
}

function toneLabel(value: ChatSession['communicationProfile']['tone']) {
  return { concise: '表达简洁', detailed: '信息详细', technical: '技术导向', conversational: '自然交流' }[value]
}

function audienceLabel(value: ChatSession['audienceType']) {
  return {
    person: '个人联系人',
    company: '企业客户',
    supplier: '供应商',
    intermediary: '中介 / 渠道',
  }[value ?? 'company']
}

function readinessLabel(value: ChatSession['contactReadiness']) {
  return {
    ready: '可直接联系',
    research: '待补充联系方式',
    review: '需先核对来源',
  }[value ?? 'research']
}

function sessionScore(session: ChatSession) {
  return session.assistantScores ?? {
    overall: 0,
    intent: 0,
    identity: 0,
    evidence: 0,
    contact: 0,
  }
}
