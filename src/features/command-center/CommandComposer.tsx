import { ArrowRight, Loader2, Send, Sparkles } from 'lucide-react'
import type { SalesAgentModelOption } from '@/types'

const STARTERS = [
  '寻找新加坡 10–100 人电商公司，找到公开负责人和字段证据，按优先级输出。',
  '研究正在扩张或招聘的工业自动化企业，列出来源、联系人和下一步。',
  '寻找零本金、规则明确、可验证结算的收益机会，并说明风险和执行路径。',
]

export interface CommandComposerProps {
  value: string
  running: boolean
  model: string
  modelOptions: SalesAgentModelOption[]
  compact?: boolean
  onValueChange(value: string): void
  onModelChange(model: string): void
  onSubmit(message?: string): void
}

export function CommandComposer({
  value,
  running,
  model,
  modelOptions,
  compact = false,
  onValueChange,
  onModelChange,
  onSubmit,
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
                直接执行 <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
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
          placeholder="描述你要寻找的人、企业、市场信号或收益机会；Agent 会调用真实工具并陈列来源数据。"
          className="min-h-[72px] w-full resize-none bg-transparent px-5 pb-3 pt-5 text-sm leading-7 text-ink-900 placeholder:text-ink-400 focus:outline-none sm:px-6"
          aria-label="输入 AI 任务"
        />
        <div className="flex flex-col gap-3 border-t border-ink-100 bg-ink-50/55 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
            <select
              value={model}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={running}
              className="max-w-[210px] bg-transparent text-xs font-semibold text-ink-800 focus:outline-none"
              aria-label="选择 AI 模型"
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="hidden truncate text-[10px] text-ink-400 md:block">
              {selected?.description}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSubmit()}
            disabled={running || !value.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {running ? '执行中' : '交给 Agent'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] leading-4 text-ink-400">
        仅展示真实来源与当前工作区数据；外部发送、登录、付款和账户操作不会自动执行。
      </p>
    </div>
  )
}
