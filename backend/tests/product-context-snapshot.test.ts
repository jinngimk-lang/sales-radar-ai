import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { Platform, Region } from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import {
  ProductContextSnapshotBuilder,
  type ProductContextRepository,
} from '../src/services/product-context-snapshot.service.js'
import { createSearchTask } from '../src/services/search-task.service.js'
import { AppError } from '../src/utils/app-error.js'
import { GlobalSearchIntelligenceService } from '../src/services/global-search-intelligence.service.js'
import { SearchIntentSnapshotBuilder } from '../src/services/search-intent-snapshot.service.js'

const profile = {
  id: 'product-1',
  productName: 'Industrial automation SaaS',
  category: 'Industrial SaaS',
  industry: 'Industrial Manufacturing',
  applications: ['factory operations', 'production monitoring'],
  buyerPersona: [
    {
      customerType: 'Manufacturing companies',
    },
  ],
  buyerKeywords: ['manufacturing digital transformation'],
  channelKeywords: ['industrial software implementation partner'],
  targetCountries: ['Germany'],
  buyingSignals: ['factory expansion', 'digital upgrade'],
  painPoints: ['production downtime'],
  updatedAt: new Date('2026-07-28T05:00:00.000Z'),
}

function builderHarness(owned = true) {
  const repository: ProductContextRepository = {
    findOwnedProfile: async (id, userId) =>
      owned && id === profile.id && userId === 'user-1' ? profile : null,
  }
  return new ProductContextSnapshotBuilder(
    repository,
    async () => ({ id: 'user-1' }),
    () => new Date('2026-07-28T06:00:00.000Z'),
  )
}

