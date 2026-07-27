import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CustomerType,
  Industry,
  Platform,
  type Prisma,
} from '@prisma/client'
import {
  LeadResearchService,
  type ResearchableLead,
} from '../src/services/lead-research.service.js'

function companyLead(
  overrides: Partial<ResearchableLead> = {},
): ResearchableLead {
  return {
    id: 'lead-1',
    company: 'Nosco',
    industry: Industry.IndustrialManufacturing,
    customerType: CustomerType.Company,
    jobTitle: null,
    platform: Platform.YouTube,
    sourceUrl: 'https://youtube.com/watch?v=case',
    country: 'United States',
    postContent:
      'Customer case: the packaging line needs an automation upgrade to reduce downtime.',
    sourceMetadata: {
      leadType: 'company',
      website: 'https://nosco.com',
      buyingIntent: ['Upgrade or new project'],
      painPoints: ['Reliability and downtime'],
    } as Prisma.JsonValue,
    ...overrides,
  }
}

describe('LeadResearchService', () => {
  it('researches a real company Lead from verified evidence', () => {
    const result = new LeadResearchService().analyze(companyLead())

    assert.match(result.companySummary, /Nosco/)
    assert.equal(result.companyType, 'Company')
    assert.deepEqual(result.painPoints, ['Reliability and downtime'])
    assert.deepEqual(result.buyingSignals, ['Upgrade or new project'])
    assert.doesNotMatch(result.companySummary, /employees|revenue|company size/i)
    assert.ok(result.confidenceScore >= 70)
  })

  it('returns Unknown instead of inventing missing fields', () => {
    const result = new LeadResearchService().analyze(
      companyLead({
        company: null,
        jobTitle: null,
        postContent: '',
        sourceMetadata: null,
      }),
    )

    assert.equal(result.companySummary, 'Unknown')
    assert.equal(result.companyType, 'Unknown')
    assert.equal(result.customerPersona, 'Unknown')
    assert.equal(result.communicationStyle, 'Unknown')
    assert.deepEqual(result.buyingSignals, [])
  })

  it('uses a safe fallback when the Lead has no original content', () => {
    const result = new LeadResearchService().analyze(
      companyLead({ postContent: '' }),
    )

    assert.equal(result.communicationStyle, 'Unknown')
    assert.match(result.recommendedApproach, /Confirm/)
    assert.equal(result.companySummary.includes('Nosco'), true)
  })

  it('does not generate research twice for repeated clicks', async () => {
    const stored = {
      id: 'research-1',
      leadId: 'lead-1',
      ...new LeadResearchService().analyze(companyLead()),
    }
    let created: typeof stored | null = null
    let createCount = 0
    const service = new LeadResearchService({
      async findLead() {
        return companyLead()
      },
      async findResearch() {
        return created
      },
      async createResearch() {
        createCount += 1
        created = stored
        return stored
      },
      async updateResearch() {
        created = stored
        return stored
      },
    })

    const first = await service.research('lead-1')
    const second = await service.research('lead-1')

    assert.equal(createCount, 1)
    assert.equal(first, second)
  })

  it('marks a verified procurement buyer as high value', () => {
    const result = new LeadResearchService().analyze(
      companyLead({
        platform: Platform.LinkedIn,
        jobTitle: 'Procurement Manager',
        postContent:
          'We are looking for a supplier and issuing an RFQ for packaging equipment.',
        sourceMetadata: {
          leadType: 'person',
          website: 'https://buyer.example',
          email: 'procurement@buyer.example',
        } as Prisma.JsonValue,
      }),
    )

    assert.equal(result.leadCategory, 'buyer')
    assert.equal(result.leadQuality, 'high')
    assert.equal(result.salesRecommendation, 'contact_now')
    assert.equal(result.priority, 'A')
    assert.ok(result.buyingSignalDetails.length >= 1)
    assert.notEqual(result.outreachPlan.emailSubject, 'Unknown')
    assert.match(result.outreachPlan.linkedinMessage, /verified|noticed/i)
    assert.match(result.qualityReason, /procurement signal/)
  })

  it('does not treat a YouTube tutorial as a customer', () => {
    const result = new LeadResearchService().analyze(
      companyLead({
        company: null,
        platform: Platform.YouTube,
        jobTitle: null,
        postContent:
          'Beginner tutorial and industry opinion explaining packaging automation.',
        sourceMetadata: { leadType: 'content' } as Prisma.JsonValue,
      }),
    )

    assert.equal(result.leadCategory, 'content')
    assert.equal(result.leadQuality, 'low')
    assert.equal(result.salesRecommendation, 'ignore')
    assert.equal(result.priority, 'C')
    assert.match(result.qualityReason, /no explicit buying requirement/)
  })

  it('keeps a Reddit discussion as a C-priority community lead', () => {
    const result = new LeadResearchService().analyze(
      companyLead({
        company: null,
        platform: Platform.Reddit,
        jobTitle: null,
        postContent: 'General discussion about automation industry trends.',
        sourceMetadata: { leadType: 'community' } as Prisma.JsonValue,
      }),
    )

    assert.equal(result.leadCategory, 'community')
    assert.equal(result.priority, 'C')
    assert.equal(result.salesRecommendation, 'ignore')
  })

  it('treats an enterprise website without buying evidence as B priority', () => {
    const result = new LeadResearchService().analyze(
      companyLead({
        platform: Platform.LinkedIn,
        postContent:
          'Nosco manufactures printed packaging products for regulated industries.',
        sourceMetadata: {
          leadType: 'company',
          website: 'https://nosco.com',
        } as Prisma.JsonValue,
      }),
    )

    assert.equal(result.priority, 'B')
    assert.equal(result.companyProfile.businessModel, 'Unknown')
    assert.deepEqual(result.buyingSignalDetails, [])
    assert.doesNotMatch(
      JSON.stringify(result.companyProfile),
      /employees|revenue|budget/i,
    )
  })
})
