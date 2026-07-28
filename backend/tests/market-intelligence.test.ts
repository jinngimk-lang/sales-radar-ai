import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  Industry,
  MarketSignalType,
  Platform,
  Region,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import {
  captureMarketSignalsSafely,
  marketIntelligence,
} from '../src/services/market-intelligence/market-intelligence.service.js'
import type { SearchResult } from '../src/providers/search/search-provider.interface.js'

const suffix = randomUUID()
let ownerId = ''
let otherUserId = ''

function realResult(
  sourceUrl: string,
  title = 'Acme announces factory expansion in Europe',
): SearchResult {
  return {
    externalId: `market-signal-${randomUUID()}`,
    platform: Platform.Website,
    sourceUrl,
    profileUrl: sourceUrl,
    company: 'Acme Manufacturing',
    customerName: 'Unknown',
    country: 'Germany',
    region: Region.Europe,
    industry: Industry.IndustrialManufacturing,
    rawContent:
      'Acme Manufacturing announced a factory expansion to increase manufacturing capacity in Europe.',
    metadata: { title },
  }
}

describe('Market Intelligence Layer Phase 1', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `market-signal-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `market-signal-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('isolates MarketSignals by user', async () => {
    await marketIntelligence.captureSearchResult({
      userId: ownerId,
      provider: 'agent-reach',
      result: realResult(`https://example.com/${suffix}/owner-expansion`),
    })
    await marketIntelligence.captureSearchResult({
      userId: otherUserId,
      provider: 'agent-reach',
      result: realResult(`https://example.com/${suffix}/other-expansion`),
    })

    const ownerSignals = await marketIntelligence.listForUser(ownerId)
    assert.equal(ownerSignals.length, 1)
    assert.equal(ownerSignals[0]?.userId, ownerId)
    assert.equal(
      ownerSignals.some((signal) => signal.userId === otherUserId),
      false,
    )
  })

  it('stores the real sourceUrl without inventing a source', async () => {
    const sourceUrl = `https://example.com/${suffix}/verified-investment`
    const [signal] = await marketIntelligence.captureSearchResult({
      userId: ownerId,
      provider: 'agent-reach',
      result: realResult(
        sourceUrl,
        'Acme announces investment in European manufacturing',
      ),
    })

    assert.equal(signal?.sourceUrl, sourceUrl)
    assert.equal(signal?.signalType, MarketSignalType.FACTORY_EXPANSION)
  })

  it('does not create a MarketSignal without a valid source URL', async () => {
    const countBefore = await prisma.marketSignal.count({
      where: { userId: ownerId },
    })
    const signals = await marketIntelligence.captureSearchResult({
      userId: ownerId,
      provider: 'agent-reach',
      result: realResult(''),
    })

    assert.deepEqual(signals, [])
    assert.equal(
      await prisma.marketSignal.count({ where: { userId: ownerId } }),
      countBefore,
    )
  })

  it('does not change Lead qualification or create a Lead', async () => {
    const leadCountBefore = await prisma.lead.count({
      where: { userId: ownerId },
    })
    await marketIntelligence.captureSearchResult({
      userId: ownerId,
      provider: 'agent-reach',
      result: realResult(`https://example.com/${suffix}/signal-only`),
    })

    assert.equal(
      await prisma.lead.count({ where: { userId: ownerId } }),
      leadCountBefore,
    )
  })

  it('contains MarketSignal failures so the main SearchTask flow can continue', async () => {
    const result = await captureMarketSignalsSafely(
      {
        userId: ownerId,
        provider: 'agent-reach',
        result: realResult(`https://example.com/${suffix}/safe-failure`),
      },
      {
        async captureSearchResult() {
          throw new Error('market signal persistence unavailable')
        },
      },
    )

    assert.deepEqual(result, [])
  })
})
