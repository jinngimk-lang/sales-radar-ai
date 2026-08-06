import assert from 'node:assert/strict'
import test from 'node:test'
import { DirectSearchContactEnrichmentService } from '../src/services/direct-search-contact-enrichment.service.js'

test('explicit direct-contact search enriches every unique lead with bounded concurrency and counts only observed contacts', async () => {
  const called: string[] = []
  const service = new DirectSearchContactEnrichmentService({
    concurrency: 2,
    discover: async (leadId) => {
      called.push(leadId)
      return leadId === 'lead-2'
        ? [{ name: 'Unknown', email: 'Unknown', phone: 'Unknown', profileUrl: 'Unknown' }]
        : [{ name: 'Alice', email: 'alice@example.com', phone: 'Unknown', profileUrl: 'https://linkedin.com/in/alice' }]
    },
  })

  const result = await service.enrich(['lead-1', 'lead-2', 'lead-1'], true)

  assert.deepEqual(called.sort(), ['lead-1', 'lead-2'])
  assert.equal(result.attemptedLeadCount, 2)
  assert.equal(result.enrichedLeadCount, 1)
  assert.equal(result.observedContactCount, 1)
})

test('contact enrichment stays off unless the user explicitly selected global contact search', async () => {
  let called = false
  const service = new DirectSearchContactEnrichmentService({
    discover: async () => {
      called = true
      return []
    },
  })

  const result = await service.enrich(['lead-1'], false)
  assert.equal(called, false)
  assert.equal(result.attemptedLeadCount, 0)
})
