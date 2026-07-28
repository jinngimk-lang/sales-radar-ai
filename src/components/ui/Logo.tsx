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

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="relative h-8 w-8">
        <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
          <rect width="32" height="32" rx="8" fill="#2046d8" />
          <circle cx="16" cy="16" r="3.5" fill="#fff" />
          <circle cx="16" cy="16" r="8.5" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" />
          <circle cx="16" cy="16" r="13" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.6" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn('text-[15px] font-bold tracking-tight', textColor)}>
          Sales Radar <span className="text-brand-500">AI</span>
        </span>
        <span className={cn('text-[10px] font-medium', subColor)}>销售机会发现平台</span>
      </div>
    </div>
  )
}
