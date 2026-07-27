import type { Platform } from '@/types'
import { PLATFORM_META } from '@/data/meta'

interface PlatformIconProps {
  platform: Platform
  className?: string
  /** 显示文字标签而非纯图标 */
  withLabel?: boolean
}

/**
 * 平台图标组件
 * 使用首字母 + 主题色作为视觉标识，避免引入整套品牌 SVG。
 * 未来可替换为真实的平台官方图标。
 */
export function PlatformIcon({ platform, className = 'w-4 h-4', withLabel = false }: PlatformIconProps) {
  const meta = PLATFORM_META[platform]
  const initial = platform === 'Xiaohongshu' ? '红' : platform[0]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center rounded-md font-bold text-white ${className}`}
        style={{ backgroundColor: meta.color, minWidth: '1em', minHeight: '1em' }}
      >
        <span className="text-[0.65em] leading-none">{initial}</span>
      </span>
      {withLabel && <span className="text-xs font-medium text-ink-600">{meta.label}</span>}
    </span>
  )
}
