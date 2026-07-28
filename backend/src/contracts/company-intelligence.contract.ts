import type { Platform, Prisma } from '@prisma/client'

export const COMPANY_INTELLIGENCE_ANALYSIS_VERSION = 'v1' as const

export const COMPANY_OPPORTUNITY_RELATIONSHIP_TYPE =
  'EVENT_SUBJECT' as const

export interface CompanyIntelligenceCommand {
  userId: string
  opportunityId: string
  searchEvidenceId: string
}

/**
 * This input is never accepted directly from an API payload. It is created
 * only after the resolver proves that Opportunity, SearchEvidence and
 * SearchTask belong to the same user and that Evidence belongs to Opportunity.
 */
export interface VerifiedCompanyIntelligenceInput {
  readonly userId: string
  readonly opportunity: {
    readonly id: string
    readonly companyName: string | null
    readonly productContextSnapshot: Prisma.JsonValue
    readonly searchTaskId: string
    readonly productProfileId: string | null
  }
  readonly evidence: {
    readonly id: string
    readonly provider: string
    readonly externalId: string
    readonly platform: Platform
    readonly sourceUrl: string
    readonly profileUrl: string | null
    readonly title: string | null
    readonly content: string
    readonly rawMetadata: Prisma.JsonValue | null
    readonly extractedCompanyName: string | null
    readonly extractedDomain: string | null
    readonly extractedWebsite: string | null
    readonly capturedAt: Date
  }
}

export interface CompanyIntelligenceResult {
  companyProfileId: string
  companySourceId: string
  snapshotId: string
  opportunityId: string
  analysisVersion: typeof COMPANY_INTELLIGENCE_ANALYSIS_VERSION
  createdSnapshot: boolean
}
