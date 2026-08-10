import assert from 'node:assert/strict'
import test from 'node:test'
import { EvidenceRankingService } from '../src/services/evidence-ranking.service.js'

const service = new EvidenceRankingService()
const now = new Date('2026-08-10T00:00:00.000Z')

test('ranks an explicit official company source without inferring business facts', () => {
  const result = service.rank({
    sourceUrl: 'https://example.com/news/factory-expansion',
    provider: 'agent-reach',
    rawMetadata: {
      sourceType: 'company_website',
      publishedAt: '2026-08-01T00:00:00.000Z',
    },
    capturedAt: new Date('2026-08-02T00:00:00.000Z'),
    identityStatus: 'VERIFIED',
    evidenceStatus: 'VALID',
    now,
  })

  assert.equal(result.sourceTier, 'TIER_1')
  assert.equal(result.sourceType, 'COMPANY_WEBSITE')
  assert.equal(result.freshnessStatus, 'FRESH')
  assert.equal(result.publishedAt, '2026-08-01T00:00:00.000Z')
  assert.ok(result.qualityScore >= 80)
  assert.ok(result.reasons.includes('EXPLICIT_FIRST_PARTY_SOURCE'))
})

test('treats a social source as tier 3 and requires corroboration', () => {
  const result = service.rank({
    sourceUrl: 'https://www.reddit.com/r/manufacturing/comments/example',
    provider: 'agent-reach',
    platform: 'REDDIT',
    rawMetadata: {},
    capturedAt: now,
    identityStatus: 'NEEDS_REVIEW',
    evidenceStatus: 'VALID',
    now,
  })

  assert.equal(result.sourceTier, 'TIER_3')
  assert.equal(result.sourceType, 'SOCIAL')
  assert.equal(result.freshnessStatus, 'UNKNOWN')
  assert.equal(result.corroborationRequired, true)
  assert.ok(result.reasons.includes('SOCIAL_SOURCE_REQUIRES_CORROBORATION'))
})

test('does not guess a first-party source or publication time from an ordinary domain', () => {
  const result = service.rank({
    sourceUrl: 'https://automation-technology.example/article',
    provider: 'agent-reach',
    rawMetadata: {},
    capturedAt: now,
    identityStatus: 'UNKNOWN',
    evidenceStatus: 'VALID',
    now,
  })

  assert.equal(result.sourceTier, 'UNKNOWN')
  assert.equal(result.sourceType, 'WEB')
  assert.equal(result.publishedAt, null)
  assert.equal(result.freshnessStatus, 'UNKNOWN')
  assert.ok(result.reasons.includes('SOURCE_TIER_NEEDS_REVIEW'))
})

test('rejects future metadata dates instead of presenting them as fresh evidence', () => {
  const result = service.rank({
    sourceUrl: 'https://example.gov/announcement',
    provider: 'agent-reach',
    rawMetadata: { publishedAt: '2026-09-01T00:00:00.000Z' },
    capturedAt: now,
    identityStatus: 'VERIFIED',
    evidenceStatus: 'VALID',
    now,
  })

  assert.equal(result.publishedAt, null)
  assert.equal(result.freshnessStatus, 'UNKNOWN')
  assert.ok(result.reasons.includes('PUBLICATION_DATE_INVALID'))
})
