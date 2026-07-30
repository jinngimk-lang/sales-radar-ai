import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ProductContextNormalizationService } from '../src/services/product-context-normalization.service.js'

const normalizer = new ProductContextNormalizationService()

describe('Opportunity Product Context normalization', () => {
  it('maps buyer aliases to the canonical buyer goal', () => {
    for (const customerType of [
      'Buyer companies',
      'Buyer company',
      'Company buyers',
      'End-user companies',
    ]) {
      assert.equal(
        normalizer.normalize({ customerType }).customerGoal,
        'BUYER',
      )
    }
  })

  it('does not assume that a generic company or manufacturer is a buyer', () => {
    assert.equal(
      normalizer.normalize({ customerType: 'Company' }).customerGoal,
      'UNKNOWN',
    )
    assert.equal(
      normalizer.normalize({ customerType: 'Manufacturer' }).customerGoal,
      'UNKNOWN',
    )
  })

  it('normalizes packaging product aliases into one product family', () => {
    for (const product of [
      'Packaging Automation',
      'Packaging Machinery',
      'Packaging Equipment',
      'Packaging Line',
    ]) {
      assert.equal(
        normalizer.normalize({ product }).productFamily,
        'PACKAGING_AUTOMATION',
      )
    }
  })

  it('does not treat a packaging product category as a target industry', () => {
    const context = normalizer.normalize({
      product: 'Packaging Automation',
      industry: 'Packaging Machinery',
    })

    assert.equal(context.productFamily, 'PACKAGING_AUTOMATION')
    assert.deepEqual(context.targetIndustries, [])
  })

  it('normalizes explicit target industries independently from product family', () => {
    const cases = [
      ['Food Manufacturing', 'FOOD_MANUFACTURING'],
      ['Beverage', 'BEVERAGE'],
      ['Pharmaceutical', 'PHARMACEUTICAL'],
      ['Consumer Goods', 'CONSUMER_GOODS'],
      ['Industrial Manufacturing', 'INDUSTRIAL_MANUFACTURING'],
    ] as const

    for (const [industry, expected] of cases) {
      const context = normalizer.normalize({
        product: 'Packaging Automation',
        industry,
      })
      assert.equal(context.productFamily, 'PACKAGING_AUTOMATION')
      assert.deepEqual(context.targetIndustries, [expected])
    }
  })

  it('preserves supplier, distributor, partner, and competitor goals', () => {
    assert.equal(
      normalizer.normalize({ customerType: 'Suppliers' }).customerGoal,
      'SUPPLIER',
    )
    assert.equal(
      normalizer.normalize({ customerType: 'Distributors' }).customerGoal,
      'DISTRIBUTOR',
    )
    assert.equal(
      normalizer.normalize({ customerType: 'Business partners' }).customerGoal,
      'PARTNER',
    )
    assert.equal(
      normalizer.normalize({ customerType: 'Competitors' }).customerGoal,
      'COMPETITOR',
    )
  })
})
