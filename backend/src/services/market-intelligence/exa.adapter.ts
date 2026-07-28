import type {
  MarketSourceAdapter,
  MarketSourceContext,
} from './market-source-adapter.interface.js'
import { extractMarketSignalCandidates } from './market-signal-rules.js'

/**
 * Reserved for a future direct Exa source. AgentReach-wrapped Exa results are
 * handled by AgentReachMarketSourceAdapter to avoid duplicate MarketSignals.
 */
export class ExaMarketSourceAdapter implements MarketSourceAdapter {
  readonly sourceType = 'exa'

  canHandle(context: MarketSourceContext) {
    return context.provider === 'exa'
  }

  async fetchSignals(context: MarketSourceContext) {
    return extractMarketSignalCandidates(
      context.result,
      this.sourceType,
      context.detectedAt,
    )
  }
}
