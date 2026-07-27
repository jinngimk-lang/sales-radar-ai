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
import { SalesLearningInsightService } from '../src/services/sales-learning-insight.service.js'

function record(
  overrides: Partial<SalesLearningRecord> = {},
): SalesLearningRecord {
  return {
    researchId: 'research-1',
    matchScore: 85,
    recommendedAngle: '降低生产停机风险',
    feedbackType: 'useful',
    outcomeStatus: LeadOutcomeStatus.REPLIED,
    productProfileId: 'product-1',
    productName: 'Industrial Robots',
    leadCategory: 'company',
    country: 'Germany',
    industry: Industry.IndustrialManufacturing,
    region: Region.Europe,
    ...overrides,
  }
}

function insightHarness(
  records: SalesLearningRecord[],
  activeUserId = 'user-1',
) {
  let requestedUserId = ''
  const repository: SalesLearningAnalyticsRepository = {
    list: async (userId) => {
      requestedUserId = userId
      return records
    },
  }
  const analytics = new SalesLearningAnalyticsService(
    repository,
    async () => ({ id: activeUserId }),
  )
  return {
    service: new SalesLearningInsightService(analytics),
    requestedUserId: () => requestedUserId,
  }
}

describe('Sales Learning Intelligence v1', () => {
  it('generates structured business insights from historical results', async () => {
    const records = Array.from({ length: 8 }, (_, index) =>
      record({
        researchId: `research-${index}`,
        outcomeStatus:
          index < 2 ? LeadOutcomeStatus.WON : LeadOutcomeStatus.REPLIED,
      }),
    )
    const insights = await insightHarness(records).service.insights()

    assert.deepEqual(
      new Set(insights.map((insight) => insight.type)),
      new Set(['product', 'market', 'sales_angle', 'lead_quality']),
    )
    assert.ok(insights.every((insight) => insight.confidence === 'MEDIUM'))
    assert.ok(insights.every((insight) => insight.sampleSize === 8))
    assert.ok(insights.every((insight) => insight.summary.includes('历史样本')))
  })

  it('returns an empty collection safely when no history exists', async () => {
    assert.deepEqual(await insightHarness([]).service.insights(), [])
  })

  it('inherits active-user isolation from the Analytics Layer', async () => {
    const test = insightHarness([record()], 'user-2')
    await test.service.insights()
    assert.equal(test.requestedUserId(), 'user-2')
  })

  it('uses LOW confidence and cautious wording for a small sample', async () => {
    const insights = await insightHarness([
      record({ researchId: 'research-1' }),
      record({ researchId: 'research-2' }),
      record({ researchId: 'research-3' }),
    ]).service.insights()

    assert.ok(insights.length > 0)
    assert.ok(insights.every((insight) => insight.confidence === 'LOW'))
    assert.ok(insights.every((insight) => insight.title.includes('待更多数据验证')))
    assert.ok(insights.every((insight) => insight.summary.includes('观察信号')))
  })

  it('selects the strongest product and customer-type combination', async () => {
    const records = [
      ...Array.from({ length: 8 }, (_, index) =>
        record({
          researchId: `robot-${index}`,
          productProfileId: 'product-robots',
          productName: 'Industrial Robots',
          leadCategory: 'buyer',
          outcomeStatus:
            index < 6
              ? LeadOutcomeStatus.REPLIED
              : LeadOutcomeStatus.CONTACTED,
        }),
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        record({
          researchId: `saas-${index}`,
          productProfileId: 'product-saas',
          productName: 'Factory SaaS',
          leadCategory: 'company',
          outcomeStatus:
            index < 2
              ? LeadOutcomeStatus.REPLIED
              : LeadOutcomeStatus.CONTACTED,
        }),
      ),
    ]
    const insights = await insightHarness(records).service.insights()
    const productInsight = insights.find(
      (insight) => insight.type === 'product',
    )

    assert.equal(productInsight?.dimensions.productId, 'product-robots')
    assert.equal(productInsight?.dimensions.productName, 'Industrial Robots')
    assert.equal(productInsight?.dimensions.leadCategory, 'buyer')
    assert.equal(productInsight?.metrics.replyRate, 0.75)
    assert.equal(productInsight?.confidence, 'MEDIUM')
  })
})
