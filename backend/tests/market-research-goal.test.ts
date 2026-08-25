import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readResearchTarget } from '../src/controllers/market-signal.controller.js'
import { MarketWebResearchService } from '../src/services/market-intelligence/market-web-research.service.js'
import { AppError } from '../src/utils/app-error.js'

function emptyPersistence() {
  return {
    async captureSearchResult() {
      return []
    },
  }
}

describe('market research commercial goal', () => {
  it('turns buyer and supplier goals into different upstream research audiences', async () => {
    const queries: string[] = []
    const service = new MarketWebResearchService({
      environment: { EXA_API_KEY: 'test-exa-key' },
      searchProvider: {
        name: 'agent-reach',
        async search(input) {
          queries.push(input.keyword)
          return []
        },
      },
      persistence: emptyPersistence(),
    })

    const buyerTarget = readResearchTarget({
      product: 'industrial automation',
      goal: 'FIND_BUYERS',
      signalFocus: 'ALL',
    })
    const supplierTarget = readResearchTarget({
      product: 'industrial automation',
      goal: 'FIND_SUPPLIERS',
      signalFocus: 'ALL',
    })

    await service.run('user-1', buyerTarget)
    await service.run('user-1', supplierTarget)

    assert.equal(queries.length, 2)
    assert.match(queries[0] ?? '', /FIND_BUYERS/)
    assert.match(queries[0] ?? '', /buyers|procurement|purchasing/)
    assert.match(queries[1] ?? '', /FIND_SUPPLIERS/)
    assert.match(queries[1] ?? '', /suppliers|manufacturers|vendors/)
    assert.notEqual(queries[0], queries[1])
  })

  it('preserves an explicit entity type while applying the commercial goal', () => {
    const target = readResearchTarget({
      product: 'industrial automation',
      customerType: 'Company',
      goal: 'FIND_DISTRIBUTORS',
    })

    assert.match(target.customerType ?? '', /requested entity type: Company/)
    assert.match(target.customerType ?? '', /FIND_DISTRIBUTORS/)
    assert.match(target.customerType ?? '', /distributors|resellers|dealers/)
  })

  it('rejects unsupported goals instead of silently treating them as buyers', () => {
    assert.throws(
      () =>
        readResearchTarget({
          product: 'industrial automation',
          goal: 'FIND_ANYTHING',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError)
        assert.equal(error.statusCode, 400)
        assert.equal(error.code, 'MARKET_RESEARCH_GOAL_INVALID')
        return true
      },
    )
  })

  it('keeps legacy requests unchanged when they do not send a goal', () => {
    const target = readResearchTarget({
      product: 'industrial automation',
      customerType: 'Buyer',
    })

    assert.equal(target.customerType, 'Buyer')
  })
})
