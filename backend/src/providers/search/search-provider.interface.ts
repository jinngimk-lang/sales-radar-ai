import type { Industry, Platform, Region } from '@prisma/client'

export type SearchProviderName = 'mock' | 'agent-reach' | 'browser'

export interface SearchProviderInput {
  keyword: string
  platforms: Platform[]
  regions: Region[]
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
