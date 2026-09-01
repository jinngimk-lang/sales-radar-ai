import type { Industry, Platform, Region } from '@prisma/client'

/**
 * `agent-reach` is retained only as a legacy metadata value so historical
 * tasks remain readable. SearchProviderFactory resolves every non-mock task
 * through the crawler provider.
 */
export type SearchProviderName = 'mock' | 'crawler' | 'agent-reach'

export interface SearchProviderInput {
  keyword: string
  platforms: Platform[]
  regions: Region[]
  /** Requested result target. Providers may split it into bounded upstream batches. */
  maxResults?: number
}

/**
 * Provider-neutral search result.
 *
 * Platform-specific payloads belong in metadata. Database-specific Lead
 * fields are intentionally added later by LeadNormalizerService.
 */
export interface SearchResult {
  externalId: string
  platform: Platform
  sourceUrl: string
  profileUrl: string
  company: string | null
  customerName: string
  country: string
  region: Region
  industry: Industry
  rawContent: string
  metadata: Record<string, unknown>
}

export interface SearchProvider {
  readonly name: SearchProviderName
  search(input: SearchProviderInput): Promise<SearchResult[]>
}
