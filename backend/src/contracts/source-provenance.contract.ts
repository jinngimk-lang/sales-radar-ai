export type SourceCategory = 'WEB' | 'NEWS' | 'SOCIAL' | 'VIDEO' | 'JOB' | 'UNKNOWN'
export type PublisherVerification = 'VERIFIED' | 'UNVERIFIED'

export interface SourceProvenanceInput {
  sourceUrl: string
  platform?: string | null
  metadata?: Record<string, unknown>
}

export interface SourceProvenance {
  sourceCategory: SourceCategory
  sourcePlatform: string
  sourceTier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNKNOWN'
  publisherVerification: PublisherVerification
  corroborationRequired: boolean
  reasonCodes: string[]
}
