export type MarketResearchCommercialGoal =
  | 'FIND_BUYERS'
  | 'FIND_SUPPLIERS'
  | 'FIND_PARTNERS'
  | 'FIND_DISTRIBUTORS'
  | 'RESEARCH_COMPETITORS'
  | 'EXPLORE_MARKET'

export const DEFAULT_MARKET_RESEARCH_GOAL: MarketResearchCommercialGoal =
  'FIND_BUYERS'

export const MARKET_RESEARCH_GOALS = new Set<MarketResearchCommercialGoal>([
  'FIND_BUYERS',
  'FIND_SUPPLIERS',
  'FIND_PARTNERS',
  'FIND_DISTRIBUTORS',
  'RESEARCH_COMPETITORS',
  'EXPLORE_MARKET',
])

const GOAL_RESEARCH_HINTS: Record<MarketResearchCommercialGoal, string> = {
  FIND_BUYERS:
    'prioritize buyers, procurement teams, purchasing demand, sourcing projects and end-customer expansion signals',
  FIND_SUPPLIERS:
    'prioritize suppliers, manufacturers, factories, vendors, production capability and supply-side availability',
  FIND_PARTNERS:
    'prioritize potential business partners, technology alliances, integrators, co-selling and partnership signals',
  FIND_DISTRIBUTORS:
    'prioritize distributors, resellers, dealers, channel partners and regional go-to-market networks',
  RESEARCH_COMPETITORS:
    'prioritize competitors, product launches, market positioning, expansion, pricing and strategic moves',
  EXPLORE_MARKET:
    'prioritize market demand, ecosystem changes, category growth, policy shifts and emerging commercial opportunities',
}

/**
 * MarketWebResearch historically accepted `customerType` as its audience
 * targeting string. Until its public request contract is widened, this helper
 * carries the selected two-sided commercial goal through that existing field
 * so both hosted research prompts and Exa queries change upstream.
 *
 * The string is a research instruction only. It must never be persisted or
 * rendered as proof that an entity is a buyer/supplier/partner.
 */
export function buildCommercialResearchAudience(
  goal: MarketResearchCommercialGoal,
  customerType?: string,
): string {
  const audience = customerType?.trim()
  const base = audience ? `requested entity type: ${audience}; ` : ''
  return `${base}commercial goal ${goal}: ${GOAL_RESEARCH_HINTS[goal]}`
}
