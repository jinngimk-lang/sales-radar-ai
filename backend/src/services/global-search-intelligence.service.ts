import type { SearchTargetType } from '../providers/search-intent/search-intent-provider.interface.js'
import { searchIntent } from './search-intent.service.js'
import {
  searchKeywordExpansion,
  type ExpandedKeyword,
} from './search-keyword-expansion.service.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'
import type { SalesIntent } from '../contracts/search-intent-snapshot.contract.js'

export interface SearchStrategy {
  intent: {
    industry: string
    product: string
    category: string
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
  salesIntent: SalesIntent
  searchDirections: string[]
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
    const salesIntent = this.salesIntent(
      parsed.intent.targetType,
      parsed.intent.relationship,
    )
    const keywords = searchKeywordExpansion.expand(
      intent,
      productContext,
      salesIntent,
    )
    const searchDirections = this.searchDirections(
      salesIntent,
      intent,
      productContext,
    )
    return {
      intent: {
        industry: intent.industry,
        product: intent.product,
        category: productContext?.category?.trim() || 'Unknown',
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
      salesIntent,
      searchDirections,
      reason: this.reason(parsed.intent.targetType, parsed.intent.relationship),
    }
  }

  private salesIntent(
    targetType: SearchTargetType,
    relationship: string,
  ): SalesIntent {
    if (
      relationship === 'partnership' ||
      relationship === 'market_development' ||
      targetType === 'both'
    ) {
      return 'partnership'
    }
    return targetType === 'channel' ? 'channel' : 'customer'
  }

  private searchDirections(
    salesIntent: SalesIntent,
    intent: {
      product: string
      customerType: string
      relationship: string
    },
    context?: SearchProductContext,
  ): string[] {
    const configured =
      salesIntent === 'customer'
        ? context?.buyerKeywords
        : context?.channelKeywords
    if (configured && configured.length > 0) {
      return [...new Set(configured.map((value) => value.trim()).filter(Boolean))]
        .slice(0, 3)
    }
    if (salesIntent === 'partnership') {
      return [
        `${intent.product} strategic partners`,
        `${intent.product} technology cooperation`,
      ]
    }
    if (salesIntent === 'channel') {
      return [
        `${intent.product} ${this.channelDirection(intent.relationship)}`,
      ]
    }
    return [`${intent.customerType} using ${intent.product}`]
  }

  private channelDirection(relationship: string): string {
    return {
      system_integration: 'system integrators',
      distribution: 'distributors',
      trade_cooperation: 'trading partners',
    }[relationship] ?? 'channel partners'
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
