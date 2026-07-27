/**
 * CRM 跟进状态选择条
 * 卡片底部紧凑控件：一键切换 未联系 / 已联系 / 沟通中 / 已成交 / 已流失
 */
import { Check, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { FOLLOW_UP_STATUS_META, ALL_FOLLOW_UP_STATUSES } from '@/data/meta'
import { cn } from '@/lib/utils'
import { useCrmRecord, useCrmActions } from '@/lib/useCrm'

interface CRMStatusBarProps {
  customerId: string
  className?: string
  /** 紧凑模式（卡片内）还是展开模式（详情页） */
  variant?: 'compact' | 'full'
}

export function CRMStatusBar({ customerId, className, variant = 'compact' }: CRMStatusBarProps) {
  const crm = useCrmRecord(customerId)
  const { setStatus } = useCrmActions(customerId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = FOLLOW_UP_STATUS_META[crm.followUpStatus]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (variant === 'full') {
    return (
      <div className={className}>
        <p className="mb-2 text-xs font-medium text-ink-500">跟进状态</p>
        <div className="flex flex-wrap gap-2">
          {ALL_FOLLOW_UP_STATUSES.map((s) => {
            const active = crm.followUpStatus === s.key
            return (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  active ? cn(s.color, 'ring-1 ring-current ring-offset-1') : 'bg-ink-50 text-ink-500 hover:bg-ink-100',
                )}
              >
                {active && <Check className="h-3 w-3" />}
                <span className={cn('h-1.5 w-1.5 rounded-full', s.dotClass)} />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
          current.color,
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', current.dotClass)} />
          {current.label}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-20 mb-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {ALL_FOLLOW_UP_STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setStatus(s.key)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-ink-50',
                crm.followUpStatus === s.key && 'bg-ink-50',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', s.dotClass)} />
              <span className="flex-1 text-ink-700">{s.label}</span>
              {crm.followUpStatus === s.key && <Check className="h-3 w-3 text-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
