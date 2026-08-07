import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  DatabaseZap,
  Globe2,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type {
  ChatSession,
  CustomerType,
  IntentLevel,
  Platform,
  Region,
  SalesAgentHistoryMessage,
  SalesAgentModelOption,
} from '@/types'
import {
  ApiRequestError,
  getChatSessions,
  getRuntimeCapabilities,
  runSalesAgent,
  searchCustomers,
} from '@/services/api'
import {
  AgentConversation,
  type CommandMessage,
} from '@/features/command-center/AgentConversation'
import { CommandComposer } from '@/features/command-center/CommandComposer'
import { IntelligenceResultGrid } from '@/features/command-center/IntelligenceResultGrid'
import { cn } from '@/lib/utils'

const FALLBACK_MODELS: SalesAgentModelOption[] = [
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

const DIRECT_SEARCH_PLATFORMS: Platform[] = [
  'Website',
  'LinkedIn',
  'X',
  'Reddit',
  'Facebook',
  'Instagram',
  'TikTok',
  'Xiaohongshu',
  'YouTube',
]
const DIRECT_SEARCH_REGIONS: Region[] = [
  'USA',
  'Europe',
  'SoutheastAsia',
  'China',
  'MiddleEast',
]
const DIRECT_SEARCH_CUSTOMER_TYPES: CustomerType[] = [
  'Buyer',
  'Agent',
  'Company',
  'Individual',
]
const DIRECT_SEARCH_INTENT_LEVELS: IntentLevel[] = ['high', 'medium', 'low']
const DIRECT_SEARCH_TARGET_RESULTS = 30
const loadAssistantLeadSessions = getChatSessions

type RunningMode = 'agent' | 'search' | null

export function AICommandCenterPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<CommandMessage[]>([])
  const [results, setResults] = useState<ChatSession[]>([])
  const [runningMode, setRunningMode] = useState<RunningMode>(null)
  const [syncingResults, setSyncingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelOptions, setModelOptions] =
    useState<SalesAgentModelOption[]>(FALLBACK_MODELS)
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].id)
  const [agentConfigured, setAgentConfigured] = useState<boolean | null>(null)
  const [searchConfigured, setSearchConfigured] = useState<boolean | null>(null)
  const [checkingCapability, setCheckingCapability] = useState(false)
  const running = runningMode !== null

  const loadCapability = useCallback(async () => {
    setCheckingCapability(true)
    try {
      const capabilities = await getRuntimeCapabilities()
      const capability = capabilities.salesAgent
      const options = capability?.models?.length
        ? capability.models
        : FALLBACK_MODELS
      setModelOptions(options)
      setSelectedModel((current) => {
        if (options.some((option) => option.id === current)) return current
        if (
          capability?.model &&
          options.some((option) => option.id === capability.model)
        ) {
          return capability.model
        }
        return options[0]?.id ?? FALLBACK_MODELS[0].id
      })
      setAgentConfigured(Boolean(capability?.enabled))
      setSearchConfigured(
        Boolean(
          capabilities.salesDiscovery?.enabled ||
            capabilities.publicContactDiscovery?.enabled,
        ),
      )
    } catch {
      setAgentConfigured(null)
      setSearchConfigured(null)
    } finally {
      setCheckingCapability(false)
    }
  }, [])

  useEffect(() => {
    void loadCapability()
  }, [loadCapability])

  const selectedModelDetails = useMemo(
    () =>
      modelOptions.find((option) => option.id === selectedModel) ??
      modelOptions[0],
    [modelOptions, selectedModel],
  )

  const submit = async (preset?: string) => {
    const content = (preset ?? input).trim()
    if (!content || running) return
    if (agentConfigured === false) {
      setError(missingOpenAIKeyMessage())
      return
    }

    const userMessage: CommandMessage = {
      id: createMessageId(),
      role: 'user',
      content,
    }
    const history: SalesAgentHistoryMessage[] = messages.map(
      ({ role, content: historyContent }) => ({
        role,
        content: historyContent,
      }),
    )

    setMessages((current) => [...current, userMessage])
    setInput('')
    setError(null)
    setRunningMode('agent')

    try {
      const result = await runSalesAgent({
        message: content,
        history,
        model: selectedModel,
      })
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.message,
          actions: result.actions,
          model: result.model,
        },
      ])

      setSyncingResults(true)
      try {
        const sessions = await loadAssistantLeadSessions()
        const sessionsById = new Map(
          sessions.map((session) => [session.id, session]),
        )
        const selected = result.leadIds
          .map((leadId) => sessionsById.get(leadId))
          .filter((session): session is ChatSession => Boolean(session))
        setResults(selected)
      } finally {
        setSyncingResults(false)
      }
    } catch (requestError) {
      if (
        requestError instanceof ApiRequestError &&
        requestError.code === 'OPENAI_NOT_CONFIGURED'
      ) {
        setAgentConfigured(false)
      }
      setError(agentErrorMessage(requestError))
    } finally {
      setRunningMode(null)
    }
  }

  const runDirectSearch = async (preset?: string) => {
    const content = (preset ?? input).trim()
    if (!content || running) return
    if (searchConfigured === false) {
      setError('当前没有可用的搜索提供器。请在 Railway 检查 Exa、mcporter 或 Agent Reach 上游渠道。')
      return
    }

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'user',
        content: `全网联系人搜索：${content}`,
      },
    ])
    setInput('')
    setError(null)
    setRunningMode('search')
    setSyncingResults(true)

    try {
      const execution = await searchCustomers({
        query: content,
        platforms: DIRECT_SEARCH_PLATFORMS,
        regions: DIRECT_SEARCH_REGIONS,
        customerTypes: DIRECT_SEARCH_CUSTOMER_TYPES,
        intentLevels: DIRECT_SEARCH_INTENT_LEVELS,
        includePublicContacts: true,
        maxResults: DIRECT_SEARCH_TARGET_RESULTS,
      })
      const taskResults = execution.customers
      const selected = taskResults.map((lead) => ({
        id: lead.id,
        customerName: lead.company ?? lead.displayName,
        displayName: lead.displayName,
        company: lead.company ?? null,
        avatarUrl: lead.avatarUrl ?? null,
        initials: lead.initials,
        platform: lead.platform,
        jobTitle: lead.jobTitle ?? null,
        sourceUrl: lead.sourceUrl,
        profileUrl: lead.profileUrl,
        postContent: lead.postContent,
        contacts: lead.contacts ?? [],
        audienceType: lead.audienceType ??
          (lead.customerType === 'Individual'
            ? 'person'
            : lead.customerType === 'Agent'
              ? 'intermediary'
              : 'company'),
        contactReadiness: (lead.contacts ?? []).length > 0 ? 'ready' : 'research',
        assistantScores: {
          overall: lead.signalScores?.overall ?? lead.analysis.intentScore,
          intent: lead.signalScores?.intent ?? lead.analysis.intentScore,
          identity: lead.signalScores?.identity ?? 55,
          evidence: lead.signalScores?.evidence ?? 55,
          contact: Math.min(100, (lead.contacts ?? []).length * 25),
        },
        communicationProfile: {
          language: 'unknown',
          tone: 'conversational',
          preferredPlatform: lead.platform,
          observedTopics: lead.analysis.tags,
          evidenceExcerpt: lead.postContent.slice(0, 360),
        },
        lastMessage: lead.postContent,
        lastMessageAt: lead.postedAt,
        unreadCount: 0,
        intentScore: lead.analysis.intentScore,
        tags: lead.analysis.tags,
      }) as unknown as ChatSession)
      const contactCount = selected.reduce(
        (total, session) => total + session.contacts.length,
        0,
      )

      setResults(selected)
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content:
            `全网数据搜索完成：发现 ${execution.customers.length} 个公开来源对象，` +
            `同步 ${selected.length} 个结构化档案和 ${contactCount} 个已观察联系人。` +
            '结果来自当前可用的 Agent Reach 上游、Exa/mcporter 与公开网页链路；缺失字段不会被推断。',
          model: 'Direct Search Pipeline',
        },
      ])
    } catch (requestError) {
      setError(directSearchErrorMessage(requestError))
    } finally {
      setSyncingResults(false)
      setRunningMode(null)
    }
  }

  const hasConversation = messages.length > 0

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(53,99,240,0.07),transparent_34rem),#f7f8fb]">
      <header className="sticky top-0 z-20 border-b border-ink-200/80 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">AI 情报指挥中心</p>
              <p className="truncate text-[10px] text-ink-400">
                Agent 回答与无 GPT 全网联系人搜索并行可用
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge
              configured={searchConfigured}
              label="全网搜索"
              disabledLabel="搜索未连接"
            />
            <StatusBadge
              configured={agentConfigured}
              label={selectedModelDetails?.label ?? selectedModel}
              disabledLabel="Agent 未配置"
            />
            <button
              type="button"
              onClick={() => void loadCapability()}
              disabled={checkingCapability}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:bg-ink-50 disabled:opacity-50"
              aria-label="重新检测模型和后端能力"
            >
              <RefreshCw className={cn('h-4 w-4', checkingCapability && 'animate-spin')} />
            </button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8',
          hasConversation
            ? 'pb-48 pt-7'
            : 'flex min-h-[calc(100vh-72px)] flex-col justify-center py-12',
        )}
      >
        {!hasConversation ? (
          <section className="mx-auto w-full max-w-4xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-200 bg-white text-brand-700 shadow-card">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              AGENT + DIRECT GLOBAL SEARCH
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-ink-950 sm:text-5xl">
              同一个输入框，既能问 Agent，也能直接搜索全网联系人
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-500 sm:text-base">
              有 GPT API 时运行多步 Agent；没有 GPT API 时，直接使用搜索提供器和公开来源链路返回对象、联系人与字段证据。
            </p>

            <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Capability icon={Globe2} title="全网搜索" detail="Agent Reach 上游与公开网页" />
              <Capability icon={DatabaseZap} title="对象与联系人" detail="字段级证据和观察时间" />
              <Capability icon={Radar} title="市场与收益" detail="信号、机会与风险排序" />
              <Capability icon={ShieldCheck} title="来源可信" detail="未知字段不猜测" />
            </div>

            <div className="mt-8">
              <CommandComposer
                value={input}
                running={running}
                runningMode={runningMode}
                agentAvailable={agentConfigured}
                searchAvailable={searchConfigured}
                model={selectedModel}
                modelOptions={modelOptions}
                onValueChange={setInput}
                onModelChange={setSelectedModel}
                onSubmit={(message) => void submit(message)}
                onSearch={(message) => void runDirectSearch(message)}
              />
            </div>
          </section>
        ) : (
          <div className="space-y-8">
            <AgentConversation messages={messages} running={running} />

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {error}
              </div>
            ) : null}

            <IntelligenceResultGrid
              sessions={results}
              loading={syncingResults}
              hasRun={messages.some((message) => message.role === 'assistant')}
            />
          </div>
        )}
      </main>

      {hasConversation ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/80 bg-white/92 px-4 pb-4 pt-3 backdrop-blur sm:px-6 lg:left-[228px] lg:right-0">
          <div className="pointer-events-auto mx-auto max-w-[1120px]">
            <CommandComposer
              compact
              value={input}
              running={running}
              runningMode={runningMode}
              agentAvailable={agentConfigured}
              searchAvailable={searchConfigured}
              model={selectedModel}
              modelOptions={modelOptions}
              onValueChange={setInput}
              onModelChange={setSelectedModel}
              onSubmit={(message) => void submit(message)}
              onSearch={(message) => void runDirectSearch(message)}
            />
          </div>
        </div>
      ) : null}

      {!hasConversation && error ? (
        <div className="fixed inset-x-4 bottom-5 z-30 mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 shadow-card sm:inset-x-6">
          {error}
        </div>
      ) : null}
    </div>
  )
}

