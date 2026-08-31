import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { readUserCommunicationEventInput } from '../src/controllers/lead.controller.js'
import { AppError } from '../src/utils/app-error.js'

const routesSource = readFileSync(
  new URL('../src/routes/lead.routes.ts', import.meta.url),
  'utf8',
)

test('communication evidence request parsing ignores caller-owned verification fields', () => {
  const parsed = readUserCommunicationEventInput({
    eventType: 'SENT',
    channel: 'email',
    externalEventId: 'message-42',
    evidenceNote: 'operator context only',
    occurredAt: '2026-08-25T09:30:00.000Z',
    verificationSource: 'PROVIDER_VERIFIED',
    provider: 'forged-provider',
  })

  assert.deepEqual(parsed, {
    eventType: 'SENT',
    channel: 'email',
    externalEventId: 'message-42',
    evidenceUrl: undefined,
    evidenceNote: 'operator context only',
    occurredAt: new Date('2026-08-25T09:30:00.000Z'),
  })
  assert.equal('verificationSource' in parsed, false)
  assert.equal('provider' in parsed, false)
})

test('communication evidence request parsing rejects note-only assertions', () => {
  assert.throws(
    () =>
      readUserCommunicationEventInput({
        eventType: 'REPLIED',
        channel: 'linkedin',
        evidenceNote: 'They replied',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === 'VALIDATION_ERROR',
  )
})

test('communication evidence request parsing rejects provider-only and malformed values', () => {
  for (const body of [
    {
      eventType: 'DELIVERED',
      channel: 'email',
      externalEventId: 'delivery-1',
    },
    {
      eventType: 'SENT',
      channel: 'telegram',
      externalEventId: 'message-1',
    },
    {
      eventType: 'SENT',
      channel: 'email',
      externalEventId: 'message-1',
      occurredAt: 'not-a-time',
    },
  ]) {
    assert.throws(
      () => readUserCommunicationEventInput(body),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.code === 'VALIDATION_ERROR',
    )
  }
})

test('lead routes expose evidence-backed communication events and summary', () => {
  assert.match(
    routesSource,
    /leadRouter\.get\('\/:id\/communication-events',\s*asyncRoute\(listCommunicationEventsController\)\)/s,
  )
  assert.match(
    routesSource,
    /leadRouter\.post\('\/:id\/communication-events',\s*asyncRoute\(createCommunicationEventController\)\)/s,
  )
  assert.match(
    routesSource,
    /leadRouter\.get\('\/:id\/communication-summary',\s*asyncRoute\(getCommunicationSummaryController\)\)/s,
  )
})
