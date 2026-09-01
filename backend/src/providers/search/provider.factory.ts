import { CrawlerSearchProvider } from './crawler-search.provider.js'
import { MockSearchProvider } from './mock-search.provider.js'
import type {
  SearchProvider,
  SearchProviderName,
} from './search-provider.interface.js'

const mockProvider = new MockSearchProvider()
const crawlerProvider = new CrawlerSearchProvider()

export class SearchProviderFactory {
  create(name: SearchProviderName = 'crawler'): SearchProvider {
    if (name === 'mock') return mockProvider

    // Historical `agent-reach` task metadata is intentionally treated as a
    // compatibility alias. Production search execution has one active path:
    // the crawler gateway.
    return crawlerProvider
  }

  resolve(metadata: unknown): SearchProvider {
    return this.create(this.readProviderName(metadata))
  }

  private readProviderName(metadata: unknown): SearchProviderName {
    if (metadata === 'mock') return 'mock'
    if (metadata === 'crawler' || metadata === 'agent-reach') return 'crawler'

    if (
      metadata &&
      typeof metadata === 'object' &&
      'provider' in metadata
    ) {
      const provider = (metadata as { provider?: unknown }).provider
      if (provider === 'mock') return 'mock'
      if (provider === 'crawler' || provider === 'agent-reach') return 'crawler'
    }

    return 'crawler'
  }
}

export const searchProviderFactory = new SearchProviderFactory()
