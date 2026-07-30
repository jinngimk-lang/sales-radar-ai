import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'default' | 'subtle'
}

export function Surface({
  className,
  tone = 'default',
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200',
        tone === 'default'
          ? 'bg-white shadow-card'
          : 'bg-ink-50/75',
        className,
      )}
      {...props}
    />
  )
}
