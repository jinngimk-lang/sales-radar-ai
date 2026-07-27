import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RuleBasedSearchIntentProvider } from '../src/providers/search-intent/rule-based-search-intent.provider.js'
import { GlobalSearchIntelligenceService } from '../src/services/global-search-intelligence.service.js'

describe('Global Search Intelligence v1', () => {
  const provider = new RuleBasedSearchIntentProvider()
  const intelligence = new GlobalSearchIntelligenceService()

  it('understands a Chinese buyer search', async () => {
    const intent = await provider.parse('寻找美国工业机器人采购商')
    assert.equal(intent.targetType, 'buyer')
    assert.equal(intent.product, 'industrial robots')
    assert.equal(intent.country, 'United States')
    assert.equal(intent.relationship, 'procurement')
  })

  it('understands a Chinese channel search', async () => {
    const strategy = await intelligence.createStrategy(
      '中国自动化设备厂家寻找德国代理商',
    )
    assert.equal(strategy.targetType, 'channel')
    assert.equal(strategy.intent.country, 'Germany')
    assert.equal(strategy.intent.relationship, 'distribution')
    assert.ok(
      strategy.keywords.some(
        (keyword) =>
          keyword.language === 'de' &&
          /Industrieautomatisierung Händler Deutschland/.test(keyword.query),
      ),
    )
  })

  it('understands an English commercial search', async () => {
    const intent = await provider.parse(
      'Find packaging machinery system integrators in Germany',
    )
    assert.equal(intent.targetType, 'channel')
    assert.equal(intent.industry, 'Packaging Machinery')
    assert.equal(intent.relationship, 'system_integration')
  })

  it('falls back safely when the target cannot be determined', async () => {
    const intent = await provider.parse('precision components Europe')
    assert.equal(intent.targetType, 'buyer')
    assert.equal(intent.relationship, 'sales_opportunity')
    assert.equal(intent.country, 'Unknown')
  })

  it('generates a business-oriented multilingual strategy', async () => {
    const strategy = await intelligence.createStrategy(
      '找德国包装机械市场',
    )
    assert.equal(strategy.targetType, 'both')
    assert.deepEqual(strategy.languages, ['en', 'de', 'zh'])
    assert.ok(
      strategy.keywords.some((keyword) =>
        /packaging machinery procurement buyers Germany/i.test(keyword.query),
      ),
    )
    assert.ok(
      strategy.keywords.some((keyword) =>
        /Verpackungsmaschinen Händler Deutschland/.test(keyword.query),
      ),
    )
    assert.match(strategy.reason, /both buyers and channel partners/i)
  })
})
