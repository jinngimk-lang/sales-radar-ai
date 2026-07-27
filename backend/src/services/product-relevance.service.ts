import { Platform } from '@prisma/client'
import type { SearchResult } from '../providers/search/search-provider.interface.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'

export interface ProductRelevanceResult {
  passed: boolean
  reasons: string[]
}

const INDUSTRY_TERMS: Record<string, string[]> = {
  industrialmanufacturing: [
    'industrial',
    'manufacturing',
    'factory',
    'automation',
    'production',
    'robotics',
  ],
  saassoftware: ['saas', 'software', 'cloud', 'platform'],
  consumerelectronics: ['consumer', 'electronics', 'devices'],
  medicalhealth: ['medical', 'health', 'pharma', 'healthcare'],
  tradeexport: ['trade', 'export', 'import', 'distribution'],
  beautyindustry: ['beauty', 'cosmetic', 'skincare'],
}

export class ProductRelevanceService {
  evaluate(
    result: SearchResult,
    context: SearchProductContext | undefined,
  ): ProductRelevanceResult {
    if (!context || !Object.values(context).some(Boolean)) {
      return {
        passed: false,
        reasons: ['Product context is missing.'],
      }
    }

    const reasons: string[] = []
    if (context.industry && !this.industryMatches(result, context.industry)) {
      reasons.push('Industry does not match ProductContext.')
    }
    if (context.region && !this.regionMatches(result, context.region)) {
      reasons.push('Region does not match ProductContext.')
    }
    if (
      context.customerType &&
      !this.customerTypeMatches(result, context.customerType)
    ) {
      reasons.push('Customer type does not match ProductContext.')
    }

    return { passed: reasons.length === 0, reasons }
  }

  private industryMatches(result: SearchResult, expected: string) {
    const normalizedExpected = this.normalize(expected)
    const normalizedActual = this.normalize(result.industry)
    if (
      normalizedActual === normalizedExpected ||
      normalizedActual.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedActual)
    ) {
      return true
    }

    const terms = INDUSTRY_TERMS[normalizedExpected] ?? []
    const content = `${result.rawContent} ${String(result.metadata.title ?? '')}`.toLowerCase()
    return terms.length > 0 && terms.some((term) => content.includes(term))
  }

  private regionMatches(result: SearchResult, expected: string) {
    const expectedRegion = this.normalize(expected)
    return [
      result.region,
      result.country,
      result.metadata.location,
      result.metadata.country,
    ].some(
      (value) =>
        typeof value === 'string' &&
        (this.normalize(value).includes(expectedRegion) ||
          expectedRegion.includes(this.normalize(value))),
    )
  }

  private customerTypeMatches(result: SearchResult, expected: string) {
    const expectedType = this.normalize(expected)
    const explicitType =
      typeof result.metadata.customerType === 'string'
        ? this.normalize(result.metadata.customerType)
        : result.platform === Platform.Website
          ? 'company'
          : ''

    if (
      expectedType === 'buyer' &&
      result.platform === Platform.Website
    ) {
      return this.isEndUserBuyerEvidence(result)
    }
    if (expectedType === explicitType) return true
    return (
      (expectedType === 'buyer' && explicitType === 'company') ||
      (expectedType === 'company' && explicitType === 'buyer')
    )
  }

  private isEndUserBuyerEvidence(result: SearchResult) {
    let path = ''
    try {
      path = new URL(result.sourceUrl).pathname
    } catch {
      return false
    }
    if (
      /\/(?:assets?|resources?|case-stud(?:y|ies)|customer-stor(?:y|ies)|whitepapers?|webinars?)(?:\/|$)/i.test(
        path,
      )
    ) {
      return false
    }

    const content = result.rawContent.toLowerCase()
    const operatorEvidence =
      /\b(our (?:factory|factories|plant|plants|production|manufacturing operations)|we manufacture|manufacturer of|production facilit(?:y|ies)|production lines?|plant expansion|factory expansion)\b/i.test(
        content,
      )
    const vendorEvidence =
      /\b(book a demo|request a demo|our (?:software|platform|solution)|solutions? for manufacturers|software for manufacturers|our customers?|customer case study)\b/i.test(
        content,
      )

    return operatorEvidence && !vendorEvidence
  }

  private normalize(value: unknown) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
  }
}

export const productRelevance = new ProductRelevanceService()
