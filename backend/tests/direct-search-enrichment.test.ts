import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  DirectSearchContactEnrichmentService,
  scheduleSearchTaskContactEnrichment,
} from '../src/services/direct-search-contact-enrichment.service.js'

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

test('search-task contact enrichment is scheduled without blocking core search completion', async () => {
  let queued: (() => void) | undefined
  let enrichStarted = false

  const scheduled = scheduleSearchTaskContactEnrichment('task-1', true, {
    schedule: (job) => {
      queued = job
    },
    enrich: async () => {
      enrichStarted = true
      return {
        attemptedLeadCount: 1,
        enrichedLeadCount: 1,
        observedContactCount: 1,
      }
    },
  })

  assert.equal(scheduled, true)
  assert.equal(enrichStarted, false)
  assert.ok(queued)

  queued()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(enrichStarted, true)
})

test('legacy search-task enrichment entrypoint only queues background discovery', async () => {
  const source = await readFile(
    new URL('../src/services/direct-search-contact-enrichment.service.ts', import.meta.url),
    'utf8',
  )
  const entrypointIndex = source.indexOf('export async function enrichSearchTaskContacts')
  const schedulerCallIndex = source.indexOf(
    'scheduleSearchTaskContactEnrichment(taskId, true)',
    entrypointIndex,
  )

  assert.ok(entrypointIndex >= 0)
  assert.ok(schedulerCallIndex > entrypointIndex)
  assert.doesNotMatch(
    source.slice(entrypointIndex, schedulerCallIndex + 120),
    /await defaultService\.enrich/,
  )
})
