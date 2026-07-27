import type { OpportunityType } from '@prisma/client'
import type { SearchProductContext } from './product-context.contract.js'

export const CURRENT_OPPORTUNITY_DETECTION_VERSION = 'v1'

export interface OpportunityDetectionInput {
  provider: string
  sourceUrl: string
  title: string | null
  content: string
  rawMetadata: unknown
  explicitCompanyName?: string | null
  productContext?: SearchProductContext
}

export interface OpportunityDetectionResult {
  type: OpportunityType
  dedupeKey: string
  companyName: string | null
  title: string
  summary: string
  whyItMatters: string
  recommendedNextStep: string
  confidence: number
  evidenceExcerpt: string
  detectionVersion: string
}
