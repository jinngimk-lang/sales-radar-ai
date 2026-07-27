import {
  Industry,
  Platform,
  Region,
} from '@prisma/client'
import type {
  SearchProvider,
  SearchProviderInput,
  SearchResult,
} from './search-provider.interface.js'

const REGION_COUNTRY: Record<Region, string> = {
  [Region.USA]: 'United States',
  [Region.Europe]: 'Germany',
  [Region.SoutheastAsia]: 'Singapore',
  [Region.China]: 'China',
  [Region.MiddleEast]: 'United Arab Emirates',
}

const INDUSTRIES = [
  Industry.IndustrialManufacturing,
  Industry.ConsumerElectronics,
  Industry.MedicalHealth,
  Industry.SaaSSoftware,
  Industry.TradeExport,
  Industry.BeautyIndustry,
] as const

export class MockSearchProvider implements SearchProvider {
  readonly name = 'mock' as const

  async search(input: SearchProviderInput): Promise<SearchResult[]> {
    const platforms =
      input.platforms.length > 0
        ? input.platforms
        : [Platform.Reddit, Platform.LinkedIn, Platform.X]
    const regions =
      input.regions.length > 0 ? input.regions : [Region.USA, Region.Europe]

    return Array.from({ length: 6 }, (_, index) =>
      this.createLead(input.keyword, platforms[index % platforms.length], regions[index % regions.length], index),
    )
  }

  private createLead(
    keyword: string,
    platform: Platform,
    region: Region,
    index: number,
  ): SearchResult {
    const sequence = index + 1
    const company = `${keyword} Global ${sequence}`
    const intentScore = 58 + index * 7
    const externalId = `mock-${platform.toLowerCase()}-${sequence}`

    return {
      externalId,
      platform,
      sourceUrl: `https://example.com/${platform.toLowerCase()}/posts/${externalId}`,
      profileUrl: `https://example.com/${platform.toLowerCase()}/profiles/mock-buyer-${sequence}`,
      company,
      customerName: `Mock Buyer ${sequence}`,
      country: REGION_COUNTRY[region],
      region,
      industry: INDUSTRIES[index % INDUSTRIES.length],
      rawContent: `We are evaluating ${keyword} suppliers for an upcoming procurement project. We need reliable delivery, transparent pricing, and product documentation.`,
      metadata: {
        username: `buyer_${keyword.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${sequence}`,
        postedAt: new Date(Date.now() - index * 86_400_000).toISOString(),
        jobTitle:
          index % 2 === 0
            ? 'Procurement Manager'
            : 'Business Development Director',
        customerType: index % 3 === 0 ? 'Company' : 'Buyer',
        interestTags: [keyword, 'supplier', 'procurement'],
        initialIntentScore: intentScore,
      },
    }
  }
}

export const mockSearchProvider = new MockSearchProvider()
