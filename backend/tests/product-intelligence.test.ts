import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RuleBasedProductUnderstandingProvider } from '../src/providers/product-understanding/rule-based-product-understanding.provider.js'
import {
  ProductIntelligenceService,
  type ProductIntelligenceRepository,
  type ProductProfileData,
} from '../src/services/product-intelligence.service.js'

interface StoredProduct extends ProductProfileData {
  id: string
  userId: string
}

function harness() {
  const products: StoredProduct[] = []
  let sequence = 0
  const repository: ProductIntelligenceRepository = {
    findDuplicate: async (userId, productName) =>
      products.find(
        (product) =>
          product.userId === userId &&
          product.productName.toLowerCase() === productName.toLowerCase(),
      ) ?? null,
    create: async (userId, data) => {
      const product = { id: `product-${++sequence}`, userId, ...data }
      products.push(product)
      return product
    },
    list: async (userId) =>
      products.filter((product) => product.userId === userId),
    findById: async (id, userId) =>
      products.find(
        (product) => product.id === id && product.userId === userId,
      ) ?? null,
    update: async (id, userId, data) => {
      const product = products.find(
        (candidate) => candidate.id === id && candidate.userId === userId,
      )
      if (!product) throw new Error('missing product')
      Object.assign(product, data)
      return product
    },
  }
  const provider = new RuleBasedProductUnderstandingProvider()
  const service = new ProductIntelligenceService(
    repository,
    (query) => provider.understand(query),
    async () => ({ id: 'user-1' }),
  )
  return { products, service }
}

describe('Product Intelligence Hub v1', () => {
  it('creates an industrial equipment profile', async () => {
    const { service } = harness()
    const product = (await service.create(
      '中国生产自动包装机',
    )) as StoredProduct
    assert.equal(product.productName, 'Automatic Packaging Machinery')
    assert.equal(product.category, 'Industrial Automation Equipment')
    assert.ok(product.buyerKeywords.length > 0)
    assert.ok(product.channelKeywords.length > 0)
  })

  it('creates a SaaS product profile', async () => {
    const { service } = harness()
    const product = (await service.create('B2B SaaS workflow software')) as StoredProduct
    assert.equal(product.industry, 'Software')
    assert.ok(product.recommendedPlatforms.includes('Software directories'))
  })

  it('creates a consumer product profile', async () => {
    const { service } = harness()
    const product = (await service.create('skincare products')) as StoredProduct
    assert.equal(product.category, 'Consumer Products')
    assert.ok(product.recommendedPlatforms.includes('TikTok'))
  })

  it('saves multiple products for one user', async () => {
    const { products, service } = harness()
    await service.create('automatic packaging machine')
    await service.create('industrial robots')
    await service.create('B2B SaaS')
    assert.equal(products.length, 3)
  })

  it('returns the existing profile for duplicate products', async () => {
    const { products, service } = harness()
    const first = (await service.create('automatic packaging machine')) as StoredProduct
    const second = (await service.create('中国生产自动包装机')) as StoredProduct
    assert.equal(products.length, 1)
    assert.equal(second.id, first.id)
  })

  it('reads a saved product and exposes buyer/channel strategies', async () => {
    const { service } = harness()
    const created = (await service.create('industrial robots')) as StoredProduct
    const loaded = (await service.get(created.id)) as StoredProduct
    const buyer = await service.getBuyerStrategy(created.id)
    const channel = await service.getChannelStrategy(created.id)

    assert.equal(loaded.id, created.id)
    assert.ok(buyer.keywords.includes('industrial robot procurement'))
    assert.ok(channel.keywords.includes('industrial robot system integrator'))
  })
})
