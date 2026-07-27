import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  Industry,
  LeadOutcomeStatus,
  Region,
} from '@prisma/client'
import {
  SalesLearningAnalyticsService,
  type SalesLearningAnalyticsRepository,
  type SalesLearningRecord,
} from '../src/services/sales-learning-analytics.service.js'

function record(
  overrides: Partial<SalesLearningRecord> = {},
): SalesLearningRecord {
  return {
    researchId: 'research-1',
    matchScore: 80,
    recommendedAngle: 'Improve production efficiency',
    feedbackType: null,
    outcomeStatus: null,
    productProfileId: null,
    productName: null,
    leadCategory: 'company',
    country: 'United States',
    industry: Industry.IndustrialManufacturing,
    region: Region.USA,
    ...overrides,
  }
}

function serviceWith(
  records: SalesLearningRecord[],
  activeUserId = 'user-1',
) {
  const calls: Array<{ userId: string }> = []
  const repository: SalesLearningAnalyticsRepository = {
    list: async (userId) => {
      calls.push({ userId })
      return userId === activeUserId ? records : []
    },
  }
  return {
    service: new SalesLearningAnalyticsService(repository, async () => ({
      id: activeUserId,
    })),
    calls,
  }
}

describe('Sales Learning Foundation v1', () => {
  it('aggregates AI quality and funnel metrics correctly', async () => {
    const test = serviceWith([
      record({
        researchId: 'research-1',
        matchScore: 90,
        feedbackType: 'accurate',
        outcomeStatus: LeadOutcomeStatus.WON,
      }),
      record({
        researchId: 'research-2',
        matchScore: 70,
        feedbackType: 'useful',
        outcomeStatus: LeadOutcomeStatus.REPLIED,
      }),
      record({
        researchId: 'research-3',
        matchScore: 50,
        feedbackType: 'inaccurate',
        outcomeStatus: LeadOutcomeStatus.CONTACTED,
      }),
    ])

    const result = await test.service.overview()
    assert.equal(result.totalAnalyzedLeads, 3)
    assert.equal(result.averageMatchScore, 70)
    assert.equal(result.feedbackAccuracy, 0.6667)
    assert.equal(result.replyRate, 0.6667)
    assert.equal(result.meetingRate, 0.3333)
    assert.equal(result.winRate, 0.3333)
    assert.equal(
      result.matchScoreBuckets.find((bucket) => bucket.range === '80-100')
        ?.winRate,
      1,
    )
  })

  it('returns a safe zero result when no data exists', async () => {
    const result = await serviceWith([]).service.overview()
    assert.equal(result.totalAnalyzedLeads, 0)
    assert.equal(result.averageMatchScore, 0)
    assert.equal(result.feedbackAccuracy, 0)
    assert.equal(result.replyRate, 0)
    assert.equal(result.meetingRate, 0)
    assert.equal(result.winRate, 0)
    assert.equal(result.matchScoreBuckets.length, 4)
    assert.deepEqual(result.topSalesAngles, [])
  })

  it('requests analytics only for the active user', async () => {
    let requestedUserId = ''
    const repository: SalesLearningAnalyticsRepository = {
      list: async (userId) => {
        requestedUserId = userId
        return []
      },
    }
    const service = new SalesLearningAnalyticsService(
      repository,
      async () => ({ id: 'user-2' }),
    )

    await service.overview()
    assert.equal(requestedUserId, 'user-2')
  })

  it('groups performance by ProductProfile correctly', async () => {
    const test = serviceWith([
      record({
        researchId: 'research-1',
        productProfileId: 'product-1',
        productName: 'Industrial Robots',
        matchScore: 90,
        feedbackType: 'accurate',
        outcomeStatus: LeadOutcomeStatus.WON,
      }),
      record({
        researchId: 'research-2',
        productProfileId: 'product-1',
        productName: 'Industrial Robots',
        matchScore: 70,
        feedbackType: 'useful',
        outcomeStatus: LeadOutcomeStatus.REPLIED,
      }),
      record({
        researchId: 'research-3',
        productProfileId: 'product-2',
        productName: 'Factory SaaS',
        matchScore: 60,
        feedbackType: 'not_useful',
        outcomeStatus: LeadOutcomeStatus.CONTACTED,
      }),
      record({
        researchId: 'research-4',
        productProfileId: null,
        productName: null,
      }),
    ])

    const products = await test.service.products()
    assert.equal(products.length, 2)
    assert.deepEqual(products[0], {
      productId: 'product-1',
      productName: 'Industrial Robots',
      totalAnalyzedLeads: 2,
      averageMatchScore: 80,
      feedbackAccuracy: 1,
      replyRate: 1,
      meetingRate: 0.5,
      winRate: 0.5,
    })
    assert.equal(products[1]?.productName, 'Factory SaaS')
    assert.equal(products[1]?.replyRate, 0)
  })

  it('maps current Outcome stages into cumulative funnel rates', async () => {
    const statuses = [
      LeadOutcomeStatus.CONTACTED,
      LeadOutcomeStatus.REPLIED,
      LeadOutcomeStatus.MEETING,
      LeadOutcomeStatus.QUALIFIED,
      LeadOutcomeStatus.WON,
    ]
    const result = await serviceWith(
      statuses.map((outcomeStatus, index) =>
        record({
          researchId: `research-${index}`,
          outcomeStatus,
        }),
      ),
    ).service.overview()

    assert.equal(result.replyRate, 0.8)
    assert.equal(result.meetingRate, 0.6)
    assert.equal(result.winRate, 0.2)
    assert.equal(result.outcomeCounts.CONTACTED, 1)
    assert.equal(result.outcomeCounts.WON, 1)
  })
})
