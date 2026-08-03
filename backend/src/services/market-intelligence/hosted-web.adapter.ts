import type {
  MarketSourceAdapter,
  MarketSourceContext,
} from './market-source-adapter.interface.js'
import { extractMarketSignalCandidates } from './market-signal-rules.js'

/**
 * Converts source snippets returned by a hosted web-research provider into the
 * same evidence-first MarketSignal pipeline used by the existing providers.
 */
export class HostedWebMarketSourceAdapter implements MarketSourceAdapter {
  readonly sourceType = 'hosted-web'

  canHandle(context: MarketSourceContext) {
    return context.provider === 'openai-web' || context.provider === 'qwen-web'
  }

  async fetchSignals(context: MarketSourceContext) {
    const candidates = extractMarketSignalCandidates(
      context.result,
      context.provider,
      context.detectedAt,
    )
    const hasExplicitRegion =
      typeof context.result.metadata.researchRegion === 'string' &&
      Boolean(context.result.metadata.researchRegion.trim())
    return candidates.map((candidate) => ({
      ...candidate,
      country: undefined,
      region: hasExplicitRegion ? candidate.region : undefined,
    }))
  }
}
