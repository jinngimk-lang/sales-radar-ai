import type { MarketSignalType } from '@prisma/client'
import type { SearchResult } from '../../providers/search/search-provider.interface.js'

export interface MarketSourceContext {
  provider: string
  result: SearchResult
  detectedAt?: Date
}

export interface MarketSignalCandidate {
  sourceType: string
  sourceUrl: string
  title: string
  summary: string
  content?: string
  companyName?: string
  country?: string
  region?: string
  signalType: MarketSignalType
  confidence: number
  detectedAt: Date
}

export interface MarketSourceAdapter {
  readonly sourceType: string
  canHandle(context: MarketSourceContext): boolean
  fetchSignals(context: MarketSourceContext): Promise<MarketSignalCandidate[]>
}
