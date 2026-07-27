import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CustomerType, Industry, Platform, Region } from '@prisma/client'
import type { SearchResult } from '../src/providers/search/search-provider.interface.js'
import { LeadNormalizerService } from '../src/services/lead-normalizer.service.js'

const normalizer = new LeadNormalizerService()

function createResult(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    externalId: 'external-001',
    platform: Platform.LinkedIn,
    sourceUrl: 'https://example.com/posts/001',
    profileUrl: 'https://example.com/profiles/001',
    company: 'Acme Manufacturing',
    customerName: 'Jane Smith',
    country: 'United States',
    region: Region.USA,
    industry: Industry.IndustrialManufacturing,
    rawContent: 'Looking for a reliable automation supplier.',
    metadata: {
      username: 'jane_smith',
      customerType: CustomerType.Company,
      jobTitle: 'Procurement Manager',
      postedAt: '2026-07-24T00:00:00.000Z',
      interestTags: ['automation', 'supplier'],
      initialIntentScore: 86,
      companyDomain: 'https://www.acme.example/about',
    },
    ...overrides,
  }
}

describe('LeadNormalizerService', () => {
  it('converts provider fields into a normalized Lead', () => {
    const lead = normalizer.normalize(createResult(), 'mock')

    assert.equal(lead.provider, 'mock')
    assert.equal(lead.externalId, 'external-001')
    assert.equal(lead.username, 'jane_smith')
    assert.equal(lead.displayName, 'Jane Smith')
    assert.equal(lead.initials, 'JS')
    assert.equal(lead.customerType, CustomerType.Company)
    assert.equal(lead.postContent, 'Looking for a reliable automation supplier.')
    assert.ok(lead.intentScore >= 70)
    assert.deepEqual(lead.interestTags, ['automation', 'supplier'])
    assert.equal(
      (lead.sourceMetadata as { companyDomain?: string }).companyDomain,
      'acme.example',
    )
  })

  it('clamps invalid score ranges and defaults non-numeric scores', () => {
    const tooHigh = normalizer.normalize(
      createResult({
        rawContent: '',
        metadata: { initialIntentScore: 500 },
      }),
    )
    const nonNumeric = normalizer.normalize(
      createResult({
        rawContent: '',
        metadata: { initialIntentScore: 'high' },
      }),
    )

    assert.equal(tooHigh.intentScore, 100)
    assert.equal(nonNumeric.intentScore, 50)
  })

  it('uses safe defaults when optional metadata is missing', () => {
    const lead = normalizer.normalize(
      createResult({
        externalId: 'fallback-user',
        customerName: '',
        company: null,
        metadata: {},
      }),
      'browser',
    )

    assert.equal(lead.provider, 'browser')
    assert.equal(lead.username, 'fallback-user')
    assert.equal(lead.displayName, 'Unknown')
    assert.equal(lead.initials, 'U')
    assert.equal(lead.customerType, CustomerType.Buyer)
    assert.equal(lead.postedAt, null)
    assert.equal(lead.company, undefined)
    assert.deepEqual(lead.interestTags, [])
    assert.ok(lead.intentScore >= 35)
  })

  it('prefers real AgentReach contact fields over mock-style fallbacks', () => {
    const lead = normalizer.normalize(
      createResult({
        platform: Platform.Reddit,
        sourceUrl: 'https://www.reddit.com/r/PLC/comments/real-lead',
        profileUrl: 'https://www.reddit.com/user/alex_engineer',
        customerName: 'Reddit discussion',
        company: 'Fori Automation',
        country: 'United States',
        metadata: {
          username: 'buyer_industrial_automation_1',
          publishedAt: '2026-07-23T12:00:00.000Z',
          companyWebsite: 'https://www.foriautomation.com',
          originalMetadata: {
            author: 'alex_engineer',
            jobTitle: 'Controls Engineer',
            country: 'United States',
            buyingNeed: 'Seeking an automation integrator',
          },
        },
      }),
      'agent-reach',
    )

    assert.equal(lead.username, 'alex_engineer')
    assert.equal(lead.displayName, 'alex_engineer')
    assert.equal(lead.jobTitle, 'Controls Engineer')
    assert.equal(lead.company, 'Fori Automation')
    assert.equal(lead.country, 'United States')
    assert.doesNotMatch(lead.username, /^(?:buyer|mock)[_-]/i)
    assert.equal(
      (
        lead.sourceMetadata as {
          companyWebsite?: string
        }
      ).companyWebsite,
      'https://www.foriautomation.com',
    )
  })

  it('classifies content without promoting titles or synthetic identities', () => {
    const lead = normalizer.normalize(
      createResult({
        externalId: '9a2c4f38d1e6479f909b64b3db604233',
        platform: Platform.YouTube,
        sourceUrl: 'https://youtube.com/watch?v=video',
        profileUrl: 'https://youtube.com/@automation',
        customerName: 'buyer_automation_001',
        company: 'Top Automation Suppliers in 2026',
        metadata: {
          provider: 'agent-reach',
          title: 'Top Automation Suppliers in 2026',
        },
      }),
      'agent-reach',
    )

    const metadata = lead.sourceMetadata as {
      leadType?: string
      companyName?: string | null
      sourcePlatform?: string
    }
    assert.equal(lead.username, 'Unknown')
    assert.equal(lead.displayName, 'Unknown')
    assert.equal(lead.company, undefined)
    assert.equal(metadata.leadType, 'content')
    assert.equal(metadata.companyName, null)
    assert.equal(metadata.sourcePlatform, Platform.YouTube)
  })
})
