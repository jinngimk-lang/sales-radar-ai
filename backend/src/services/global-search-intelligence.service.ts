import type { SearchTargetType } from '../providers/search-intent/search-intent-provider.interface.js'
import { searchIntent } from './search-intent.service.js'
import {
  searchKeywordExpansion,
  type ExpandedKeyword,
} from './search-keyword-expansion.service.js'

export interface SearchStrategy {
  intent: {
    industry: string
    product: string
    region: string
    country: string
    relationship: string
    language: string
  }
  keywords: ExpandedKeyword[]
  languages: string[]
  targetType: SearchTargetType
  reason: string
}

export class GlobalSearchIntelligenceService {
  async createStrategy(input: string): Promise<SearchStrategy> {
    const parsed = await searchIntent.parse(input)
    const keywords = searchKeywordExpansion.expand(parsed.intent)
    return {
      intent: {
        industry: parsed.intent.industry,
        product: parsed.intent.product,
        region: parsed.intent.region,
        country: parsed.intent.country,
        relationship: parsed.intent.relationship,
        language: parsed.intent.language,
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
