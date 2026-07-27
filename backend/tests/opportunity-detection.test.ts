import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OpportunityType } from '@prisma/client'
import {
  OpportunityDetectionService,
} from '../src/services/opportunity-detection.service.js'

const detector = new OpportunityDetectionService()

function input(
  overrides: Partial<Parameters<typeof detector.detect>[0]> = {},
) {
  return {
    provider: 'agent-reach',
    sourceUrl: 'https://example-news.eu/company-event',
    title: 'Intel announces European manufacturing investment',
    content:
      'Intel announced a EUR 5 billion investment to expand a European manufacturing site. The project includes additional production capacity and new manufacturing infrastructure in Europe.',
    rawMetadata: { region: 'Europe' },
    explicitCompanyName: 'Intel',
    productContext: {
      product: 'industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      buyingSignals: ['factory expansion'],
    },
    ...overrides,
  }
}

describe('Opportunity Detection MVP v1', () => {
  it('detects an explicit company investment', () => {
    const result = detector.detect(input())
    assert.equal(result?.type, OpportunityType.INVESTMENT)
    assert.equal(result?.companyName, 'Intel')
    assert.match(result?.whyItMatters ?? '', /not confirmation of procurement/i)
  })

  it('detects a factory expansion without treating it as procurement', () => {
    const result = detector.detect(
      input({
        title: 'Acme Manufacturing expands its factory in Germany',
        content:
          'Acme Manufacturing expands its factory in Germany with a new production line and increased production capacity. The announcement describes the construction timeline and manufacturing site.',
        explicitCompanyName: 'Acme Manufacturing',
      }),
    )
    assert.equal(result?.type, OpportunityType.COMPANY_EXPANSION)
  })

  it('detects a factory digital upgrade', () => {
    const result = detector.detect(
      input({
        title: 'KSB launches smart factory digital upgrade',
        content:
          'KSB launched a smart factory digital transformation program across its European production operations. The program covers production monitoring, industrial IoT and manufacturing execution systems.',
        explicitCompanyName: 'KSB',
        productContext: {
          product: 'industrial automation SaaS',
          industry: 'Industrial Manufacturing',
          region: 'Europe',
          buyingSignals: ['technology upgrade'],
        },
      }),
    )
    assert.equal(result?.type, OpportunityType.DIGITAL_UPGRADE)
  })

  it('does not create opportunities from ordinary company descriptions', () => {
    assert.equal(
      detector.detect(
        input({
          title: 'Industrial software for manufacturers',
          content:
            'This company provides software products and consulting services for manufacturers across Europe. The page explains features, services, integrations and customer support.',
        }),
      ),
      null,
    )
  })

  it('does not create mock opportunities', () => {
    assert.equal(detector.detect(input({ provider: 'mock' })), null)
  })

  it('requires Product Context', () => {
    assert.equal(detector.detect(input({ productContext: undefined })), null)
  })
})
