export type EvidenceSourceTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNKNOWN'

export type EvidenceSourceType =
  | 'COMPANY_WEBSITE'
  | 'GOVERNMENT'
  | 'CAREERS'
  | 'INVESTOR_RELATIONS'
  | 'NEWS'
  | 'INDUSTRY_MEDIA'
  | 'SOCIAL'
  | 'VIDEO'
  | 'JOB_PLATFORM'
  | 'WEB'

export type EvidenceFreshnessStatus =
  | 'FRESH'
  | 'RECENT'
  | 'STALE'
  | 'UNKNOWN'

export interface EvidenceRankingInput {
  sourceUrl: string
  provider: string
  platform?: string | null
  rawMetadata?: unknown
  capturedAt: Date
  identityStatus?: string | null
  evidenceStatus?: string | null
  now?: Date
}

export interface EvidenceRankingResult {
  sourceTier: EvidenceSourceTier
  sourceType: EvidenceSourceType
  publishedAt: string | null
  capturedAt: string
  freshnessStatus: EvidenceFreshnessStatus
  qualityScore: number
  corroborationRequired: boolean
  reasons: string[]
}
