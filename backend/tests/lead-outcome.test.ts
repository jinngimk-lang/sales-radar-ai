import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  CustomerType,
  Industry,
  LeadOutcomeStatus,
  Platform,
  Region,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import {
  LeadOutcomeService,
  type LeadOutcomeInput,
  type LeadOutcomeRepository,
  type StoredLeadOutcome,
} from '../src/services/lead-outcome.service.js'
import { AppError } from '../src/utils/app-error.js'

function harness(options?: {
  activeUserId?: string
  leadUserId?: string
  leadExists?: boolean
}) {
  const activeUserId = options?.activeUserId ?? 'user-1'
  const leadUserId = options?.leadUserId ?? 'user-1'
  let stored: StoredLeadOutcome | null = null
  let creates = 0
  let updates = 0

  const repository: LeadOutcomeRepository = {
    findOwnedLead: async (leadId, userId) =>
      options?.leadExists === false ||
      leadId !== 'lead-1' ||
      userId !== leadUserId
        ? null
        : { id: leadId },
    findByLead: async (leadId, userId) =>
      stored?.leadId === leadId && stored.userId === userId ? stored : null,
    create: async (leadId, userId, input) => {
      creates += 1
      stored = {
        id: 'outcome-1',
        leadId,
        userId,
        status: input.status,
        note: input.note ?? null,
      }
      return stored
    },
    update: async (id, input) => {
      updates += 1
      if (!stored || stored.id !== id) throw new Error('outcome missing')
      stored = {
        ...stored,
        status: input.status,
        note: input.note ?? null,
      }
      return stored
    },
  }

  return {
    service: new LeadOutcomeService(repository, async () => ({
      id: activeUserId,
    })),
    state: () => ({ stored, creates, updates }),
  }
}

const contacted: LeadOutcomeInput = {
  status: LeadOutcomeStatus.CONTACTED,
  note: '已发送首次合作邮件',
}

describe('Lead Outcome Tracking v1', () => {
  it('creates an outcome for an owned Lead', async () => {
    const test = harness()
    const result = (await test.service.create(
      'lead-1',
      contacted,
    )) as StoredLeadOutcome

    assert.equal(result.status, LeadOutcomeStatus.CONTACTED)
    assert.equal(result.userId, 'user-1')
    assert.equal(test.state().creates, 1)
  })

  it('isolates outcomes by the active user', async () => {
    const test = harness({
      activeUserId: 'user-2',
      leadUserId: 'user-1',
    })

    await assert.rejects(
      () => test.service.create('lead-1', contacted),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'LEAD_NOT_FOUND',
    )
  })

  it('returns not found when the Lead does not exist', async () => {
    const test = harness({ leadExists: false })
    await assert.rejects(
      () => test.service.get('missing-lead'),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'LEAD_NOT_FOUND',
    )
  })

  it('updates the current outcome status', async () => {
    const test = harness()
    await test.service.create('lead-1', contacted)
    const updated = (await test.service.update('lead-1', {
      status: LeadOutcomeStatus.REPLIED,
      note: '客户已回复',
    })) as StoredLeadOutcome

    assert.equal(updated.status, LeadOutcomeStatus.REPLIED)
    assert.equal(updated.note, '客户已回复')
    assert.equal(test.state().updates, 1)
  })

  it('gets the current outcome', async () => {
    const test = harness()
    await test.service.create('lead-1', contacted)
    const result = await test.service.get('lead-1')

    assert.equal(result?.status, LeadOutcomeStatus.CONTACTED)
    assert.equal(result?.note, contacted.note)
  })

  it('cascades outcome deletion when its Lead is deleted', async () => {
    const suffix = randomUUID()
    const user = await prisma.user.create({
      data: {
        email: `outcome-test-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })

    try {
      const lead = await prisma.lead.create({
        data: {
          userId: user.id,
          provider: 'test',
          externalId: `outcome-${suffix}`,
          username: 'outcome_test',
          displayName: 'Outcome Test',
          initials: 'OT',
          platform: Platform.Reddit,
          customerType: CustomerType.Buyer,
          postContent: 'Test outcome cascade behavior.',
          country: 'United States',
          region: Region.USA,
          industry: Industry.IndustrialManufacturing,
          sourceUrl: `https://example.com/source/${suffix}`,
          profileUrl: `https://example.com/profile/${suffix}`,
        },
      })
      const outcome = await prisma.leadOutcome.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          status: LeadOutcomeStatus.CONTACTED,
        },
      })

      await prisma.lead.delete({ where: { id: lead.id } })
      assert.equal(
        await prisma.leadOutcome.findUnique({ where: { id: outcome.id } }),
        null,
      )
    } finally {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined)
    }
  })
})
