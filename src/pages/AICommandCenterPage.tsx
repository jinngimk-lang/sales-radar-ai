import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, RefreshCw, X } from 'lucide-react'
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
import { customersToCommandSessions } from '@/features/command-center/customersToCommandSessions'
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

const STARTER_PROMPTS = [
  {
    label: '找联系人',
    value: '寻找目标企业的公开负责人和联系人，按潜力和证据强度排序。',
  },
  {
    label: '研究市场',
    value: '研究一个市场最近发生的真实变化，给出来源、机会和风险。',
  },
  {
    label: '找收益',
    value: '寻找规则明确、可验证结算的收益机会，并按风险调整后收益排序。',
  },
]

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
  const [agentVisible, setAgentVisible] = useState(false)
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

    setAgentVisible(true)
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

    setAgentVisible(false)
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
      const selected = customersToCommandSessions(execution.customers)
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

  const hasWorkspaceActivity =
    messages.length > 0 || results.length > 0 || running || syncingResults

  return (
    <div className="min-h-full bg-[#f7f7f8]">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-950 text-white">
              <Bot className="h-4 w-4" />
            </span>
            <p className="truncate text-sm font-medium text-ink-900">Sales Radar AI</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge
              configured={searchConfigured}
              label="搜索"
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 disabled:opacity-50"
              aria-label="重新检测模型和后端能力"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', checkingCapability && 'animate-spin')} />
            </button>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8',
          hasWorkspaceActivity
            ? 'pb-48 pt-7'
            : 'flex min-h-[calc(100vh-64px)] flex-col justify-center py-12',
        )}
      >
        {!hasWorkspaceActivity ? (
          <section className="mx-auto w-full max-w-3xl">
            <h1 className="mb-8 text-center text-2xl font-medium tracking-[-0.035em] text-ink-950 sm:text-[32px]">
              今天要研究什么？
            </h1>
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
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => setInput(starter.value)}
                  className="rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-xs text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                >
                  {starter.label}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            {agentVisible ? (
              <section className="rounded-[24px] border border-black/[0.08] bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/[0.06] pb-3">
                  <p className="text-xs font-medium text-ink-900">Agent</p>
                  <button
                    type="button"
                    onClick={() => setAgentVisible(false)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
                    aria-label="收起 Agent"
                  >
                    <X className="h-3.5 w-3.5" /> 收起
                  </button>
                </div>
                <AgentConversation messages={messages} running={running} />
              </section>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {error}
              </div>
            ) : null}

            <IntelligenceResultGrid
              sessions={results}
              loading={syncingResults}
              hasRun={messages.some((message) => message.role === 'assistant')}
              onAskAgent={(session) => void submit(buildDeepDivePrompt(session))}
            />
          </div>
        )}
      </main>

      {hasWorkspaceActivity ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/94 px-4 pb-4 pt-3 backdrop-blur sm:px-6 lg:left-[208px] lg:right-0">
          <div className="pointer-events-auto mx-auto max-w-[980px]">
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

      {!hasWorkspaceActivity && error ? (
        <div className="fixed inset-x-4 bottom-5 z-30 mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 sm:inset-x-6">
          {error}
        </div>
      ) : null}
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium',
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

function buildDeepDivePrompt(session: ChatSession) {
  const identity = [session.jobTitle, session.company]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' · ')
  return [
    `请深挖当前选中的公开来源对象：${session.customerName}${identity ? `（${identity}）` : ''}。`,
    '只使用当前工作区已验证证据和你能通过现有工具继续核验的公开来源。',
    '先判断真实商业信号、身份与联系人缺口，再给风险和下一步动作。',
    '如果证据足够，再给一版自然、低压力、像真人写的联络建议；证据不足就明确还缺什么，不要猜测。',
  ].join(' ')
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
