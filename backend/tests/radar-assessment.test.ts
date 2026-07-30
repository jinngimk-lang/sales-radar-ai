import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { RadarAssessmentService } from '../src/services/radar-assessment.service.js'

const service = new RadarAssessmentService()

describe('Radar Intelligence Layer Phase 2B', () => {
  it('retains a supplier as a market signal in a buyer search', () => {
    const assessment = service.assess({
      evidence: supplierEvidence('supplier-for-buyers'),
      userIntentSnapshot: intent('FIND_BUYERS'),
    })

    assert.equal(assessment.entityRole, 'SUPPLIER')
    assert.equal(assessment.customerGoal, 'FIND_BUYERS')
    assert.equal(assessment.decision, 'MARKET_SIGNAL_ONLY')
    assert.equal(assessment.recommendedAction, 'VERIFY_ROLE')
    assert.equal(assessment.scoreBreakdown.match.entityRoleFit, 0)
    assert.ok(assessment.confidenceScore >= 60)
  })

  it('retains an end customer as a market signal in a supplier search', () => {
    const assessment = service.assess({
      evidence: endCustomerEvidence('buyer-for-suppliers'),
      userIntentSnapshot: intent('FIND_SUPPLIERS'),
    })

    assert.equal(assessment.entityRole, 'END_CUSTOMER')
    assert.equal(assessment.customerGoal, 'FIND_SUPPLIERS')
    assert.equal(assessment.decision, 'MARKET_SIGNAL_ONLY')
    assert.equal(assessment.scoreBreakdown.match.entityRoleFit, 0)
    assert.ok(assessment.reasonCodes.includes('USER_INTENT_MISMATCH'))
  })

  it('classifies a sourced end-customer expansion as opportunity-eligible', () => {
    const assessment = service.assess({
      evidence: endCustomerEvidence('end-customer-expansion'),
      userIntentSnapshot: intent('FIND_BUYERS'),
    })

    assert.equal(assessment.entityRole, 'END_CUSTOMER')
    assert.equal(assessment.decision, 'OPPORTUNITY_CREATED')
    assert.equal(assessment.recommendedAction, 'CONTACT_RESEARCH')
    assert.equal(assessment.scoreBreakdown.match.entityRoleFit, 30)
    assert.notEqual(assessment.riskLevel, 'HIGH')
  })

  it('does not turn a title-only event into an opportunity', () => {
    const assessment = service.assess({
      evidence: {
        ...endCustomerEvidence('title-only-event'),
        title: 'Acme Foods announces a new factory expansion',
        content:
          'Acme Foods publishes a general company profile covering its products, history, leadership, and existing manufacturing operations. The page contains no announcement of a new project or business change.',
      },
      userIntentSnapshot: intent('FIND_BUYERS'),
    })

    assert.equal(assessment.decision, 'NEEDS_REVIEW')
    assert.equal(assessment.recommendedAction, 'REVIEW_SOURCE')
    assert.ok(assessment.reasonCodes.includes('TITLE_ONLY_EVENT_BLOCKED'))
    assert.equal(assessment.scoreBreakdown.confidence.eventSignal, 0)
  })

  it('keeps an event with unknown company identity as potential only', () => {
    const evidence = endCustomerEvidence('unknown-entity')
    evidence.companyName = null
    evidence.identityConfidence = 0
    evidence.identityStatus = 'UNVERIFIED'

    const assessment = service.assess({
      evidence,
      userIntentSnapshot: intent('FIND_BUYERS'),
    })

    assert.equal(assessment.decision, 'POTENTIAL_OPPORTUNITY')
    assert.equal(assessment.recommendedAction, 'VERIFY_ENTITY')
    assert.equal(assessment.riskLevel, 'HIGH')
    assert.ok(
      assessment.reasonCodes.includes('ENTITY_VERIFICATION_REQUIRED'),
    )
  })

  it('keeps Packaging Machinery as a product family, not a customer industry', () => {
    const assessment = service.assess({
      evidence: {
        ...endCustomerEvidence('packaging-family'),
        content:
          'Acme Foods is a food manufacturing company. Our factory expands a packaging line for food production and adds packaging automation to the manufacturing site. The official announcement describes the construction timeline.',
      },
      userIntentSnapshot: {
        ...intent('FIND_BUYERS'),
        productContext: {
          product: 'Packaging Machinery',
          industry: 'Food Manufacturing',
          customerType: 'Buyer companies',
          buyingSignals: ['factory expansion'],
        },
      },
    })

    assert.equal(assessment.decision, 'OPPORTUNITY_CREATED')
    assert.ok(
      assessment.reasonCodes.includes('PRODUCT_FAMILY_MATCH'),
    )
    assert.ok(
      assessment.reasonCodes.includes('TARGET_INDUSTRY_MATCH'),
    )
    assert.ok(assessment.scoreBreakdown.match.productRelevance > 0)
  })

  it('supports partner searches without presenting suppliers as buyers', () => {
    const assessment = service.assess({
      evidence: {
        ...endCustomerEvidence('partner-search'),
        rawMetadata: {
          entityRole: 'partner',
          publishedAt: '2026-07-30',
        },
        content:
          'Acme Integration is a verified system integrator and technology partner. The company opens a new plant in Europe and expands a manufacturing site for industrial automation integration projects.',
      },
      userIntentSnapshot: intent('FIND_PARTNERS'),
    })

    assert.equal(assessment.entityRole, 'PARTNER')
    assert.equal(assessment.customerGoal, 'FIND_PARTNERS')
    assert.equal(assessment.scoreBreakdown.match.entityRoleFit, 30)
    assert.equal(assessment.decision, 'OPPORTUNITY_CREATED')
  })

  it('preserves entity role when the search goal is unknown', () => {
    const assessment = service.assess({
      evidence: supplierEvidence('unknown-goal'),
      userIntentSnapshot: intent('UNKNOWN'),
    })

    assert.equal(assessment.entityRole, 'SUPPLIER')
    assert.equal(assessment.customerGoal, 'UNKNOWN')
    assert.ok(assessment.scoreBreakdown.match.entityRoleFit > 0)
    assert.notEqual(assessment.decision, 'BLOCKED')
  })
})

