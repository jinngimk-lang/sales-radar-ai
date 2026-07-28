import { MarketSignalType } from '@prisma/client'
import type { SearchResult } from '../../providers/search/search-provider.interface.js'
import type { MarketSignalCandidate } from './market-source-adapter.interface.js'
import { sanitizeProviderString } from '../safe-json.service.js'

interface SignalRule {
  type: MarketSignalType
  patterns: RegExp[]
}

const SIGNAL_RULES: SignalRule[] = [
  {
    type: MarketSignalType.FACTORY_EXPANSION,
    patterns: [
      /\bfactory expansion\b/i,
      /\bexpand(?:s|ed|ing)?\s+(?:its\s+)?(?:factory|plant|production|manufacturing)/i,
      /\bnew (?:factory|plant|production line|manufacturing site)\b/i,
      /\bmanufacturing capacity\b/i,
      /工厂扩建|扩建工厂|新工厂|新产线|扩大产能|产能扩张/,
    ],
  },
  {
    type: MarketSignalType.INVESTMENT,
    patterns: [
      /\b(?:invest|investment|capital expenditure|funding)\b/i,
      /\b(?:million|billion)\b.{0,30}\b(?:plant|factory|facility|technology)\b/i,
      /企业投资|宣布投资|资本投入|融资|增资/,
    ],
  },
  {
    type: MarketSignalType.DIGITAL_TRANSFORMATION,
    patterns: [
      /\bdigital transformation\b/i,
      /\b(?:automation|digitalization|modernization) (?:upgrade|project|initiative)\b/i,
      /\b(?:deploy|implement|adopt)(?:s|ed|ing)?\b.{0,30}\b(?:ERP|MES|AI|automation|software)\b/i,
      /数字化转型|数字化升级|自动化改造|智能制造|系统升级/,
    ],
  },
  {
    type: MarketSignalType.HIRING_SIGNAL,
    patterns: [
      /\b(?:hiring|recruiting|vacancies|job openings)\b/i,
      /\bseeking (?:an?|new) .{0,30}(?:engineer|director|manager)\b/i,
      /招聘|招募|职位空缺|扩充团队/,
    ],
  },
  {
    type: MarketSignalType.POLICY_CHANGE,
    patterns: [
      /\b(?:policy|regulation|subsidy|incentive|government program)\b/i,
      /政策变化|产业政策|政府补贴|扶持计划|新规|法规变化/,
    ],
  },
  {
    type: MarketSignalType.INDUSTRY_TREND,
    patterns: [
      /\b(?:market|industry) (?:growth|outlook|trend)\b/i,
      /\bdemand (?:is )?(?:growing|rising|increasing)\b/i,
      /行业趋势|市场增长|需求增长|市场需求变化/,
    ],
  },
]

export function extractMarketSignalCandidates(
  result: SearchResult,
  sourceType: string,
  detectedAt = new Date(),
): MarketSignalCandidate[] {
  const sourceUrl = sanitizeProviderString(result.sourceUrl).trim()
  if (!isHttpUrl(sourceUrl)) return []

  const title = readMetadataText(result.metadata, ['title', 'name'])
  if (!title) return []

  const content = sanitizeProviderString(result.rawContent).trim()
  const searchable = `${title}\n${content}`
  if (!content) return []

  const companyName = knownValue(result.company)
  const matches = SIGNAL_RULES.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(searchable)),
  )

  return matches.map((rule) => {
    const titleMatch = rule.patterns.some((pattern) => pattern.test(title))
    const confidence = Math.min(
      90,
      55 + (titleMatch ? 15 : 0) + (companyName ? 10 : 0) + 5,
    )

    return {
      sourceType,
      sourceUrl,
      title,
      summary: excerpt(content, 420),
      content,
      companyName,
      country: knownValue(result.country),
      region: knownValue(result.region),
      signalType: rule.type,
      confidence,
      detectedAt,
    }
  })
}

function readMetadataText(
  metadata: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return sanitizeProviderString(value).trim()
    }
  }
  return null
}

function knownValue(value: unknown) {
  if (typeof value !== 'string') return undefined
  const normalized = sanitizeProviderString(value).trim()
  if (!normalized || /^(unknown|n\/a|null)$/i.test(normalized)) return undefined
  return normalized
}

function excerpt(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
