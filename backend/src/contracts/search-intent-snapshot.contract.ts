import type { SearchTargetType } from '../providers/search-intent/search-intent-provider.interface.js'
import type { ExpandedKeyword } from '../services/search-keyword-expansion.service.js'

export const SEARCH_INTENT_SNAPSHOT_VERSION = 'v1' as const

export type SalesIntent = 'customer' | 'channel' | 'partnership'

export interface SearchIntentSnapshot {
  version: typeof SEARCH_INTENT_SNAPSHOT_VERSION
  capturedAt: string
  salesIntent: SalesIntent
  targetType: SearchTargetType
  relationship: string
  reason: string
  keywords: ExpandedKeyword[]
  languages: string[]
  searchDirections: string[]
}
