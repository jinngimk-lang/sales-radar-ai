import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RuleBasedProductUnderstandingProvider } from '../src/providers/product-understanding/rule-based-product-understanding.provider.js'

describe('Product Understanding Agent v1', () => {
  const provider = new RuleBasedProductUnderstandingProvider()

  it('understands industrial equipment beyond a literal product name', async () => {
    const result = await provider.understand('automatic packaging machine')
    assert.equal(
      result.productUnderstanding.category,
      'Industrial Automation Equipment',
    )
    assert.ok(
      result.productUnderstanding.applications.includes(
        'Food packaging automation',
      ),
    )
    assert.ok(
      result.productUnderstanding.applications.includes(
        'Production line upgrades',
      ),
    )
    assert.ok(
      result.recommendedRoles.some(
        (role) => role.role === 'Engineering Manager',
      ),
    )
  })

  it('maps SaaS software to business and technical buyers', async () => {
    const result = await provider.understand('B2B SaaS workflow software')
    assert.equal(result.productUnderstanding.industry, 'Software')
    assert.ok(
      result.recommendedRoles.some((role) => role.role === 'IT Director'),
    )
    assert.ok(
      result.searchStrategy.recommendedPlatforms.includes(
        'Software directories',
      ),
    )
  })

  it('selects consumer-oriented discovery channels', async () => {
    const result = await provider.understand('skincare products')
    assert.equal(result.productUnderstanding.category, 'Consumer Products')
    assert.ok(result.searchStrategy.recommendedPlatforms.includes('TikTok'))
    assert.ok(result.searchStrategy.recommendedPlatforms.includes('Instagram'))
    assert.ok(
      result.buyerPersona.some(
        (persona) => persona.customerType === 'Retail buyer',
      ),
    )
  })

  it('understands Chinese manufacturing input commercially', async () => {
    const result = await provider.understand('中国生产自动包装机')
    assert.equal(
      result.productUnderstanding.productName,
      'Automatic Packaging Machinery',
    )
    assert.ok(
      result.searchStrategy.channelKeywords.includes(
        'packaging machinery distributor',
      ),
    )
    assert.ok(
      result.salesPreparation.buyingSignals.includes(
        'Production automation upgrade',
      ),
    )
  })

  it('understands English industrial robotics input', async () => {
    const result = await provider.understand(
      'industrial robots for machine tending',
    )
    assert.equal(result.productUnderstanding.industry, 'Industrial Automation')
    assert.ok(
      result.productUnderstanding.relatedProducts.includes('Machine vision'),
    )
    assert.ok(
      result.searchStrategy.channelKeywords.includes(
        'industrial robot system integrator',
      ),
    )
  })
})
