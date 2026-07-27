import type {
  SearchIntent,
  SearchIntentProvider,
} from '../providers/search-intent/search-intent-provider.interface.js'
import { ruleBasedSearchIntentProvider } from '../providers/search-intent/rule-based-search-intent.provider.js'

export class SearchIntentService {
  constructor(
    private readonly provider: SearchIntentProvider =
      ruleBasedSearchIntentProvider,
  ) {}

  async parse(input: string): Promise<{
    intent: SearchIntent
    provider: string
  }> {
    return {
      intent: await this.provider.parse(input),
      provider: this.provider.name,
    }
  }
}

export const searchIntent = new SearchIntentService()
