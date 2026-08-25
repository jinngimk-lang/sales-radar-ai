import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  discoverTargetFiltersMatch,
  mapCommercialTargetToDiscoverFilters,
} from './discover-target-filters.ts'
import type { MarketScanTarget } from './market-intelligence.contract.ts'

const target = (overrides: Partial<MarketScanTarget> = {}): MarketScanTarget => ({
  product: 'industrial automation SaaS',
  industry: '工业制造',
  region: 'Europe',
  customerType: 'Company',
  goal: 'FIND_BUYERS',
  signalFocus: 'ALL',
  ...overrides,
})

describe('CommercialTarget to Discover structured filters', () => {
  it('maps exact supported industry, region and customer type without guessing', () => {
    const mapping = mapCommercialTargetToDiscoverFilters(target())

    assert.deepEqual(mapping.filters, {
      industry: '工业制造',
      region: 'Europe',
      customerType: 'Company',
    })
    assert.deepEqual(mapping.unmappedDimensions, [])
  })

  it('keeps unsupported industries explicit instead of silently translating them', () => {
    const mapping = mapCommercialTargetToDiscoverFilters(
      target({ industry: 'Aerospace Components' }),
    )

    assert.equal(mapping.filters.industry, '')
    assert.deepEqual(mapping.unmappedDimensions, ['industry'])
  })

  it('detects user changes to any structured target dimension', () => {
    const expected = mapCommercialTargetToDiscoverFilters(target()).filters

    assert.equal(discoverTargetFiltersMatch(expected, expected), true)
    assert.equal(
      discoverTargetFiltersMatch(
        { ...expected, region: 'China' },
        expected,
      ),
      false,
    )
    assert.equal(
      discoverTargetFiltersMatch(
        { ...expected, customerType: 'Buyer' },
        expected,
      ),
      false,
    )
    assert.equal(
      discoverTargetFiltersMatch(
        { ...expected, industry: 'SaaS 软件' },
        expected,
      ),
      false,
    )
  })
})
