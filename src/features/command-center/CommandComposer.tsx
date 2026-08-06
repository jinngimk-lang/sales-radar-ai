import {
  ArrowRight,
  Bot,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import type { SalesAgentModelOption } from '@/types'

const STARTERS = [
  '寻找新加坡 10–100 人电商公司，找到公开负责人和字段证据，按优先级输出。',
  '研究正在扩张或招聘的工业自动化企业，列出来源、联系人和下一步。',
  '寻找零本金、规则明确、可验证结算的收益机会，并说明风险和执行路径。',
]

export interface CommandComposerProps {
  value: string
  running: boolean
  runningMode?: 'agent' | 'search' | null
  agentAvailable?: boolean | null
  searchAvailable?: boolean | null
  model: string
  modelOptions: SalesAgentModelOption[]
  compact?: boolean
  onValueChange(value: string): void
  onModelChange(model: string): void
  onSubmit(message?: string): void
  onSearch(message?: string): void
}

export function CommandComposer({
  value,
  running,
  runningMode = null,
  agentAvailable = null,
  searchAvailable = null,
  model,
  modelOptions,
  compact = false,
  onValueChange,
  onModelChange,
  onSubmit,
  onSearch,
}: CommandComposerProps) {
  const selected = modelOptions.find((option) => option.id === model)

  return (
    <div className={compact ? '' : 'mx-auto w-full max-w-4xl'}>
      {!compact ? (
        <div className="mb-5 grid gap-2 md:grid-cols-3">
          {STARTERS.map((starter, index) => (
            <button
              key={starter}
              type="button"
              disabled={running}
              onClick={() => onSubmit(starter)}
              className="group rounded-2xl border border-ink-200 bg-white/85 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card disabled:opacity-50"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                示例 {index + 1}
              </span>
              <span className="mt-2 block text-xs leading-5 text-ink-650">{starter}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700">
                交给 Agent <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-ink-300 bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)] focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
          rows={compact ? 2 : 3}
          placeholder="输入目标。可让 Agent 分析编排，也可直接全网搜索公开联系人与来源证据。"
          className="min-h-[72px] w-full resize-none bg-transparent px-5 pb-3 pt-5 text-sm leading-7 text-ink-900 placeholder:text-ink-400 focus:outline-none sm:px-6"
          aria-label="输入 AI 或全网搜索任务"
        />
        <div className="flex flex-col gap-3 border-t border-ink-100 bg-ink-50/55 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
            <select
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={running || agentAvailable === false}
              className="max-w-[210px] bg-transparent text-xs font-semibold text-ink-800 focus:outline-none disabled:text-ink-400"
              aria-label="选择 AI 模型"
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="hidden truncate text-[10px] text-ink-400 md:block">
              {agentAvailable === false ? 'GPT 未配置，仍可使用全网联系人搜索' : selected?.description}
            </span>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => onSearch()}
              disabled={running || !value.trim() || searchAvailable === false}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-xs font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-ink-200 disabled:bg-ink-100 disabled:text-ink-400"
              title={searchAvailable === false ? '搜索提供器未连接' : '不依赖 GPT API，直接运行搜索任务'}
            >
              {runningMode === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {runningMode === 'search' ? '搜索中' : '全网联系人搜索'}
            </button>
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={running || !value.trim() || agentAvailable === false}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
              title={agentAvailable === false ? 'Railway 尚未配置 GPT API' : '使用模型理解目标并编排多步工具'}
            >
              {runningMode === 'agent' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {runningMode === 'agent' ? 'Agent 执行中' : 'Agent 回答'}
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] leading-4 text-ink-400">
        全网搜索可在没有 GPT API 时运行；仅展示公开、允许访问且带来源的业务联系人信息。
      </p>
    </div>
  )
}
