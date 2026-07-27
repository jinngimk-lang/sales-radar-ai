import {
  LeadEvidenceStatus,
  LeadIdentityStatus,
  Platform,
} from '@prisma/client'
import type { SearchResult } from '../providers/search/search-provider.interface.js'
import type { CompanyIdentityResult } from './company-identity-extraction.service.js'

export interface EvidenceValidationResult {
  status: LeadEvidenceStatus
  reasons: string[]
}

const CONTENT_PATH =
  /\/(?:blog|news|article|articles|directory|directories|listing|listings|community|forum|forums|wiki|resources?)(?:\/|$)/i
const DIRECTORY_HOST =
  /(?:crunchbase|wikipedia|europages|yellowpages|yelp|kompass|made-in-china|alibaba)\./i
const BUSINESS_CONTEXT =
  /\b(company|manufacturer|manufacturing|factory|industrial|products?|solutions?|services?|operations?|production|technology|software|customers?|industries|engineering)\b/i

export class EvidenceValidationService {
  validate(
    result: SearchResult,
    identity: CompanyIdentityResult,
  ): EvidenceValidationResult {
    const reasons: string[] = []
    let url: URL | null = null
    try {
      url = new URL(result.sourceUrl)
    } catch {
      reasons.push('Source URL is invalid.')
    }

    if (result.platform !== Platform.Website) {
      reasons.push('Social, video, and community content is evidence-only.')
    }
    if (url && (CONTENT_PATH.test(url.pathname) || DIRECTORY_HOST.test(url.hostname))) {
      reasons.push('Articles and directory pages are not company evidence.')
    }
    if (result.rawContent.trim().length < 80) {
      reasons.push('Source content is too limited to validate.')
    }
    if (!BUSINESS_CONTEXT.test(result.rawContent)) {
      reasons.push('No identifiable business context was found.')
    }
    if (identity.identityStatus !== LeadIdentityStatus.VERIFIED) {
      reasons.push('Company identity is not verified.')
    }
    if (
      identity.companyName &&
      !this.containsCompany(result.rawContent, identity.companyName)
    ) {
      reasons.push('Company identity is not supported by source content.')
    }

    return {
      status:
        reasons.length === 0
          ? LeadEvidenceStatus.VALID
          : LeadEvidenceStatus.INVALID,
      reasons,
    }
  }

  private containsCompany(content: string, companyName: string) {
    const significant = companyName
      .toLowerCase()
      .split(/\s+/)
      .filter(
        (token) =>
          token.length >= 3 &&
          !/^(company|corp|corporation|inc|ltd|limited|llc|gmbh|ag)$/.test(
            token,
          ),
      )
    const normalizedContent = content.toLowerCase()
    return significant.some((token) => normalizedContent.includes(token))
  }
}

export const evidenceValidation = new EvidenceValidationService()
