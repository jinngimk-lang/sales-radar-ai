import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  Industry,
  LeadEvidenceStatus,
  LeadIdentityStatus,
  LeadQualificationStatus,
  Platform,
  Region,
} from '@prisma/client'
import type { SearchResult } from '../src/providers/search/search-provider.interface.js'
import { searchEvidencePipeline } from '../src/services/search-evidence-pipeline.service.js'

function companyResult(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    externalId: 'official-company-result',
    platform: Platform.Website,
    sourceUrl: 'https://acme-automation.de/about',
    profileUrl: 'https://acme-automation.de',
    company: 'Acme Automation GmbH',
    customerName: 'Acme Automation GmbH',
    country: 'Germany',
    region: Region.Europe,
    industry: Industry.IndustrialManufacturing,
    rawContent:
      'Acme Automation GmbH is an industrial manufacturing company. We provide factory automation software, production technology, engineering services and solutions for European manufacturers.',
    metadata: {
      title: 'Industrial automation solutions',
      companyDomain: 'acme-automation.de',
      companyWebsite: 'https://acme-automation.de',
      customerType: 'Company',
    },
    ...overrides,
  }
}

const matchingContext = {
  product: 'Industrial automation SaaS',
  industry: 'Industrial Manufacturing',
  region: 'Europe',
  customerType: 'Company',
}

describe('SearchEvidence qualification pipeline', () => {
  it('keeps YouTube content as evidence and does not create a Lead candidate', () => {
    const result = companyResult({
      platform: Platform.YouTube,
      sourceUrl: 'https://www.youtube.com/watch?v=evidence',
      profileUrl: 'https://www.youtube.com/watch?v=evidence',
    })
    const evaluation = searchEvidencePipeline.evaluate(
      result,
      matchingContext,
    )

    assert.equal(evaluation.evidence.status, LeadEvidenceStatus.INVALID)
    assert.equal(evaluation.gate.passed, false)
    assert.equal(
      searchEvidencePipeline.qualifyResult(result, evaluation),
      null,
    )
  })

  it('does not qualify a company when its domain cannot be verified', () => {
    const result = companyResult({
      sourceUrl: 'https://bit.ly/acme',
      profileUrl: 'https://bit.ly/acme',
      metadata: {
        companyName: 'Acme Automation GmbH',
      },
    })
    const evaluation = searchEvidencePipeline.evaluate(
      result,
      matchingContext,
    )

    assert.notEqual(
      evaluation.identity.identityStatus,
      LeadIdentityStatus.VERIFIED,
    )
    assert.equal(evaluation.identity.normalizedDomain, null)
    assert.equal(evaluation.gate.passed, false)
  })

  it('qualifies valid official company evidence', () => {
    const result = companyResult()
    const evaluation = searchEvidencePipeline.evaluate(
      result,
      matchingContext,
    )
    const qualified = searchEvidencePipeline.qualifyResult(
      result,
      evaluation,
    )

    assert.equal(
      evaluation.identity.identityStatus,
      LeadIdentityStatus.VERIFIED,
    )
    assert.equal(evaluation.evidence.status, LeadEvidenceStatus.VALID)
    assert.equal(evaluation.relevance.passed, true)
    assert.equal(
      evaluation.gate.qualificationStatus,
      LeadQualificationStatus.QUALIFIED,
    )
    assert.equal(qualified?.company, 'Acme Automation GmbH')
    assert.equal(qualified?.metadata.companyDomain, 'acme-automation.de')
  })

  it('uses ProductContext as a mandatory qualification condition', () => {
    const result = companyResult()
    const evaluation = searchEvidencePipeline.evaluate(result, {
      ...matchingContext,
      industry: 'Beauty Industry',
      region: 'USA',
    })

    assert.equal(evaluation.relevance.passed, false)
    assert.equal(evaluation.gate.passed, false)
    assert.equal(
      evaluation.gate.qualificationStatus,
      LeadQualificationStatus.REJECTED,
    )
  })

  it('never qualifies evidence without ProductContext', () => {
    const result = companyResult()
    const evaluation = searchEvidencePipeline.evaluate(result, undefined)

    assert.equal(evaluation.relevance.passed, false)
    assert.equal(evaluation.gate.passed, false)
  })
})
