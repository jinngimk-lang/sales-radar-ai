import type {
  MarketSourceAdapter,
  MarketSourceContext,
} from './market-source-adapter.interface.js'
import { extractMarketSignalCandidates } from './market-signal-rules.js'

export class AgentReachMarketSourceAdapter implements MarketSourceAdapter {
  readonly sourceType = 'agent-reach'

  canHandle(context: MarketSourceContext) {
    return context.provider === 'agent-reach'
  }

  async fetchSignals(context: MarketSourceContext) {
    return extractMarketSignalCandidates(
      context.result,
      this.sourceType,
      context.detectedAt,
    )
  }
}
