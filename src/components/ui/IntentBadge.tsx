import { cn, intentLevelMeta } from '@/lib/utils'
import type { IntentLevel } from '@/types'

interface IntentBadgeProps {
  level: IntentLevel
  className?: string
}

/** 意向等级徽章 */
export function IntentBadge({ level, className }: IntentBadgeProps) {
  const meta = intentLevelMeta[level]
  return (
    <span className={cn('chip', meta.bg, meta.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

interface IntentScoreBarProps {
  score: number
  className?: string
}

/** 意向评分进度条 */
export function IntentScoreBar({ score, className }: IntentScoreBarProps) {
  const level: IntentLevel = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low'
  const meta = intentLevelMeta[level]
  const barColor =
    level === 'high' ? 'bg-emerald-500' : level === 'medium' ? 'bg-amber-500' : 'bg-ink-400'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums leading-none', meta.text)}>
        {score}%
      </span>
    </div>
  )
}
