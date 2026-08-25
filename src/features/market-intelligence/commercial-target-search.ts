import { CUSTOMER_TYPE_META, REGION_META } from '@/data/meta'
import type {
  CommercialGoal,
  MarketScanTarget,
} from './market-intelligence.contract'

const GOAL_SEARCH_TERMS: Record<CommercialGoal, string[]> = {
  FIND_BUYERS: ['买家', '采购', '采购需求'],
  FIND_SUPPLIERS: ['供应商', '制造商', '供货'],
  FIND_PARTNERS: ['合作伙伴', '合作', '战略合作'],
  FIND_DISTRIBUTORS: ['渠道', '经销商', '分销商'],
  RESEARCH_COMPETITORS: ['竞品', '竞争对手', '替代方案'],
  EXPLORE_MARKET: ['市场', '行业需求', '趋势'],
}

export const COMMERCIAL_GOAL_LABELS: Record<CommercialGoal, string> = {
  FIND_BUYERS: '找买家',
  FIND_SUPPLIERS: '找供应商',
  FIND_PARTNERS: '找合作伙伴',
  FIND_DISTRIBUTORS: '找渠道',
  RESEARCH_COMPETITORS: '研究竞品',
  EXPLORE_MARKET: '探索市场',
}

export function buildCommercialTargetSearchExpression(
  target: MarketScanTarget,
  baseQuery = target.product,
): string {
  const parts = [
    baseQuery.trim() || target.product.trim(),
    ...GOAL_SEARCH_TERMS[target.goal],
    target.industry.trim(),
    target.region ? REGION_META[target.region].label : '',
    target.customerType ? CUSTOMER_TYPE_META[target.customerType].label : '',
  ]

  return uniqueNonEmpty(parts).join(' ')
}

export function isExactCommercialTargetSearchQuery(
  query: string,
  target: MarketScanTarget,
): boolean {
  const normalized = normalize(query)
  if (!normalized) return false

  return (
    normalized === normalize(target.product) ||
    normalized === normalize(buildCommercialTargetSearchExpression(target))
  )
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const trimmed = value.trim()
    if (!trimmed) return false
    const key = normalize(trimmed)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}
