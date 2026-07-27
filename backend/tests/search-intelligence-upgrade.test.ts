import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  Industry,
  LeadIdentityStatus,
  Platform,
  Region,
} from '@prisma/client'
import type { SearchResult } from '../src/providers/search/search-provider.interface.js'
import { RuleBasedSearchIntentProvider } from '../src/providers/search-intent/rule-based-search-intent.provider.js'
import { RuleBasedProductUnderstandingProvider } from '../src/providers/product-understanding/rule-based-product-understanding.provider.js'
import { companyIdentityExtraction } from '../src/services/company-identity-extraction.service.js'
import { GlobalSearchIntelligenceService } from '../src/services/global-search-intelligence.service.js'
import { searchEvidencePipeline } from '../src/services/search-evidence-pipeline.service.js'

function websiteResult(
  company: string,
  content: string,
): SearchResult {
  return {
    externalId: company,
    platform: Platform.Website,
    sourceUrl: 'https://keba.com/en/industrial-automation',
    profileUrl: 'https://keba.com',
    company,
    customerName: company,
    country: 'Germany',
    region: Region.Europe,
    industry: Industry.IndustrialManufacturing,
    rawContent: content,
    metadata: {
      companyDomain: 'keba.com',
      companyWebsite: 'https://keba.com',
      customerType: 'Company',
    },
  }
}

