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
  SalesAgentHistoryMessage,
  SalesAgentModelOption,
} from '@/types'
import {
  ApiRequestError,
  getChatSessions,
  getRuntimeCapabilities,
  runSalesAgent,
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

export function AICommandCenterPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<CommandMessage[]>([])
  const [results, setResults] = useState<ChatSession[]>([])
  const [running, setRunning] = useState(false)
  const [syncingResults, setSyncingResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelOptions, setModelOptions] =
    useState<SalesAgentModelOption[]>(FALLBACK_MODELS)
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].id)
  const [agentConfigured, setAgentConfigured] = useState<boolean | null>(null)
  const [checkingCapability, setCheckingCapability] = useState(false)

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
    } catch {
      setAgentConfigured(null)
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
    setRunning(true)

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
        const sessions = await getChatSessions()
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
      setRunning(false)
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
                一句话调用搜索、联系人、研究、市场与收益工具
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge configured={agentConfigured} label={selectedModelDetails?.label ?? selectedModel} />
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
          hasConversation ? 'pb-44 pt-7' : 'flex min-h-[calc(100vh-72px)] flex-col justify-center py-12',
        )}
      >
        {!hasConversation ? (
          <section className="mx-auto w-full max-w-4xl text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-200 bg-white text-brand-700 shadow-card">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              GPT-5.6 SOL · SOURCE-BACKED AGENT
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-ink-950 sm:text-5xl">
              描述目标，直接得到人、公司、联系人、证据和行动方案
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-500 sm:text-base">
              不再先选择模块。输入一句任务，Agent 会调用现有真实搜索与研究工具，并把所有可验证数据按对象陈列出来。
            </p>

            <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Capability icon={Globe2} title="联网搜索" detail="打开公开网页与来源" />
              <Capability icon={DatabaseZap} title="对象与联系人" detail="字段级证据和观察时间" />
              <Capability icon={Radar} title="市场与收益" detail="信号、机会与风险排序" />
              <Capability icon={ShieldCheck} title="来源可信" detail="未知字段不猜测" />
            </div>

            <div className="mt-8">
              <CommandComposer
                value={input}
                running={running}
                model={selectedModel}
                modelOptions={modelOptions}
                onValueChange={setInput}
                onModelChange={setSelectedModel}
                onSubmit={(message) => void submit(message)}
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/80 bg-white/92 px-4 pb-4 pt-3 backdrop-blur sm:px-6 lg:pl-[260px] lg:pr-8">
          <div className="mx-auto max-w-[1120px]">
            <CommandComposer
              compact
              value={input}
              running={running}
              model={selectedModel}
              modelOptions={modelOptions}
              onValueChange={setInput}
              onModelChange={setSelectedModel}
              onSubmit={(message) => void submit(message)}
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
}: {
  configured: boolean | null
  label: string
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
      {configured === false ? '模型未配置' : label}
    </span>
  )
}

function createMessageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `message-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function missingOpenAIKeyMessage() {
  return '生产后端没有读取到 OPENAI_API_KEY。请在 Railway 目标 Service 的 Production Variables 中配置后重新部署；密钥不能放进 VITE_* 或浏览器变量。'
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
