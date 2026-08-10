import assert from 'node:assert/strict'
import test from 'node:test'
import { SourceProvenanceProvider } from '../src/providers/source/social-source.provider.js'

const provider = new SourceProvenanceProvider()

test('classifies supported social sources without treating a user account as company fact', () => {
  const provenance = provider.describe({
    sourceUrl: 'https://www.linkedin.com/posts/example',
    platform: 'LinkedIn',
    metadata: {},
  })

  assert.equal(provenance.sourceCategory, 'SOCIAL')
  assert.equal(provenance.sourcePlatform, 'LINKEDIN')
  assert.equal(provenance.sourceTier, 'TIER_3')
  assert.equal(provenance.publisherVerification, 'UNVERIFIED')
  assert.equal(provenance.corroborationRequired, true)
})

test('preserves an explicit verified official-account flag without inferring relationships', () => {
  const provenance = provider.describe({
    sourceUrl: 'https://x.com/example/status/1',
    platform: 'X',
    metadata: { publisherVerification: 'VERIFIED' },
  })

  assert.equal(provenance.publisherVerification, 'VERIFIED')
  assert.ok(provenance.reasonCodes.includes('EXPLICIT_PUBLISHER_VERIFICATION'))
  assert.equal(provenance.corroborationRequired, true)
})

test('keeps an ordinary web source unknown instead of guessing its publisher role', () => {
  const provenance = provider.describe({
    sourceUrl: 'https://factory-example.com/news',
    platform: 'Website',
    metadata: {},
  })

  assert.equal(provenance.sourceCategory, 'WEB')
  assert.equal(provenance.sourceTier, 'UNKNOWN')
  assert.equal(provenance.publisherVerification, 'UNVERIFIED')
})
