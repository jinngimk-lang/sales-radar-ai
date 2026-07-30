import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OpportunityType } from '@prisma/client'
import { OPPORTUNITY_REASON_UI_TEXT } from '../src/contracts/opportunity.contract.js'
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

describe('Opportunity Detection scoring v2', () => {
  it('detects an explicit company investment', () => {
    const result = detector.detect(input())
    assert.equal(result?.type, OpportunityType.INVESTMENT)
    assert.equal(result?.companyName, 'Intel')
    assert.match(result?.whyItMatters ?? '', /not confirmation of procurement/i)
    assert.equal(result?.scoreBreakdown.evidenceQuality <= 20, true)
    assert.equal(result?.scoreBreakdown.eventSignal <= 30, true)
    assert.equal(result?.scoreBreakdown.productRelevance <= 20, true)
    assert.equal(result?.scoreBreakdown.identityConfidence <= 10, true)
    assert.equal(result?.scoreBreakdown.roleFit <= 20, true)
    assert.equal(
      Object.values(result?.scoreBreakdown ?? {}).reduce(
        (total, value) => total + value,
        0,
      ),
      result?.confidence,
    )
    assert.equal(result?.reasons.includes('BODY_EVENT_CONFIRMED'), true)
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

  it('does not create an opportunity from a title-only event', () => {
    const assessment = detector.assess(
      input({
        title: 'Acme announces a new factory expansion',
        content:
          'Acme provides packaging automation information for industrial companies. This page describes products, services, technical support, applications and general company capabilities.',
        productContext: {
          product: 'Packaging Automation',
          customerType: 'Buyer companies',
        },
      }),
    )

    assert.equal(assessment.passed, false)
    assert.equal(assessment.reasons.includes('BODY_EVENT_MISSING'), true)
  })

  it('blocks a packaging supplier from being presented as a buyer opportunity', () => {
    const assessment = detector.assess(
      input({
        title: 'Acme Packaging expands manufacturing capacity',
        content:
          'Acme Packaging is a packaging machine manufacturer and supplier. We manufacture packaging machinery and announced an expansion of our factory production capacity with a new production line.',
        explicitCompanyName: 'Acme Packaging',
        productContext: {
          product: 'Packaging Automation',
          industry: 'Packaging Machinery',
          customerType: 'Buyer companies',
          buyingSignals: ['factory expansion'],
        },
      }),
    )

    assert.equal(assessment.passed, false)
    assert.equal(assessment.entityRole, 'SUPPLIER')
    assert.equal(assessment.customerGoal, 'BUYER')
    assert.equal(assessment.scoreBreakdown.roleFit, 0)
    assert.equal(assessment.reasons.includes('SUPPLIER_PAGE_BLOCKED'), true)
  })

  it('accepts the same verified supplier role when the user seeks suppliers', () => {
    const assessment = detector.assess(
      input({
        title: 'Acme Packaging expands manufacturing capacity',
        content:
          'Acme Packaging is a packaging machine manufacturer and supplier. We manufacture packaging machinery and announced an expansion of our factory production capacity with a new production line.',
        explicitCompanyName: 'Acme Packaging',
        productContext: {
          product: 'Packaging Automation',
          industry: 'Packaging Machinery',
          customerType: 'Suppliers',
          buyingSignals: ['factory expansion'],
        },
      }),
    )

    assert.equal(assessment.passed, true)
    assert.equal(assessment.entityRole, 'SUPPLIER')
    assert.equal(assessment.customerGoal, 'SUPPLIER')
    assert.equal(assessment.scoreBreakdown.roleFit, 20)
    assert.equal(assessment.reasons.includes('TARGET_ROLE_MATCH'), true)
  })

  it('retains a supplier role instead of discarding it when the target is unknown', () => {
    const assessment = detector.assess(
      input({
        title: 'Acme Packaging expands manufacturing capacity',
        content:
          'Acme Packaging is a packaging machine manufacturer and supplier. We manufacture packaging machinery and announced an expansion of our factory production capacity with a new production line.',
        explicitCompanyName: 'Acme Packaging',
        productContext: {
          product: 'Packaging Automation',
          industry: 'Packaging Machinery',
          buyingSignals: ['factory expansion'],
        },
      }),
    )

    assert.equal(assessment.passed, true)
    assert.equal(assessment.entityRole, 'SUPPLIER')
    assert.equal(assessment.customerGoal, 'UNKNOWN')
    assert.equal(assessment.reasons.includes('TARGET_ROLE_UNKNOWN'), true)
  })

  it('gives the highest role fit to an end customer for a buyer goal', () => {
    const assessment = detector.assess(
      input({
        title: 'Fresh Foods expands its packaging operations',
        content:
          'Fresh Foods is a food manufacturer. Our factory expands production capacity with a new packaging line for packaged foods, and the project includes additional manufacturing operations.',
        explicitCompanyName: 'Fresh Foods',
        productContext: {
          product: 'Packaging Automation',
          industry: 'Food Manufacturing',
          customerType: 'End-user companies',
          buyingSignals: ['factory expansion'],
        },
      }),
    )

    assert.equal(assessment.passed, true)
    assert.equal(assessment.entityRole, 'END_CUSTOMER')
    assert.equal(assessment.customerGoal, 'BUYER')
    assert.equal(assessment.scoreBreakdown.roleFit, 20)
  })

  it('does not infer a company from the title or domain prefix', () => {
    const result = detector.detect(
      input({
        sourceUrl: 'https://acme.example/news',
        title: 'Acme expands its factory',
        content:
          'The source reports an expansion of a manufacturing site and a new production line in Europe. The project increases production capacity and includes an implementation timeline.',
        explicitCompanyName: null,
      }),
    )

    assert.equal(result?.companyName, null)
    assert.equal(result?.reasons.includes('IDENTITY_NEEDS_REVIEW'), true)
  })

  it('provides stable machine reason codes with future UI explanations', () => {
    assert.equal(
      OPPORTUNITY_REASON_UI_TEXT.NEW_FACTORY_SIGNAL,
      '发现新工厂建设信号',
    )
    assert.equal(
      OPPORTUNITY_REASON_UI_TEXT.AUTOMATION_UPGRADE_SIGNAL,
      '发现自动化升级信号',
    )
    assert.equal(
      OPPORTUNITY_REASON_UI_TEXT.SUPPLIER_PAGE_BLOCKED,
      '供应商页面，不作为买家机会',
    )
  })
})
