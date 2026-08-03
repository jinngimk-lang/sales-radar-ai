import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  initials: string
  /** 真实公开头像 URL，加载失败时自动回退到首字母。 */
  src?: string | null
  alt?: string
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

/** 优先展示来源返回的真实头像，缺失或失效时使用首字母占位。 */
export function Avatar({
  initials,
  src,
  alt,
  color,
  size = 'md',
  className,
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  const showImage = Boolean(src && !imageFailed)

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        sizeMap[size],
        className,
      )}
      style={
        color
          ? { backgroundColor: color }
          : { background: 'linear-gradient(135deg, #3563f0 0%, #2046d8 100%)' }
      }
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt || initials}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  )
}
