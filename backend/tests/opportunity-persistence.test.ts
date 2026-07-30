import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  OpportunityIntegrityStatus,
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { OpportunityPersistenceService } from '../src/services/opportunity-persistence.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const persistence = new OpportunityPersistenceService()
let userId = ''
let otherUserId = ''
let taskId = ''
let evidenceId = ''

describe('Opportunity persistence is independent from Lead qualification', () => {
  before(async () => {
    const user = await prisma.user.create({
      data: {
        email: `opportunity-persistence-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })
    const otherUser = await prisma.user.create({
      data: {
        email: `opportunity-persistence-other-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })
    userId = user.id
    otherUserId = otherUser.id
    const task = await prisma.searchTask.create({
      data: {
        userId,
        keyword: `factory expansion ${suffix}`,
        provider: 'agent-reach',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
      },
    })
    taskId = task.id
    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: taskId,
        provider: 'agent-reach',
        externalId: `event-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://example.com/events/${suffix}`,
        title: 'Intel announces factory investment in Europe',
        content:
          'Intel announced an investment to expand manufacturing capacity in Europe.',
      },
    })
    evidenceId = evidence.id
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [userId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('upserts one Opportunity without creating or linking a Lead', async () => {
    const input = opportunityInput(`investment-${suffix}`)

    const first = await persistence.persist(input)
    const second = await persistence.persist(input)
    const opportunities = await prisma.opportunity.findMany({
      where: { searchTaskId: taskId },
      include: { evidence: true },
    })
    const evidence = await prisma.searchEvidence.findUniqueOrThrow({
      where: { id: evidenceId },
    })

    assert.equal(first.id, second.id)
    assert.equal(
      first.integrityStatus,
      OpportunityIntegrityStatus.EVIDENCE_LINKED,
    )
    assert.equal(opportunities.length, 1)
    assert.equal(opportunities[0]?.evidence.length, 1)
    assert.equal(evidence.leadId, null)
    assert.equal(
      await prisma.searchTaskLead.count({ where: { searchTaskId: taskId } }),
      0,
    )
  })

  it('rolls back Opportunity creation when Evidence persistence fails', async () => {
    const dedupeKey = `rollback-${suffix}`
    const input = opportunityInput(dedupeKey)
    input.detection.confidence = Number.NaN

    await assert.rejects(() => persistence.persist(input))

    assert.equal(
      await prisma.opportunity.count({
        where: { searchTaskId: taskId, dedupeKey },
      }),
      0,
    )
  })

  it('does not link Evidence across users', async () => {
    const dedupeKey = `cross-user-${suffix}`
    const input = opportunityInput(dedupeKey)
    input.userId = otherUserId

    await assert.rejects(
      () => persistence.persist(input),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'OPPORTUNITY_EVIDENCE_NOT_FOUND',
    )

    assert.equal(
      await prisma.opportunity.count({
        where: { searchTaskId: taskId, dedupeKey },
      }),
      0,
    )
  })
})

function opportunityInput(dedupeKey: string) {
  return {
    userId,
    searchTaskId: taskId,
    searchEvidenceId: evidenceId,
    productContext: {
      product: 'industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
    },
    detection: {
      type: OpportunityType.INVESTMENT,
      dedupeKey,
      companyName: 'Intel',
      title: 'Intel announces factory investment in Europe',
      summary: 'Intel announced an investment in European manufacturing.',
      whyItMatters:
        'This is a research opportunity, not confirmation of procurement.',
      recommendedNextStep: 'Verify the investment scope.',
      confidence: 85,
      evidenceExcerpt:
        'Intel announced an investment to expand manufacturing capacity.',
      detectionVersion: 'v1',
    },
  }
}
