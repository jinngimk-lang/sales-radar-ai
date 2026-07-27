import type { SearchTargetType } from '../providers/search-intent/search-intent-provider.interface.js'
import { searchIntent } from './search-intent.service.js'
import {
  searchKeywordExpansion,
  type ExpandedKeyword,
} from './search-keyword-expansion.service.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'

export interface SearchStrategy {
  intent: {
    industry: string
    product: string
    region: string
    country: string
    relationship: string
    language: string
    customerType: string
    businessProblem: string
    buyingSignals: string[]
  }
  keywords: ExpandedKeyword[]
  languages: string[]
  targetType: SearchTargetType
  reason: string
}

export class GlobalSearchIntelligenceService {
  async createStrategy(
    input: string,
    productContext?: SearchProductContext,
  ): Promise<SearchStrategy> {
    const parsed = await searchIntent.parse(input)
    const intent = {
      ...parsed.intent,
      product: preferSpecific(
        parsed.intent.product,
        productContext?.product,
        GENERIC_PRODUCTS,
      ),
      industry: preferSpecific(
        parsed.intent.industry,
        productContext?.industry,
        GENERIC_INDUSTRIES,
      ),
      region: productContext?.region?.trim() || parsed.intent.region,
      country: productContext?.country?.trim() || parsed.intent.country,
      customerType: preferSpecific(
        parsed.intent.customerType,
        productContext?.customerType,
        GENERIC_CUSTOMER_TYPES,
      ),
      businessProblem:
        productContext?.businessProblem?.trim() ||
        parsed.intent.businessProblem,
      buyingSignals:
        productContext?.buyingSignals?.filter(Boolean) ??
        parsed.intent.buyingSignals,
    }
    const keywords = searchKeywordExpansion.expand(intent)
    return {
      intent: {
        industry: intent.industry,
        product: intent.product,
        region: intent.region,
        country: intent.country,
        relationship: intent.relationship,
        language: intent.language,
        customerType: intent.customerType,
        businessProblem: intent.businessProblem,
        buyingSignals: intent.buyingSignals,
      },
      keywords,
      languages: [...new Set(keywords.map((keyword) => keyword.language))],
      targetType: parsed.intent.targetType,
      reason: this.reason(parsed.intent.targetType, parsed.intent.relationship),
    }
  }

  optimizedKeyword(strategy: SearchStrategy, fallback: string): string {
    return strategy.keywords.find((keyword) => keyword.language === 'en')?.query ??
      strategy.keywords[0]?.query ??
      fallback
  }

  private reason(targetType: SearchTargetType, relationship: string): string {
    if (targetType === 'both') {
      return 'The request describes market development, so the strategy covers both buyers and channel partners.'
    }
    if (targetType === 'channel') {
      return `The request contains a channel relationship signal (${relationship}).`
    }
    return `The request indicates a buyer or sales-opportunity search (${relationship}).`
  }
}

export const globalSearchIntelligence =
  new GlobalSearchIntelligenceService()

const GENERIC_PRODUCTS = new Set([
  'software',
  'saas',
  'saas software',
  'business software',
])

const GENERIC_INDUSTRIES = new Set([
  'software',
  'cross-industry',
  'unknown',
])

const GENERIC_CUSTOMER_TYPES = new Set([
  'buyer',
  'buyers',
  'buyer companies',
  'company',
  'companies',
  'customer',
  'customers',
])

function preferSpecific(
  parsedValue: string,
  suppliedValue: string | undefined,
  genericValues: Set<string>,
) {
  const parsed = parsedValue.trim()
  const supplied = suppliedValue?.trim()
  if (!supplied) return parsed
  if (parsed.toLowerCase() === supplied.toLowerCase()) return parsed

  const parsedIsGeneric = genericValues.has(parsed.toLowerCase())
  const suppliedIsGeneric = genericValues.has(supplied.toLowerCase())
  if (!parsedIsGeneric && suppliedIsGeneric) return parsed
  return supplied
}
