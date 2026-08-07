import { DeepAgentReachProvider } from './deep-agent-reach.provider.js'
import { MockSearchProvider } from './mock-search.provider.js'
import type {
  SearchProvider,
  SearchProviderName,
} from './search-provider.interface.js'

const mockProvider = new MockSearchProvider()
const agentReachProvider = new DeepAgentReachProvider()

export class SearchProviderFactory {
  create(name: SearchProviderName = 'mock'): SearchProvider {
    switch (name) {
      case 'mock':
        return mockProvider
      case 'agent-reach':
        return agentReachProvider
      case 'browser':
        throw new Error('BrowserProvider is reserved but not implemented')
    }
  }

  resolve(metadata: unknown): SearchProvider {
    if (
      metadata === 'mock' ||
      metadata === 'agent-reach' ||
      metadata === 'browser'
    ) {
      return this.create(metadata)
    }

    const providerName = this.readProviderName(metadata)
    return this.create(providerName)
  }

  private readProviderName(metadata: unknown): SearchProviderName {
    if (
      metadata &&
      typeof metadata === 'object' &&
      'provider' in metadata
    ) {
      const provider = (metadata as { provider?: unknown }).provider
      if (
        provider === 'mock' ||
        provider === 'agent-reach' ||
        provider === 'browser'
      ) {
        return provider
      }
    }

    return 'mock'
  }
}

export const searchProviderFactory = new SearchProviderFactory()
