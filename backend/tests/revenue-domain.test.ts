import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculateRiskAdjustedValue,
  summarizeRevenueLedger,
} from '../src/services/revenue-domain.service.js'

describe('revenue opportunity prioritization', () => {
  it('prefers achievable net value over a larger speculative headline payout', () => {
    const achievable = calculateRiskAdjustedValue({
      payoutMinMinor: 40_000,
      payoutMaxMinor: 60_000,
      successProbabilityPct: 70,
      estimatedHours: 8,
      capitalRequiredMinor: 0,
      riskScore: 15,
    })
    const speculative = calculateRiskAdjustedValue({
      payoutMinMinor: 300_000,
      payoutMaxMinor: 500_000,
      successProbabilityPct: 5,
      estimatedHours: 80,
      capitalRequiredMinor: 0,
      riskScore: 80,
    })

    assert.ok(achievable > speculative)
  })

  it('subtracts capital and labor costs from expected value', () => {
    const noCapital = calculateRiskAdjustedValue({
      payoutMinMinor: 100_000,
      payoutMaxMinor: 100_000,
      successProbabilityPct: 50,
      estimatedHours: 5,
      capitalRequiredMinor: 0,
      riskScore: 0,
    })
    const funded = calculateRiskAdjustedValue({
      payoutMinMinor: 100_000,
      payoutMaxMinor: 100_000,
      successProbabilityPct: 50,
      estimatedHours: 5,
      capitalRequiredMinor: 20_000,
      riskScore: 0,
    })

    assert.equal(noCapital - funded, 20_000)
  })
})

describe('revenue recognition', () => {
  it('keeps potential, confirmed, pending payout, and paid amounts separate', () => {
    const summary = summarizeRevenueLedger(
      [
        { amountMinor: 90_000, currency: 'USD', status: 'POTENTIAL' },
        { amountMinor: 40_000, currency: 'USD', status: 'CONFIRMED' },
        { amountMinor: 30_000, currency: 'USD', status: 'PENDING_PAYOUT' },
        { amountMinor: 20_000, currency: 'USD', status: 'PAID' },
        { amountMinor: 10_000, currency: 'SGD', status: 'PAID' },
      ],
      'USD',
    )

    assert.deepEqual(summary, {
      currency: 'USD',
      potentialMinor: 90_000,
      confirmedMinor: 40_000,
      pendingPayoutMinor: 30_000,
      paidMinor: 20_000,
      realizedMinor: 90_000,
    })
  })
})
