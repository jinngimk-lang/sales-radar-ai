import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_10px_24px_-16px_rgba(37,99,235,0.9)] hover:-translate-y-0.5 hover:bg-brand-700',
  secondary:
    'border border-ink-200 bg-white text-ink-800 shadow-sm hover:-translate-y-0.5 hover:border-ink-300 hover:bg-ink-50',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-xl px-3.5 text-xs',
  md: 'min-h-11 rounded-xl px-5 text-sm',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    />
  )
}
