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
    const strategy = await intelligence.createStrategy(
      '寻找美国工业机器人采购商',
    )
    assert.equal(strategy.salesIntent, 'customer')
  })

  it('understands a Chinese channel search', async () => {
    const strategy = await intelligence.createStrategy(
      '中国自动化设备厂家寻找德国代理商',
    )
    assert.equal(strategy.targetType, 'channel')
    assert.equal(strategy.intent.country, 'Germany')
    assert.equal(strategy.intent.relationship, 'distribution')
    assert.equal(strategy.salesIntent, 'channel')
    assert.ok(
      strategy.keywords.some(
        (keyword) =>
          keyword.language === 'de' &&
          /Industrieautomatisierung Händler Deutschland/.test(keyword.query),
      ),
    )
  })

  it('distinguishes partnership intent from channel discovery', async () => {
    const strategy = await intelligence.createStrategy(
      '寻找德国工业自动化技术合作伙伴',
      {
        product: 'industrial automation SaaS',
        category: 'Industrial SaaS',
        industry: 'Industrial Manufacturing',
        channelKeywords: ['industrial software technology partner'],
      },
    )

    assert.equal(strategy.salesIntent, 'partnership')
    assert.equal(strategy.targetType, 'channel')
    assert.deepEqual(strategy.searchDirections, [
      'industrial software technology partner',
    ])
    assert.match(strategy.keywords[0]?.query ?? '', /business partnership/i)

    const english = await intelligence.createStrategy(
      'Find industrial automation channel partners in Germany',
    )
    assert.equal(english.salesIntent, 'partnership')
    assert.equal(english.intent.relationship, 'partnership')
  })

  it('uses Product Context keywords to expand a customer search', async () => {
    const strategy = await intelligence.createStrategy(
      'find European manufacturers',
      {
        product: 'industrial automation SaaS',
        category: 'Industrial SaaS',
        industry: 'Industrial Manufacturing',
        customerType: 'Manufacturing companies',
        region: 'Europe',
        applications: ['production monitoring'],
        buyerKeywords: ['factory digital transformation'],
      },
    )

    assert.equal(strategy.intent.category, 'Industrial SaaS')
    assert.equal(strategy.salesIntent, 'customer')
    assert.deepEqual(strategy.searchDirections, [
      'factory digital transformation',
    ])
    assert.match(strategy.keywords[0]?.query ?? '', /production monitoring/i)
    assert.match(
      strategy.keywords[0]?.query ?? '',
      /factory digital transformation/i,
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

  it('preserves the same product direction in Chinese and English searches', async () => {
    const chinese = await intelligence.createStrategy(
      '我销售工业机器人，寻找欧洲制造企业',
    )
    const english = await intelligence.createStrategy(
      'I sell industrial robots, find European manufacturing companies',
    )

    assert.equal(chinese.intent.product, 'industrial robots')
    assert.equal(english.intent.product, 'industrial robots')
    assert.equal(chinese.intent.region, 'Europe')
    assert.equal(english.intent.region, 'Europe')
    assert.equal(chinese.targetType, 'buyer')
    assert.equal(english.targetType, 'buyer')
    assert.match(
      intelligence.optimizedKeyword(chinese, ''),
      /industrial robots/i,
    )
    assert.match(
      intelligence.optimizedKeyword(english, ''),
      /industrial robots/i,
    )
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
        /packaging machinery.*official company website.*Germany/i.test(
          keyword.query,
        ),
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
