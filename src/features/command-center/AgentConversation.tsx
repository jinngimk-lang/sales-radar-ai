import { Bot, CheckCircle2, Loader2, UserRound, XCircle } from 'lucide-react'
import type { SalesAgentAction } from '@/types'
import { cn } from '@/lib/utils'

export interface CommandMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  actions?: SalesAgentAction[]
}

interface AgentConversationProps {
  messages: CommandMessage[]
  running: boolean
}

export function AgentConversation({ messages, running }: AgentConversationProps) {
  if (messages.length === 0 && !running) return null

  return (
    <section className="space-y-5" aria-label="AI 任务对话与工具轨迹">
      {messages.map((message) => (
        <article
          key={message.id}
          className={cn(
            'flex items-start gap-3',
            message.role === 'user' && 'flex-row-reverse',
          )}
        >
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
              message.role === 'assistant'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-white text-ink-500',
            )}
          >
            {message.role === 'assistant' ? (
              <Bot className="h-4 w-4" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
          </span>

          <div
            className={cn(
              'min-w-0 max-w-[92%] rounded-3xl px-4 py-3.5 sm:max-w-[82%] sm:px-5',
              message.role === 'assistant'
                ? 'border border-ink-200 bg-white text-ink-800 shadow-sm'
                : 'bg-brand-700 text-white',
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>

            {message.actions?.length ? (
              <div className="mt-4 space-y-2 border-t border-ink-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Agent 工具执行轨迹
                </p>
                {message.actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-2 rounded-xl bg-ink-50/80 px-3 py-2.5"
                  >
                    {action.status === 'completed' ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-ink-800">
                        {toolLabel(action.tool)}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-5 text-ink-500">
                        {action.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {message.role === 'assistant' && message.model ? (
              <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                {message.model}
              </p>
            ) : null}
          </div>
        </article>
      ))}

      {running ? (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          GPT 正在选择工具、搜索公开来源并整理结构化结果…
        </div>
      ) : null}
    </section>
  )
}

function toolLabel(tool: string) {
  const labels: Record<string, string> = {
    discover_leads: '搜索市场与潜在对象',
    list_sales_candidates: '读取候选对象',
    inspect_lead: '核对对象与来源',
    discover_public_contacts: '补全公开联系人',
    research_lead: '研究公司与商业信号',
    generate_outreach: '生成建议动作与触达草稿',
  }
  return labels[tool] ?? tool
}
