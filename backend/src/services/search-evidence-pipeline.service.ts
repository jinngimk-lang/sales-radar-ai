import type { SearchResult } from '../providers/search/search-provider.interface.js'
import {
  companyIdentityExtraction,
  type CompanyIdentityResult,
} from './company-identity-extraction.service.js'
import {
  evidenceValidation,
  type EvidenceValidationResult,
} from './evidence-validation.service.js'
import {
  leadQualityGate,
  type LeadQualityGateResult,
} from './lead-quality-gate.service.js'
import {
  productRelevance,
  type ProductRelevanceResult,
} from './product-relevance.service.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'

export interface SearchEvidenceEvaluation {
  identity: CompanyIdentityResult
  evidence: EvidenceValidationResult
  relevance: ProductRelevanceResult
  gate: LeadQualityGateResult
}

export class SearchEvidencePipelineService {
  evaluate(
    result: SearchResult,
    productContext: SearchProductContext | undefined,
  ): SearchEvidenceEvaluation {
    const identity = companyIdentityExtraction.extract(result)
    const evidence = evidenceValidation.validate(result, identity)
    const relevance = productRelevance.evaluate(result, productContext)
    const gate = leadQualityGate.evaluate(identity, evidence, relevance)
    return { identity, evidence, relevance, gate }
  }

  qualifyResult(
    result: SearchResult,
    evaluation: SearchEvidenceEvaluation,
  ): SearchResult | null {
    if (
      !evaluation.gate.passed ||
      !evaluation.identity.companyName ||
      !evaluation.identity.normalizedDomain
    ) {
      return null
    }

    return {
      ...result,
      company: evaluation.identity.companyName,
      metadata: {
        ...result.metadata,
        companyName: evaluation.identity.companyName,
        companyDomain: evaluation.identity.normalizedDomain,
        companyWebsite: evaluation.identity.website,
        identityConfidence: evaluation.identity.confidence,
      },
    }
  }
}

export const searchEvidencePipeline = new SearchEvidencePipelineService()
