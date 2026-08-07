import { Bot, Loader2, Search, Sparkles } from 'lucide-react'
import type { SalesAgentModelOption } from '@/types'

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
  return (
    <div className={compact ? '' : 'mx-auto w-full max-w-3xl'}>
      <div className="overflow-hidden rounded-[24px] border border-ink-200 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.32)] transition focus-within:border-ink-300 focus-within:shadow-[0_20px_60px_-38px_rgba(15,23,42,0.4)]">
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
          rows={compact ? 2 : 2}
          placeholder="问 Agent，或直接搜索联系人与市场信号"
          className="min-h-[76px] w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-7 text-ink-950 placeholder:text-ink-400 focus:outline-none sm:px-5"
          aria-label="输入 AI 或全网搜索任务"
        />
        <div className="flex flex-col gap-2 px-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-600" />
            <select
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={running || agentAvailable === false}
              className="max-w-[190px] bg-transparent text-xs font-medium text-ink-700 focus:outline-none disabled:text-ink-400"
              aria-label="选择 AI 模型"
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => onSearch()}
              disabled={running || !value.trim() || searchAvailable === false}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-xs font-medium text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-300"
              title={searchAvailable === false ? '搜索提供器未连接' : '不依赖 GPT API，直接运行搜索任务'}
            >
              {runningMode === 'search' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {runningMode === 'search' ? '搜索中' : '搜索'}
            </button>
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={running || !value.trim() || agentAvailable === false}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-medium text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
              title={agentAvailable === false ? 'Railway 尚未配置 GPT API' : '使用模型理解目标并编排多步工具'}
            >
              {runningMode === 'agent' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
              {runningMode === 'agent' ? '执行中' : 'Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
