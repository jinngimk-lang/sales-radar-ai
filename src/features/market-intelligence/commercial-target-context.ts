import type { MarketScanTarget } from './market-intelligence.contract'

export function canRecordCommercialTargetRun(
  current: MarketScanTarget,
  persisted: MarketScanTarget | null,
) {
  if (!persisted) return false

  return (
    current.product === persisted.product &&
    current.industry === persisted.industry &&
    current.region === persisted.region &&
    current.customerType === persisted.customerType &&
    current.goal === persisted.goal &&
    current.signalFocus === persisted.signalFocus
  )
}
