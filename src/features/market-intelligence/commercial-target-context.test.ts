import assert from 'node:assert/strict'
import test from 'node:test'
import type { MarketScanTarget } from './market-intelligence.contract'
import { canRecordCommercialTargetRun } from './commercial-target-context'
import {
  buildCommercialTargetSearchExpression,
  isExactCommercialTargetSearchQuery,
} from './commercial-target-search'

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

test('compiles persisted commercial intent into the real proactive-search expression', () => {
  const expression = buildCommercialTargetSearchExpression(persisted)

  assert.equal(
    expression,
    'industrial robots 买家 采购 采购需求 Industrial Manufacturing 欧洲 企业客户',
  )
  assert.equal(isExactCommercialTargetSearchQuery('industrial robots', persisted), true)
  assert.equal(isExactCommercialTargetSearchQuery(expression, persisted), true)
  assert.equal(
    isExactCommercialTargetSearchQuery('industrial robots spare parts', persisted),
    false,
  )
})

test('commercial goal changes the actual proactive-search expression', () => {
  const supplierExpression = buildCommercialTargetSearchExpression({
    ...persisted,
    goal: 'FIND_SUPPLIERS',
  })

  assert.match(supplierExpression, /供应商/)
  assert.match(supplierExpression, /制造商/)
  assert.doesNotMatch(supplierExpression, /买家/)
})
