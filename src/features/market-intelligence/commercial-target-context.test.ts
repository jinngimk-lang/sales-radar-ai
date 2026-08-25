import assert from 'node:assert/strict'
import test from 'node:test'
import type { MarketScanTarget } from './market-intelligence.contract'
import { canRecordCommercialTargetRun } from './commercial-target-context'

const persisted: MarketScanTarget = {
  product: 'industrial robots',
  industry: 'Industrial Manufacturing',
  region: 'Europe',
  customerType: 'Company',
  goal: 'FIND_BUYERS',
  signalFocus: 'ALL',
}

test('records a persisted target run only when the executed target still matches the saved context', () => {
  assert.equal(canRecordCommercialTargetRun(persisted, persisted), true)
  assert.equal(
    canRecordCommercialTargetRun(
      { ...persisted, region: 'China' },
      persisted,
    ),
    false,
  )
  assert.equal(canRecordCommercialTargetRun(persisted, null), false)
})
