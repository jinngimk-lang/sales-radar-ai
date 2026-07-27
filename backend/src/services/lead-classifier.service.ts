import { Platform } from '@prisma/client'
import type { SearchResult } from '../providers/search/search-provider.interface.js'

export type LeadType = 'company' | 'person' | 'content' | 'community'

export class LeadClassifierService {
  classify(
    result: SearchResult,
    context: {
      company: string | null
      contactName: string | null
      jobTitle: string | null
      website: string | null
    },
  ): LeadType {
    if (
      result.platform === Platform.Reddit ||
      result.platform === Platform.Facebook
    ) {
      return 'community'
    }
    const declaredType = this.readDeclaredType(result.metadata)
    if (declaredType) return declaredType

    if (result.platform === Platform.YouTube) {
      const text = `${this.readTitle(result)} ${result.rawContent}`
      const isEducational =
        /\b(tutorial|how to|explained|introduction|beginner|training|top\s*\d+|best\s+\d+|list of|overview|what is)\b/i.test(
          text,
        )
      const hasBusinessCase =
        /\b(customer (?:spotlight|story|case)|case study|client|production line|packaging (?:project|line)|automation (?:upgrade|retrofit|project)|equipment (?:purchase|installation)|installed|commissioned|application|pharmaceutical products?)\b/i.test(
          text,
        )

      if (
        context.company &&
        (hasBusinessCase ||
          Boolean(context.website) ||
          /\b(company|manufacturer|factory|plant|customer)\b/i.test(text))
      ) {
        return 'company'
      }
      if (isEducational || !context.company) return 'content'
      return 'company'
    }

    if (context.company && context.website) return 'company'
    if (context.contactName && context.jobTitle) return 'person'
    if (context.company) return 'company'
    if (context.contactName) return 'person'
    return 'content'
  }

  private readTitle(result: SearchResult): string {
    const value = result.metadata.title
    return typeof value === 'string' ? value : ''
  }

  private readDeclaredType(
    metadata: Record<string, unknown>,
  ): LeadType | null {
    for (const key of ['leadType', 'entityType', 'resultType']) {
      const value = metadata[key]
      if (
        value === 'company' ||
        value === 'person' ||
        value === 'content' ||
        value === 'community'
      ) {
        return value
      }
    }
    return null
  }
}

export const leadClassifier = new LeadClassifierService()
