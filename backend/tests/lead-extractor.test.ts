import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CustomerType,
  Industry,
  Platform,
  Region,
} from '@prisma/client'
import type { SearchResult } from '../src/providers/search/search-provider.interface.js'
import { LeadDeduplicationService } from '../src/services/lead-deduplication.service.js'
import { LeadExtractorService } from '../src/services/lead-extractor.service.js'
import { LeadNormalizerService } from '../src/services/lead-normalizer.service.js'

const extractor = new LeadExtractorService()

function createResult(
  overrides: Partial<SearchResult> = {},
): SearchResult {
  return {
    externalId: 'exa-result-001',
    platform: Platform.Reddit,
    sourceUrl: 'https://reddit.com/r/automation/comments/001',
    profileUrl: 'https://reddit.com/u/procurement_user',
    company: null,
    customerName: 'procurement_user',
    country: 'United States',
    region: Region.USA,
    industry: Industry.IndustrialManufacturing,
    rawContent:
      'We are looking for an automation supplier. Fori Automation, Kuka Systems NA, Paslin',
    metadata: {
      title: 'Which automation supplier should we shortlist?',
      username: 'procurement_user',
      originalMarker: 'preserve-me',
    },
    ...overrides,
  }
}

describe('LeadExtractorService', () => {
  it('does not promote companies mentioned in AgentReach content', () => {
    const [lead] = extractor.extractMany([
      createResult({
        company: null,
        rawContent:
          'A discussion comparing Fori Automation, Kuka Systems NA and Paslin.',
        metadata: {
          provider: 'agent-reach',
          title: 'Automation supplier discussion',
        },
      }),
    ])

    assert.equal(lead.company, null)
  })
  it('expands a discussion mentioning multiple companies into candidate leads', () => {
    const candidates = extractor.extract(createResult())

    assert.deepEqual(
      candidates.map((candidate) => candidate.company),
      ['Fori Automation', 'Kuka Systems NA', 'Paslin'],
    )
    assert.ok(candidates.every((candidate) => candidate.customerType === 'Buyer'))
    assert.ok(candidates.every((candidate) => candidate.intentScore >= 55))
  })

  it('does not treat Reddit titles as companies and classifies discussion authors', () => {
    const title = 'Best robot integrators in Michigan'
    const [candidate] = extractor.extract(
      createResult({
        company: title,
        rawContent: 'Sharing observations from several factory visits.',
        metadata: { title },
      }),
    )

    assert.equal(candidate.company, null)
    assert.equal(candidate.customerType, 'Influencer')
  })

  it('classifies an official enterprise video as a company lead', () => {
    const [candidate] = extractor.extract(
      createResult({
        platform: Platform.YouTube,
        company: 'Acme Robotics',
        customerName: 'Acme Robotics Channel',
        sourceUrl: 'https://youtube.com/watch?v=123',
        profileUrl: 'https://youtube.com/@acmerobotics',
        rawContent:
          'Official company product demo from Acme Robotics showing its new factory automation system.',
        metadata: { title: 'New automation system product demo' },
      }),
    )

    assert.equal(candidate.company, 'Acme Robotics')
    assert.equal(candidate.customerType, 'Company')
  })

  it('does not turn video topics into company leads', () => {
    const candidates = extractor.extract(
      createResult({
        platform: Platform.YouTube,
        company: null,
        customerName: 'AM/PM Podcast',
        rawContent:
          'Packaging topics: Branding, Design, E-commerce, Product Perception',
        metadata: {
          title: 'Packaging That Sells',
          author: 'AM/PM Podcast',
        },
      }),
    )

    assert.equal(candidates.length, 1)
    assert.equal(candidates[0]?.company, null)
    assert.equal(candidates[0]?.customerName, 'AM/PM Podcast')
  })

  it('preserves source metadata for normalization and database persistence', () => {
    const [extracted] = extractor.extractMany([createResult()])
    const normalized = new LeadNormalizerService().normalize(
      extracted,
      'agent-reach',
    )
    const metadata = normalized.sourceMetadata as Record<string, unknown>

    assert.equal(metadata.originalMarker, 'preserve-me')
    assert.equal(metadata.extractedCustomerType, 'Buyer')
    assert.ok(Array.isArray(metadata.buyingSignal))
    assert.ok(Array.isArray(metadata.painPoints))
    assert.equal(normalized.customerType, CustomerType.Buyer)
  })

  it('allows multiple company candidates from the same source URL', async () => {
    const extracted = extractor.extractMany([createResult()])
    const sourceUrlLookups: unknown[] = []
    const client = {
      lead: {
        findUnique: async () => null,
        findFirst: async (query: unknown) => {
          sourceUrlLookups.push(query)
          return null
        },
      },
    }
    const deduplication = new LeadDeduplicationService()

    for (const result of extracted) {
      const normalized = new LeadNormalizerService().normalize(
        result,
        'agent-reach',
      )
      await deduplication.findDuplicate(
        {
          userId: 'user-001',
          provider: normalized.provider,
          externalId: normalized.externalId,
          sourceUrl: normalized.sourceUrl,
          sourceMetadata: normalized.sourceMetadata,
        },
        client as never,
      )
    }

    assert.equal(extracted.length, 3)
    assert.equal(sourceUrlLookups.length, 0)
  })
})
