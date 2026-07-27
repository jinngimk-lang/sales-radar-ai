import {
  LeadEvidenceStatus,
  LeadIdentityStatus,
  LeadQualificationStatus,
} from '@prisma/client'
import type { CompanyIdentityResult } from './company-identity-extraction.service.js'
import type { EvidenceValidationResult } from './evidence-validation.service.js'
import type { ProductRelevanceResult } from './product-relevance.service.js'
import { CURRENT_QUALIFICATION_VERSION } from '../contracts/qualification-version.contract.js'

export interface LeadQualityGateResult {
  qualificationStatus: LeadQualificationStatus
  qualificationVersion: string
  passed: boolean
  reasons: string[]
}

export class LeadQualityGateService {
  evaluate(
    identity: CompanyIdentityResult,
    evidence: EvidenceValidationResult,
    relevance: ProductRelevanceResult,
  ): LeadQualityGateResult {
    const reasons = [
      ...identity.reasons,
      ...evidence.reasons,
      ...relevance.reasons,
    ]
    const passed =
      identity.identityStatus === LeadIdentityStatus.VERIFIED &&
      Boolean(identity.companyName) &&
      Boolean(identity.normalizedDomain) &&
      evidence.status === LeadEvidenceStatus.VALID &&
      relevance.passed

    return {
      qualificationStatus: passed
        ? LeadQualificationStatus.QUALIFIED
        : LeadQualificationStatus.REJECTED,
      qualificationVersion: CURRENT_QUALIFICATION_VERSION,
      passed,
      reasons: [...new Set(reasons)],
    }
  }
}

export const leadQualityGate = new LeadQualityGateService()