function Capability({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Globe2
  title: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white/80 px-4 py-3 text-left shadow-sm">
      <Icon className="h-4 w-4 text-brand-600" />
      <p className="mt-2 text-xs font-semibold text-ink-800">{title}</p>
      <p className="mt-1 text-[10px] leading-4 text-ink-400">{detail}</p>
    </div>
  )
}

function StatusBadge({
  configured,
  label,
  disabledLabel,
}: {
  configured: boolean | null
  label: string
  disabledLabel: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold',
        configured === true
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : configured === false
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-ink-200 bg-ink-50 text-ink-500',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          configured === true
            ? 'bg-emerald-500'
            : configured === false
              ? 'bg-rose-500'
              : 'bg-ink-300',
        )}
      />
      {configured === false ? disabledLabel : label}
    </span>
  )
}

function createMessageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `message-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function missingOpenAIKeyMessage() {
  return '生产后端没有读取到 OPENAI_API_KEY。仍可点击“全网联系人搜索”；如需 Agent 回答，请在 Railway 服务端配置 GPT API 后重新部署。'
}

function agentErrorMessage(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error ? error.message : 'AI Agent 暂时无法执行本次任务。'
  }
  if (error.code === 'OPENAI_NOT_CONFIGURED') return missingOpenAIKeyMessage()
  if (error.code === 'UNSUPPORTED_OPENAI_MODEL') {
    return '所选模型没有被当前后端启用，请切换模型后重试。'
  }
  return error.message
}

function directSearchErrorMessage(error: unknown) {
  if (!(error instanceof ApiRequestError)) {
    return error instanceof Error ? error.message : '全网联系人搜索暂时不可用。'
  }
  if (error.status === 429) return '搜索提供器当前限流，请稍后重试。'
  return error.message
}
