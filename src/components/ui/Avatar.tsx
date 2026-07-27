import { cn } from '@/lib/utils'

interface AvatarProps {
  initials: string
  /** 背景色，默认品牌蓝 */
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
}

/** 头像组件，使用首字母 + 渐变色作为占位 */
export function Avatar({ initials, color, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizeMap[size],
        className,
      )}
      style={
        color
          ? { backgroundColor: color }
          : { background: 'linear-gradient(135deg, #3563f0 0%, #2046d8 100%)' }
      }
    >
      {initials}
    </div>
  )
}
