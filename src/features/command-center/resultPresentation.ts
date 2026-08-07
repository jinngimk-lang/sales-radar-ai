import type { ChatSession } from '@/types'

export type PotentialTone = 'strong' | 'medium' | 'low' | 'neutral'
export type PotentialLabel = '高潜' | '中潜' | '低潜' | '未评分'

export function sortCommandSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((left, right) => {
    const leftScore = finiteScore(left.assistantScores?.overall)
    const rightScore = finiteScore(right.assistantScores?.overall)

    if (leftScore === null && rightScore !== null) return 1
    if (leftScore !== null && rightScore === null) return -1
    if (leftScore !== null && rightScore !== null && leftScore !== rightScore) {
      return rightScore - leftScore
    }

    const contactDifference = right.contacts.length - left.contacts.length
    if (contactDifference !== 0) return contactDifference

    return left.customerName.localeCompare(right.customerName, 'zh-CN')
  })
}

export function getPotentialBand(score?: number): {
  label: PotentialLabel
  tone: PotentialTone
} {
  const value = finiteScore(score)
  if (value === null) return { label: '未评分', tone: 'neutral' }
  if (value >= 75) return { label: '高潜', tone: 'strong' }
  if (value >= 50) return { label: '中潜', tone: 'medium' }
  return { label: '低潜', tone: 'low' }
}

function finiteScore(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
