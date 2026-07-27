/**
 * Phase-ready contracts only. Persistence and extraction implementations are
 * intentionally deferred until the Company Identity Extraction phase.
 */
export interface ProductContextReference {
  productProfileId?: string
  product?: string
  industry?: string
  region?: string
  customerType?: string
}

export interface SearchEvidence {
  externalId: string
  provider: string
  sourceUrl: string
  title?: string
  snippet?: string
  rawContent?: string
  capturedAt: Date
  productContext?: ProductContextReference
  metadata?: Record<string, unknown>
}

export interface CompanyIdentityExtraction {
  companyName: string | null
  normalizedDomain: string | null
  website: string | null
  industry: string | null
  country: string | null
  region: string | null
  evidence: string[]
  confidence: number
}

export interface LeadQualityGateInput {
  evidence: SearchEvidence
  identity: CompanyIdentityExtraction
  productRelevancePassed: boolean
}

export interface LeadQualityGateDecision {
  status: 'QUALIFIED' | 'EVIDENCE_ONLY' | 'REJECTED'
  qualificationVersion: string
  reasons: string[]
}
