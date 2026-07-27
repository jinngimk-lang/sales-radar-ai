/**
 * 通用工具函数
 */

/** 拼接 className，过滤 falsy 值 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** 根据意向评分返回等级 */
export function scoreToLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

/** 意向等级对应的中文标签与颜色 */
export const intentLevelMeta: Record<
  'high' | 'medium' | 'low',
  { label: string; text: string; bg: string; dot: string }
> = {
  high: {
    label: '高意向',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: '中意向',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
  },
  low: {
    label: '低意向',
    text: 'text-ink-500',
    bg: 'bg-ink-100',
    dot: 'bg-ink-400',
  },
}

/** 简单延时，模拟异步请求 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 生成简易 id */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}
