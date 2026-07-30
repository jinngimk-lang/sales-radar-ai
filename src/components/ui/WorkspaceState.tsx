import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AgentWorkspaceStatus =
  | 'idle'
  | 'running'
  | 'reviewing'
  | 'completed'
  | 'failed'

const STATUS_META: Record<
  AgentWorkspaceStatus,
  { label: string; dot: string; text: string }
> = {
  idle: {
    label: '等待设置目标',
    dot: 'bg-ink-400',
    text: 'text-ink-600',
  },
  running: {
    label: '市场侦察运行中',
    dot: 'bg-brand-600 animate-pulse',
    text: 'text-brand-700',
  },
  reviewing: {
    label: '正在整理真实来源',
    dot: 'bg-amber-500 animate-pulse',
    text: 'text-amber-700',
  },
  completed: {
    label: '本次扫描已完成',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  failed: {
    label: '本次扫描未完成',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
  },
}

export function AgentStatusBadge({
  status,
}: {
  status: AgentWorkspaceStatus
}) {
  const meta = STATUS_META[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm',
        meta.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

export function WorkspaceLoading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-700">
        <Loader2 className="h-5 w-5 animate-spin" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-ink-500">
        {description}
      </p>
    </div>
  )
}

export function WorkspaceEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-500 shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-ink-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
