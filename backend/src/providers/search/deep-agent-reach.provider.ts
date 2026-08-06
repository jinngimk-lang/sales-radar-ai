import { AgentReachProvider } from './agent-reach.provider.js'
import {
  buildAgentReachSearchPlans,
  resolveAgentReachResultLimit,
} from './agent-reach-search-planner.js'
import type {
  SearchProvider,
  SearchProviderInput,
  SearchResult,
} from './search-provider.interface.js'

/**
 * Orchestrates several bounded Agent Reach calls behind one provider interface.
 * The existing adapter remains responsible for mcporter execution and parsing.
 */
export class DeepAgentReachProvider implements SearchProvider {
  readonly name = 'agent-reach' as const

  constructor(private readonly delegate: SearchProvider = new AgentReachProvider()) {}

  async search(input: SearchProviderInput): Promise<SearchResult[]> {
    const target = resolveAgentReachResultLimit(input.maxResults)
    const plans = buildAgentReachSearchPlans({ ...input, maxResults: target })
    const unique = new Map<string, SearchResult>()

    for (const plan of plans) {
      const results = await this.delegate.search({
        keyword: plan.query,
        platforms: plan.platforms,
        regions: plan.regions,
        maxResults: plan.maxResults,
      })
      for (const result of results) {
        const key = result.externalId || result.sourceUrl
        if (!unique.has(key)) unique.set(key, result)
        if (unique.size >= target) break
      }
      if (unique.size >= target) break
    }

    return [...unique.values()].slice(0, target)
  }
}