function intent(customerGoal: string) {
  return {
    version: 'test-v1',
    customerGoal,
    productContext: {
      product: 'Packaging Automation',
      industry: 'Food Manufacturing',
      buyingSignals: ['factory expansion', 'automation upgrade'],
    },
  }
}

function supplierEvidence(id: string) {
  return {
    id,
    provider: 'agent-reach',
    rawUrl: `https://packaging-supplier.example.com/news/${id}`,
    title: 'Packaging supplier expands its manufacturing site',
    content:
      'Acme Packaging Systems is a manufacturer and supplier of packaging machinery. We design and supply packaging automation equipment. The company expands its manufacturing site and opens a new production line for packaging systems.',
    rawMetadata: {
      entityRole: 'supplier',
      publishedAt: '2026-07-30',
    },
    companyName: 'Acme Packaging Systems',
    identityConfidence: 92,
    identityStatus: 'VERIFIED',
    evidenceStatus: 'VALID',
  }
}

function endCustomerEvidence(id: string) {
  return {
    id,
    provider: 'agent-reach',
    rawUrl: `https://acme-foods.example.com/news/${id}`,
    title: 'Acme Foods expands its European factory',
    content:
      'Acme Foods is a food manufacturer. Our factory expands a packaging production line in Europe and adds automation equipment. The official announcement includes a construction timeline and increased production capacity.',
    rawMetadata: {
      entityRole: 'end_customer',
      publishedAt: '2026-07-30',
      region: 'Europe',
    },
    companyName: 'Acme Foods',
    identityConfidence: 94,
    identityStatus: 'VERIFIED',
    evidenceStatus: 'VALID',
  }
}
