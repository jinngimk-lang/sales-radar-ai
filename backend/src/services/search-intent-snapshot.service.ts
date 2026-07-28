import {
  SEARCH_INTENT_SNAPSHOT_VERSION,
  type SearchIntentSnapshot,
} from '../contracts/search-intent-snapshot.contract.js'
import type { SearchStrategy } from './global-search-intelligence.service.js'

type Clock = () => Date

export class SearchIntentSnapshotBuilder {
  constructor(private readonly clock: Clock = () => new Date()) {}

  build(strategy: SearchStrategy): SearchIntentSnapshot {
    return {
      version: SEARCH_INTENT_SNAPSHOT_VERSION,
      capturedAt: this.clock().toISOString(),
      salesIntent: strategy.salesIntent,
      targetType: strategy.targetType,
      relationship: strategy.intent.relationship,
      reason: strategy.reason,
      keywords: strategy.keywords.map((keyword) => ({ ...keyword })),
      languages: [...strategy.languages],
      searchDirections: [...strategy.searchDirections],
    }
  }
}

export const searchIntentSnapshotBuilder =
  new SearchIntentSnapshotBuilder()