describe('ProductContextSnapshot Builder', () => {
  it('builds a versioned context from an owned ProductProfile', async () => {
    const builder = builderHarness()
    const prepared = await builder.prepare({
      productProfileId: profile.id,
    })
    const snapshot = builder.build(prepared, { region: 'Europe' })

    assert.equal(snapshot.version, 'v2')
    assert.equal(snapshot.source, 'product_profile')
    assert.equal(snapshot.productProfile?.id, profile.id)
    assert.equal(snapshot.productProfile?.updatedAt, profile.updatedAt.toISOString())
    assert.deepEqual(snapshot.context, {
      product: 'Industrial automation SaaS',
      category: 'Industrial SaaS',
      customerType: 'Manufacturing companies',
      industry: 'Industrial Manufacturing',
      applications: ['factory operations', 'production monitoring'],
      region: 'Europe',
      country: 'Germany',
      businessProblem: 'production downtime',
      buyingSignals: ['factory expansion', 'digital upgrade'],
      buyerKeywords: ['manufacturing digital transformation'],
      channelKeywords: ['industrial software implementation partner'],
    })
  })

  it('lets explicit search context override profile defaults', async () => {
    const builder = builderHarness()
    const prepared = await builder.prepare({
      productProfileId: profile.id,
      requestedContext: {
        region: 'Europe',
        country: 'France',
        customerType: 'Automotive manufacturers',
      },
    })
    const snapshot = builder.build(prepared, {
      product: 'generic software',
      region: 'Unknown',
      businessProblem: 'generic problem',
    })

    assert.equal(snapshot.source, 'combined')
    assert.equal(snapshot.context.product, profile.productName)
    assert.equal(snapshot.context.region, 'Europe')
    assert.equal(snapshot.context.country, 'France')
    assert.equal(
      snapshot.context.customerType,
      'Automotive manufacturers',
    )
    assert.equal(snapshot.context.businessProblem, 'production downtime')
  })

  it('rejects a missing or another-user ProductProfile', async () => {
    const builder = builderHarness(false)
    await assert.rejects(
      () => builder.prepare({ productProfileId: profile.id }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'PRODUCT_PROFILE_NOT_FOUND',
    )
  })

  it('feeds the saved product meaning into SearchTask query generation', async () => {
    const builder = builderHarness()
    const prepared = await builder.prepare({
      productProfileId: profile.id,
      requestedContext: { region: 'Europe' },
    })
    const intelligence = new GlobalSearchIntelligenceService()
    const strategy = await intelligence.createStrategy(
      'find manufacturing companies in Europe',
      prepared.context,
    )
    const query = intelligence.optimizedKeyword(strategy, '')

    assert.equal(strategy.intent.product, profile.productName)
    assert.equal(
      strategy.intent.customerType,
      'Manufacturing companies',
    )
    assert.equal(strategy.intent.region, 'Europe')
    assert.match(query, /industrial automation SaaS/i)
    assert.match(query, /manufacturing companies/i)
    assert.match(query, /manufacturing digital transformation/i)
  })
})

describe('ProductProfile SearchTask persistence', () => {
  const suffix = randomUUID()
  let userId = ''
  let productProfileId = ''
  let searchTaskId = ''

  before(async () => {
    const user = await prisma.user.create({
      data: {
        email: `product-context-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })
    userId = user.id
    const storedProfile = await prisma.productProfile.create({
      data: {
        userId,
        productName: `Industrial automation SaaS ${suffix}`,
        category: 'SaaS',
        industry: 'Industrial Manufacturing',
        applications: profile.applications,
        buyerPersona: profile.buyerPersona,
        decisionMakerRoles: [],
        buyerKeywords: profile.buyerKeywords,
        channelKeywords: profile.channelKeywords,
        buyingSignals: profile.buyingSignals,
        painPoints: profile.painPoints,
      },
    })
    productProfileId = storedProfile.id
  })

  after(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined)
  })

  it('links ProductProfile and preserves an immutable historical snapshot', async () => {
    const builder = new ProductContextSnapshotBuilder(
      {
        findOwnedProfile: (id, ownerId) =>
          prisma.productProfile.findFirst({
            where: { id, userId: ownerId },
            select: {
              id: true,
              productName: true,
              category: true,
              industry: true,
              applications: true,
              buyerPersona: true,
              buyerKeywords: true,
              channelKeywords: true,
              targetCountries: true,
              buyingSignals: true,
              painPoints: true,
              updatedAt: true,
            },
          }),
      },
      async () => ({ id: userId }),
    )
    const prepared = await builder.prepare({ productProfileId })
    const intelligence = new GlobalSearchIntelligenceService()
    const strategy = await intelligence.createStrategy(
      'find manufacturing companies in Europe',
      prepared.context,
    )
    const snapshot = builder.build(prepared, { region: 'Europe' })
    const intentSnapshot = new SearchIntentSnapshotBuilder(
      () => new Date('2026-07-28T06:30:00.000Z'),
    ).build(strategy)
    const task = await createSearchTask({
      userId,
      productProfileId,
      keyword: 'European manufacturing companies',
      platforms: [Platform.Website],
      regions: [Region.Europe],
      productContextSnapshot: snapshot,
      searchIntentSnapshot: intentSnapshot,
    })
    searchTaskId = task.id

    await prisma.productProfile.update({
      where: { id: productProfileId },
      data: { productName: `Updated product ${suffix}` },
    })
    const storedTask = await prisma.searchTask.findUniqueOrThrow({
      where: { id: searchTaskId },
    })
    const parameters = storedTask.parameters as {
      productContextSnapshot: typeof snapshot
      searchIntentSnapshot: typeof intentSnapshot
    }

    assert.equal(storedTask.productProfileId, productProfileId)
    assert.equal(
      parameters.productContextSnapshot.context.product,
      `Industrial automation SaaS ${suffix}`,
    )
    assert.equal(
      parameters.productContextSnapshot.productProfile?.id,
      productProfileId,
    )
    assert.equal(parameters.searchIntentSnapshot.version, 'v1')
    assert.equal(parameters.searchIntentSnapshot.salesIntent, 'customer')
    assert.ok(parameters.searchIntentSnapshot.keywords.length > 0)
  })
})
