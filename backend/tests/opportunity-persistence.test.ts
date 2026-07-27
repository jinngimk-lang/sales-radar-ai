import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { OpportunityPersistenceService } from '../src/services/opportunity-persistence.service.js'

const suffix = randomUUID()
const persistence = new OpportunityPersistenceService()
let userId = ''
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
    userId = user.id
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
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined)
  })

  it('upserts one Opportunity without creating or linking a Lead', async () => {
    const input = {
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
        dedupeKey: `investment-${suffix}`,
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
    assert.equal(opportunities.length, 1)
    assert.equal(opportunities[0]?.evidence.length, 1)
    assert.equal(evidence.leadId, null)
    assert.equal(
      await prisma.searchTaskLead.count({ where: { searchTaskId: taskId } }),
      0,
    )
  })
})
