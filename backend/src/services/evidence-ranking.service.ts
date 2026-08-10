import type {
  EvidenceFreshnessStatus,
  EvidenceRankingInput,
  EvidenceRankingResult,
  EvidenceSourceTier,
  EvidenceSourceType,
} from '../contracts/evidence-ranking.contract.js'

const DAY_MS = 24 * 60 * 60 * 1_000
const SOCIAL_HOSTS = [
  'reddit.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'xiaohongshu.com',
  'douyin.com',
  'kuaishou.com',
]
const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'bilibili.com']
const JOB_HOSTS = ['indeed.com', 'glassdoor.com', 'zhipin.com', '58.com']

export class EvidenceRankingService {
  rank(input: EvidenceRankingInput): EvidenceRankingResult {
    const metadata = record(input.rawMetadata)
    const now = input.now ?? new Date()
    const source = classifySource(input.sourceUrl, input.platform, metadata)
    const publication = readPublicationDate(metadata, now)
    const freshnessStatus = publication.date
      ? freshness(publication.date, now)
      : 'UNKNOWN'
    const reasons = [...source.reasons, ...publication.reasons]

    if (!publication.date) reasons.push('PUBLICATION_DATE_NEEDS_REVIEW')
    if (freshnessStatus === 'STALE') reasons.push('SOURCE_INFORMATION_STALE')
    if (input.evidenceStatus === 'VALID') reasons.push('EVIDENCE_VALIDATED')
    else reasons.push('EVIDENCE_VALIDATION_INCOMPLETE')
    if (input.identityStatus === 'VERIFIED') reasons.push('ENTITY_IDENTITY_VERIFIED')
    else reasons.push('ENTITY_IDENTITY_NEEDS_REVIEW')

    return {
      sourceTier: source.tier,
      sourceType: source.type,
      publishedAt: publication.date?.toISOString() ?? null,
      capturedAt: input.capturedAt.toISOString(),
      freshnessStatus,
      qualityScore: qualityScore(
        source.tier,
        freshnessStatus,
        input.evidenceStatus,
        input.identityStatus,
      ),
      corroborationRequired: source.tier === 'TIER_3',
      reasons: unique(reasons),
    }
  }
}

function classifySource(
  sourceUrl: string,
  platform: string | null | undefined,
  metadata: Record<string, unknown> | null,
): { tier: EvidenceSourceTier; type: EvidenceSourceType; reasons: string[] } {
  const explicit = text(metadata, ['sourceType', 'source_type', 'documentType'])
    ?.toLowerCase()
    .replace(/[\s-]+/g, '_')
  const hostname = safeHostname(sourceUrl)
  const platformName = platform?.toLowerCase() ?? ''

  if (explicit && ['company_website', 'official', 'company_news', 'newsroom'].includes(explicit)) {
    return { tier: 'TIER_1', type: 'COMPANY_WEBSITE', reasons: ['EXPLICIT_FIRST_PARTY_SOURCE'] }
  }
  if (explicit && ['government', 'regulator', 'public_authority'].includes(explicit)) {
    return { tier: 'TIER_1', type: 'GOVERNMENT', reasons: ['EXPLICIT_GOVERNMENT_SOURCE'] }
  }
  if (explicit && ['careers', 'company_careers'].includes(explicit)) {
    return { tier: 'TIER_1', type: 'CAREERS', reasons: ['EXPLICIT_FIRST_PARTY_SOURCE'] }
  }
  if (explicit && ['investor_relations', 'ir'].includes(explicit)) {
    return { tier: 'TIER_1', type: 'INVESTOR_RELATIONS', reasons: ['EXPLICIT_FIRST_PARTY_SOURCE'] }
  }
  if (explicit && ['news', 'news_media'].includes(explicit)) {
    return { tier: 'TIER_2', type: 'NEWS', reasons: ['EXPLICIT_EDITORIAL_SOURCE'] }
  }
  if (explicit && ['industry_media', 'industry_association'].includes(explicit)) {
    return { tier: 'TIER_2', type: 'INDUSTRY_MEDIA', reasons: ['EXPLICIT_EDITORIAL_SOURCE'] }
  }
  if (hostname.endsWith('.gov') || hostname.includes('.gov.')) {
    return { tier: 'TIER_1', type: 'GOVERNMENT', reasons: ['VERIFIABLE_GOVERNMENT_DOMAIN'] }
  }
  if (matchesHost(hostname, SOCIAL_HOSTS) || ['linkedin', 'x', 'reddit', 'instagram', 'xiaohongshu', 'douyin', 'kuaishou'].includes(platformName)) {
    return { tier: 'TIER_3', type: 'SOCIAL', reasons: ['SOCIAL_SOURCE_REQUIRES_CORROBORATION'] }
  }
  if (matchesHost(hostname, VIDEO_HOSTS) || platformName === 'youtube') {
    return { tier: 'TIER_3', type: 'VIDEO', reasons: ['SOCIAL_SOURCE_REQUIRES_CORROBORATION'] }
  }
  if (matchesHost(hostname, JOB_HOSTS)) {
    return { tier: 'TIER_3', type: 'JOB_PLATFORM', reasons: ['THIRD_PARTY_JOB_SOURCE'] }
  }
  return { tier: 'UNKNOWN', type: 'WEB', reasons: ['SOURCE_TIER_NEEDS_REVIEW'] }
}

function readPublicationDate(
  metadata: Record<string, unknown> | null,
  now: Date,
): { date: Date | null; reasons: string[] } {
  const value = text(metadata, ['publishedAt', 'publishedDate', 'publicationDate', 'date'])
  if (!value) return { date: null, reasons: [] }
  const parsed = new Date(value)
  const earliest = new Date('1990-01-01T00:00:00.000Z')
  if (Number.isNaN(parsed.getTime()) || parsed < earliest || parsed.getTime() > now.getTime() + DAY_MS) {
    return { date: null, reasons: ['PUBLICATION_DATE_INVALID'] }
  }
  return { date: parsed, reasons: ['PUBLICATION_DATE_VERIFIED'] }
}

function freshness(publishedAt: Date, now: Date): EvidenceFreshnessStatus {
  const ageDays = Math.max(0, (now.getTime() - publishedAt.getTime()) / DAY_MS)
  if (ageDays <= 30) return 'FRESH'
  if (ageDays <= 180) return 'RECENT'
  return 'STALE'
}

function qualityScore(
  tier: EvidenceSourceTier,
  freshnessStatus: EvidenceFreshnessStatus,
  evidenceStatus?: string | null,
  identityStatus?: string | null,
) {
  const sourceScore = { TIER_1: 40, TIER_2: 30, TIER_3: 15, UNKNOWN: 8 }[tier]
  const freshnessScore = { FRESH: 25, RECENT: 18, STALE: 5, UNKNOWN: 8 }[freshnessStatus]
  const evidenceScore = evidenceStatus === 'VALID' ? 20 : 5
  const identityScore = identityStatus === 'VERIFIED' ? 15 : 5
  return Math.min(100, sourceScore + freshnessScore + evidenceScore + identityScore)
}

function safeHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function matchesHost(hostname: string, domains: string[]) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(recordValue: Record<string, unknown> | null, keys: string[]) {
  if (!recordValue) return null
  for (const key of keys) {
    const value = recordValue[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function unique(values: string[]) {
  return [...new Set(values)]
}

export const evidenceRankingService = new EvidenceRankingService()
