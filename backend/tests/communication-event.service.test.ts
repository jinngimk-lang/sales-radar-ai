import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CommunicationEventService,
  type CommunicationEventInput,
  type CommunicationEventRecord,
  type CommunicationEventRepository,
} from '../src/services/communication-event.service.js'
import { AppError } from '../src/utils/app-error.js'

function harness(options?: {
  activeUserId?: string
  leadUserId?: string
  leadExists?: boolean
  hasPublicContact?: boolean
}) {
  const activeUserId = options?.activeUserId ?? 'user-1'
  const leadUserId = options?.leadUserId ?? 'user-1'
  let sequence = 0
  const events: CommunicationEventRecord[] = []

  const repository: CommunicationEventRepository = {
    findOwnedLead: async (leadId, userId) =>
      options?.leadExists === false ||
      leadId !== 'lead-1' ||
      userId !== leadUserId
        ? null
        : { id: leadId },
    hasPublicContact: async (leadId, userId) =>
      leadId === 'lead-1' &&
      userId === leadUserId &&
      options?.hasPublicContact !== false,
    list: async (leadId, userId) =>
      events
        .filter((event) => event.leadId === leadId && event.userId === userId)
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    findByExternalEventId: async (
      leadId,
      userId,
      channel,
      eventType,
      externalEventId,
    ) =>
      events.find(
        (event) =>
          event.leadId === leadId &&
          event.userId === userId &&
          event.channel === channel &&
          event.eventType === eventType &&
          event.externalEventId === externalEventId,
      ) ?? null,
    create: async (leadId, userId, input) => {
      sequence += 1
      const event: CommunicationEventRecord = {
        id: `event-${sequence}`,
        userId,
        leadId,
        outreachMessageId: null,
        channel: input.channel,
        eventType: input.eventType,
        verificationSource: 'USER_EVIDENCE_VERIFIED',
        provider: null,
        externalEventId: input.externalEventId ?? null,
        evidenceUrl: input.evidenceUrl ?? null,
        evidenceNote: input.evidenceNote ?? null,
        occurredAt: input.occurredAt,
        createdAt: new Date('2026-08-25T00:00:00.000Z'),
      }
      events.push(event)
      return event
    },
  }

  return {
    service: new CommunicationEventService(repository, async () => ({
      id: activeUserId,
    })),
    events,
  }
}

const sent: CommunicationEventInput = {
  eventType: 'SENT',
  channel: 'email',
  externalEventId: 'message-123',
  occurredAt: new Date('2026-08-25T01:00:00.000Z'),
}

describe('Communication evidence', () => {
  it('rejects note-only communication evidence', async () => {
    const test = harness()

    await assert.rejects(
      () =>
        test.service.createUserEvidence('lead-1', {
          eventType: 'SENT',
          channel: 'email',
          evidenceNote: 'I sent it',
          occurredAt: new Date(),
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 400 &&
        error.code === 'VALIDATION_ERROR',
    )
  })

  it('accepts an attributable external event id and forces user verification source', async () => {
    const test = harness()
    const event = await test.service.createUserEvidence('lead-1', sent)

    assert.equal(event.eventType, 'SENT')
    assert.equal(event.externalEventId, 'message-123')
    assert.equal(event.verificationSource, 'USER_EVIDENCE_VERIFIED')
  })

  it('accepts a valid http evidence URL', async () => {
    const test = harness()
    const event = await test.service.createUserEvidence('lead-1', {
      eventType: 'REPLIED',
      channel: 'linkedin',
      evidenceUrl: 'https://www.linkedin.com/messaging/thread/example',
      occurredAt: new Date('2026-08-25T02:00:00.000Z'),
    })

    assert.equal(event.eventType, 'REPLIED')
    assert.equal(
      event.evidenceUrl,
      'https://www.linkedin.com/messaging/thread/example',
    )
  })

  it('rejects non-http evidence URLs', async () => {
    const test = harness()

    await assert.rejects(
      () =>
        test.service.createUserEvidence('lead-1', {
          eventType: 'SENT',
          channel: 'email',
          evidenceUrl: 'javascript:alert(1)',
          occurredAt: new Date(),
        }),
      (error: unknown) =>
        error instanceof AppError && error.statusCode === 400,
    )
  })

  it('is idempotent for the same attributable external event id', async () => {
    const test = harness()
    const first = await test.service.createUserEvidence('lead-1', sent)
    const second = await test.service.createUserEvidence('lead-1', sent)

    assert.equal(second.id, first.id)
    assert.equal(test.events.length, 1)
  })

  it('isolates events by owned lead', async () => {
    const test = harness({ activeUserId: 'user-2', leadUserId: 'user-1' })

    await assert.rejects(
      () => test.service.createUserEvidence('lead-1', sent),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'LEAD_NOT_FOUND',
    )
  })

  it('derives positive state in MEETING > REPLIED > SENT order', async () => {
    const test = harness()
    assert.equal((await test.service.summary('lead-1')).state, 'READY')

    await test.service.createUserEvidence('lead-1', sent)
    assert.equal((await test.service.summary('lead-1')).state, 'SENT')

    await test.service.createUserEvidence('lead-1', {
      eventType: 'REPLIED',
      channel: 'email',
      externalEventId: 'reply-456',
      occurredAt: new Date('2026-08-25T02:00:00.000Z'),
    })
    assert.equal((await test.service.summary('lead-1')).state, 'REPLIED')

    await test.service.createUserEvidence('lead-1', {
      eventType: 'MEETING',
      channel: 'other',
      evidenceUrl: 'https://calendar.example.com/event/789',
      occurredAt: new Date('2026-08-25T03:00:00.000Z'),
    })
    const summary = await test.service.summary('lead-1')
    assert.equal(summary.state, 'MEETING')
    assert.equal(summary.lastEvent?.eventType, 'MEETING')
  })

  it('returns RESEARCH when there is no communication evidence or public contact', async () => {
    const test = harness({ hasPublicContact: false })
    assert.equal((await test.service.summary('lead-1')).state, 'RESEARCH')
  })

  it('does not let a FAILED event advance positive state', async () => {
    const test = harness()
    await test.service.createUserEvidence('lead-1', {
      eventType: 'FAILED',
      channel: 'email',
      externalEventId: 'failed-send-1',
      occurredAt: new Date('2026-08-25T04:00:00.000Z'),
    })

    assert.equal((await test.service.summary('lead-1')).state, 'READY')
  })
})
