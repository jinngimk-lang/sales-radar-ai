import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** 浅色背景版本 */
  variant?: 'default' | 'light'
}

/** Sales Radar AI 品牌 Logo */
export function Logo({ className, variant = 'default' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-ink-900'
  const subColor = variant === 'light' ? 'text-white/60' : 'text-ink-500'
  const lineColor = variant === 'light' ? '#ffffff' : '#2563eb'

  return (
    <div className={cn('group flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5',
          variant === 'light'
            ? 'border-white/20 bg-white/10'
            : 'border-ink-200 bg-white',
        )}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="h-8 w-8"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="18"
            r="14.75"
            stroke={lineColor}
            strokeOpacity="0.32"
            strokeWidth="1.15"
          />
          <circle
            cx="18"
            cy="18"
            r="8.75"
            stroke={lineColor}
            strokeOpacity="0.62"
            strokeWidth="1.15"
          />
          <path
            d="M18 3.25V32.75M3.25 18H32.75"
            stroke={lineColor}
            strokeOpacity="0.18"
            strokeWidth="1"
          />
          <path
            d="M18 18L28.75 10"
            stroke={lineColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="18" cy="18" r="2.45" fill={lineColor} />
          <circle cx="28" cy="10.75" r="2.15" fill={lineColor} />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.03em]',
            textColor,
          )}
        >
          Sales Radar
          <span
            className={cn(
              'rounded-md px-1.5 py-1 text-[9px] font-bold tracking-[0.08em]',
              variant === 'light'
                ? 'bg-white/10 text-white'
                : 'bg-brand-50 text-brand-700',
            )}
          >
            AI
          </span>
        </span>
        <span
          className={cn(
            'mt-1.5 text-[9px] font-medium tracking-[0.11em]',
            subColor,
          )}
        >
          销售机会发现平台
        </span>
      </div>
    </div>
  )
}
