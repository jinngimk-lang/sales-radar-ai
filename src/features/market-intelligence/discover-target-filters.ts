import { ALL_INDUSTRIES } from '@/data/meta'
import type { CustomerType, Region } from '@/types'
import type { MarketScanTarget } from './market-intelligence.contract'

export interface DiscoverTargetFilters {
  industry: string
  region: Region | ''
  customerType: CustomerType | ''
}

export interface DiscoverTargetFilterMapping {
  filters: DiscoverTargetFilters
  unmappedDimensions: Array<'industry'>
}

export function mapCommercialTargetToDiscoverFilters(
  target: MarketScanTarget,
): DiscoverTargetFilterMapping {
  const industry = target.industry.trim()
  const matchedIndustry = industry
    ? ALL_INDUSTRIES.find(
        (item) => normalize(item.label) === normalize(industry),
      )?.label ?? ''
    : ''

  return {
    filters: {
      industry: matchedIndustry,
      region: target.region,
      customerType: target.customerType,
    },
    unmappedDimensions: industry && !matchedIndustry ? ['industry'] : [],
  }
}

export function discoverTargetFiltersMatch(
  current: DiscoverTargetFilters,
  expected: DiscoverTargetFilters,
): boolean {
  return (
    normalize(current.industry) === normalize(expected.industry) &&
    current.region === expected.region &&
    current.customerType === expected.customerType
  )
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}