describe('Search Intelligence Upgrade v1', () => {
  it('preserves industrial automation SaaS instead of converting it to equipment', async () => {
    const intent = await new RuleBasedSearchIntentProvider().parse(
      'I sell industrial automation SaaS',
    )

    assert.equal(intent.product, 'industrial automation SaaS')
    assert.equal(intent.industry, 'Industrial Manufacturing')
  })

  it('preserves the full industrial automation SaaS buyer context', async () => {
    const input =
      'I sell industrial automation SaaS, find European manufacturing companies'
    const intent = await new RuleBasedSearchIntentProvider().parse(input)
    const product =
      await new RuleBasedProductUnderstandingProvider().understand(input)
    const intelligence = new GlobalSearchIntelligenceService()
    const strategy = await intelligence.createStrategy(input, {
      product: product.productUnderstanding.productName,
      industry: product.productUnderstanding.industry,
      customerType: intent.targetType,
    })
    const query = intelligence.optimizedKeyword(strategy, '')

    assert.equal(intent.targetType, 'buyer')
    assert.equal(strategy.intent.product, 'industrial automation SaaS')
    assert.equal(strategy.intent.industry, 'Industrial Manufacturing')
    assert.equal(strategy.intent.region, 'Europe')
    assert.equal(strategy.intent.country, 'Unknown')
    assert.equal(strategy.intent.customerType, 'Manufacturing companies')
    assert.match(query, /industrial automation SaaS/i)
    assert.match(query, /manufacturing companies/i)
    assert.match(query, /Europe/i)
    assert.match(query, /-reseller.*-distributor/i)
  })

  it('preserves CRM SaaS, small-business buyers, and Europe', async () => {
    const input = 'I sell CRM SaaS for small businesses in Europe'
    const intent = await new RuleBasedSearchIntentProvider().parse(input)
    const product =
      await new RuleBasedProductUnderstandingProvider().understand(input)
    const intelligence = new GlobalSearchIntelligenceService()
    const strategy = await intelligence.createStrategy(input, {
      product: product.productUnderstanding.productName,
      industry: product.productUnderstanding.industry,
      customerType: intent.targetType,
    })
    const query = intelligence.optimizedKeyword(strategy, '')

    assert.equal(strategy.targetType, 'buyer')
    assert.equal(strategy.intent.product, 'CRM SaaS')
    assert.equal(strategy.intent.region, 'Europe')
    assert.equal(strategy.intent.country, 'Unknown')
    assert.equal(strategy.intent.customerType, 'Small businesses')
    assert.match(query, /CRM SaaS/i)
    assert.match(query, /small businesses/i)
    assert.match(query, /Europe/i)
    assert.match(query, /-reseller.*-distributor/i)
  })

  it('generates a company-oriented query from full ProductContext', async () => {
    const intelligence = new GlobalSearchIntelligenceService()
    const strategy = await intelligence.createStrategy(
      'I sell industrial automation SaaS',
      {
        product: 'industrial automation SaaS',
        industry: 'Industrial Manufacturing',
        region: 'Europe',
        customerType: 'Buyer',
        businessProblem: 'reduce production downtime',
        buyingSignals: ['factory expansion', 'technology upgrade'],
      },
    )
    const query = intelligence.optimizedKeyword(strategy, '')

    assert.match(query, /industrial automation SaaS factory operations digital transformation/i)
    assert.match(query, /end-user companies/i)
    assert.match(query, /Industrial Manufacturing/i)
    assert.match(query, /companies/i)
    assert.match(query, /reduce production downtime/i)
    assert.match(query, /factory expansion/i)
    assert.match(query, /official company website/i)
    assert.match(query, /Europe/i)
    assert.doesNotMatch(query, /equipment procurement buyers/i)
    assert.equal(
      strategy.intent.businessProblem,
      'reduce production downtime',
    )
    assert.deepEqual(strategy.intent.buyingSignals, [
      'factory expansion',
      'technology upgrade',
    ])
  })

  it('rejects category phrases as company identities', () => {
    for (const genericCompany of [
      'Automation Technology',
      'OEM Manufacturing',
    ]) {
      const result = websiteResult(
        genericCompany,
        `${genericCompany} provides industrial manufacturing products, automation software and engineering services for factory operations.`,
      )
      const identity = companyIdentityExtraction.extract(result)
      assert.notEqual(identity.identityStatus, LeadIdentityStatus.VERIFIED)
      assert.equal(identity.companyName, null)
      assert.ok(
        identity.reasons.some((reason) =>
          reason.includes('Rejected generic company identity'),
        ),
      )
    }
  })

  it('keeps distinctive legal company identities with confidence reasoning', () => {
    const result = websiteResult(
      'KEBA Industrial Automation GmbH',
      'KEBA Industrial Automation GmbH develops industrial automation software, manufacturing products and factory engineering solutions for European companies.',
    )
    const identity = companyIdentityExtraction.extract(result)

    assert.equal(identity.identityStatus, LeadIdentityStatus.VERIFIED)
    assert.equal(identity.companyName, 'KEBA Industrial Automation GmbH')
    assert.equal(identity.confidence, 95)
    assert.ok(
      identity.confidenceReasoning.some((reason) =>
        reason.includes('legal suffix'),
      ),
    )
    assert.ok(
      identity.confidenceReasoning.some((reason) =>
        reason.includes('domain matches'),
      ),
    )
  })

  it('rejects a content fragment that does not match the official domain brand', () => {
    const result = websiteResult(
      'Point Solutions',
      'Point Solutions are part of a broader industrial software page with manufacturing products and engineering services.',
    )
    const identity = companyIdentityExtraction.extract(result)

    assert.notEqual(identity.identityStatus, LeadIdentityStatus.VERIFIED)
    assert.ok(
      identity.reasons.some((reason) =>
        reason.includes('not aligned with the official website domain'),
      ),
    )
  })

  it('accepts a brand only when domain, title, and body corroborate it', () => {
    const result: SearchResult = {
      ...websiteResult('', ''),
      externalId: 'ksb',
      sourceUrl: 'https://www.ksb.com/en/magazine/factory-modernization',
      profileUrl: 'https://www.ksb.com',
      company: null,
      customerName: 'Website source',
      rawContent:
        'KSB factory modernization update. KSB operates production facilities and manufacturing operations across Europe. Our factories use connected production lines to reduce downtime.',
      metadata: {
        title: 'A model for digital transformation at KSB',
      },
    }
    const identity = companyIdentityExtraction.extract(result)

    assert.equal(identity.identityStatus, LeadIdentityStatus.VERIFIED)
    assert.equal(identity.companyName, 'KSB')
    assert.ok(
      identity.confidenceReasoning.some((reason) =>
        reason.includes('domain, page title, and repeated body content'),
      ),
    )
  })

  it('allows only the distinctive company through qualification', () => {
    const context = {
      product: 'industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Company',
    }
    const generic = websiteResult(
      'OEM Manufacturing',
      'OEM Manufacturing provides industrial manufacturing products, automation software and factory engineering services.',
    )
    const valid = websiteResult(
      'KEBA Industrial Automation GmbH',
      'KEBA Industrial Automation GmbH is an industrial manufacturing company providing factory automation products, software and engineering solutions in Europe.',
    )

    const genericEvaluation = searchEvidencePipeline.evaluate(
      generic,
      context,
    )
    const validEvaluation = searchEvidencePipeline.evaluate(valid, context)

    assert.equal(
      searchEvidencePipeline.qualifyResult(generic, genericEvaluation),
      null,
    )
    assert.equal(
      searchEvidencePipeline.qualifyResult(valid, validEvaluation)?.company,
      'KEBA Industrial Automation GmbH',
    )
  })

  it('distinguishes an end-user manufacturer from a software vendor', () => {
    const buyerContext = {
      product: 'industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Buyer',
    }
    const manufacturer = websiteResult(
      'KEBA Industrial Automation GmbH',
      'KEBA Industrial Automation GmbH is a manufacturer of industrial controls. Our factories operate production lines in Europe and we are modernizing our manufacturing operations to reduce downtime.',
    )
    const vendor = websiteResult(
      'KEBA Industrial Automation GmbH',
      'KEBA Industrial Automation GmbH offers our software platform and automation solutions for manufacturers. Book a demo of our solution.',
    )

    assert.equal(
      searchEvidencePipeline.evaluate(manufacturer, buyerContext).relevance
        .passed,
      true,
    )
    assert.equal(
      searchEvidencePipeline.evaluate(vendor, buyerContext).relevance.passed,
      false,
    )
  })
})
