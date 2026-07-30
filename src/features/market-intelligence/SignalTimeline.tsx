import { CheckCircle2, Clock3, SearchX } from 'lucide-react'
import type { MarketSignal } from '@/types'
import { Surface } from '@/components/ui/Surface'
import { WorkspaceEmpty } from '@/components/ui/WorkspaceState'
import { cn } from '@/lib/utils'
import { SIGNAL_META } from './market-intelligence.meta'

export function SignalTimeline({
  signals,
  selectedId,
  onSelect,
  unavailable = false,
}: {
  signals: MarketSignal[]
  selectedId: string | null
  onSelect: (id: string) => void
  unavailable?: boolean
}) {
  const orderedSignals = [...signals].sort(
    (a, b) =>
      new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  )

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">市场信号时间线</h2>
          <p className="mt-1 text-xs text-ink-500">
            只展示已经保存的真实市场变化
          </p>
        </div>
        <Clock3 className="h-4 w-4 text-ink-400" />
      </div>

      {orderedSignals.length > 0 ? (
        <div className="max-h-[486px] overflow-y-auto p-3 scrollbar-thin">
          {orderedSignals.map((signal) => {
            const meta = SIGNAL_META[signal.signalType]
            const Icon = meta.icon
            const active = signal.id === selectedId

            return (
              <button
                key={signal.id}
                type="button"
                onClick={() => onSelect(signal.id)}
                className={cn(
                  'group relative flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition',
                  active
                    ? 'border-brand-200 bg-brand-50/70'
                    : 'border-transparent hover:border-ink-200 hover:bg-ink-50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    active
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'bg-ink-100 text-ink-500',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-brand-700">
                      {meta.label}
                    </span>
                    <span className="text-[9px] text-ink-400">
                      {formatTime(signal.detectedAt)}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-5 text-ink-800">
                    {signal.title}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-500">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    有真实来源
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <WorkspaceEmpty
          icon={SearchX}
          title={
            unavailable
              ? '暂时无法读取信号时间线'
              : '还没有可展示的市场信号'
          }
          description={
            unavailable
              ? '当前请求未成功，系统不会展示旧数据或模拟信号。'
              : '系统只会在真实来源通过基础验证后，才把变化加入时间线。'
          }
        />
      )}
    </Surface>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
