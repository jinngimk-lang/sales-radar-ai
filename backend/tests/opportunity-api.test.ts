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
import { getSearchTaskOpportunities } from '../src/services/search-task.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
let ownerId = ''
let otherUserId = ''
let taskId = ''
let failedTaskId = ''
let mockTaskId = ''
let opportunityId = ''
let legacyOpportunityId = ''

describe('SearchTask Opportunity API service', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `opportunity-api-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `opportunity-api-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id
    const [task, failedTask, mockTask] = await Promise.all([
      prisma.searchTask.create({
        data: {
          userId: ownerId,
          keyword: `opportunity-api-${suffix}`,
          provider: 'agent-reach',
          status: 'COMPLETED',
          platforms: [Platform.Website],
          regions: [Region.Europe],
        },
      }),
      prisma.searchTask.create({
        data: {
          userId: ownerId,
          keyword: `opportunity-api-failed-${suffix}`,
          provider: 'agent-reach',
          status: 'FAILED',
          platforms: [Platform.Website],
          regions: [Region.Europe],
        },
      }),
      prisma.searchTask.create({
        data: {
          userId: ownerId,
          keyword: `opportunity-api-mock-${suffix}`,
          provider: 'mock',
          status: 'COMPLETED',
          platforms: [Platform.Website],
          regions: [Region.Europe],
        },
      }),
    ])
    taskId = task.id
    failedTaskId = failedTask.id
    mockTaskId = mockTask.id
    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: task.id,
        provider: 'agent-reach',
        externalId: `opportunity-api-evidence-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://example.com/opportunity-api/${suffix}`,
        title: 'Verified Manufacturing expands its European plant',
        content:
          'Verified Manufacturing announced an expansion of its European plant.',
      },
    })
    const opportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId: taskId,
        integrityStatus: OpportunityIntegrityStatus.EVIDENCE_LINKED,
        type: OpportunityType.COMPANY_EXPANSION,
        dedupeKey: `opportunity-api-${suffix}`,
        companyName: 'Verified Manufacturing GmbH',
        title: 'Verified Manufacturing expands its European plant',
        summary: 'The company announced a factory expansion.',
        whyItMatters: 'The expansion may create a relevant sales window.',
        recommendedNextStep: 'Verify the project scope.',
        confidence: 82,
        productContextSnapshot: {
          product: 'industrial automation SaaS',
          region: 'Europe',
        },
      },
    })
    opportunityId = opportunity.id
    await prisma.opportunityEvidence.create({
      data: {
        opportunityId,
        searchEvidenceId: evidence.id,
        excerpt:
          'Verified Manufacturing announced an expansion of its European plant.',
        isPrimary: true,
        confidence: 82,
      },
    })

    const legacyOpportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId: taskId,
        integrityStatus: OpportunityIntegrityStatus.LEGACY_INVALID,
        type: OpportunityType.COMPANY_EXPANSION,
        dedupeKey: `opportunity-api-legacy-${suffix}`,
        companyName: 'Legacy Manufacturing',
        title: 'Legacy Opportunity without Evidence',
        summary: 'Historical record without an Evidence relationship.',
        whyItMatters: 'This historical record is retained for audit only.',
        recommendedNextStep: 'Do not show this record to users.',
        confidence: 90,
        productContextSnapshot: {
          product: 'industrial automation SaaS',
          region: 'Europe',
        },
      },
    })
    legacyOpportunityId = legacyOpportunity.id

    await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId: mockTask.id,
        integrityStatus: OpportunityIntegrityStatus.LEGACY_INVALID,
        type: OpportunityType.INVESTMENT,
        dedupeKey: `opportunity-api-mock-${suffix}`,
        title: 'Mock seed opportunity',
        summary: 'Mock fixture retained outside production results.',
        whyItMatters: 'Test fixture only.',
        recommendedNextStep: 'Do not expose.',
        confidence: 99,
        productContextSnapshot: { isSeedFixture: true },
        detectionVersion: 'seed-v1',
      },
    })
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('returns only Opportunities owned by the active user and SearchTask', async () => {
    const opportunities = await getSearchTaskOpportunities(
      taskId,
      async () => ({ id: ownerId }),
    )
    assert.deepEqual(
      opportunities.map((opportunity) => opportunity.id),
      [opportunityId],
    )
  })

  it('returns no Opportunities for a failed SearchTask', async () => {
    assert.deepEqual(
      await getSearchTaskOpportunities(failedTaskId, async () => ({
        id: ownerId,
      })),
      [],
    )
  })

  it('does not display a historical Opportunity without Evidence', async () => {
    const opportunities = await getSearchTaskOpportunities(
      taskId,
      async () => ({ id: ownerId }),
    )

    assert.equal(
      opportunities.some(
        (opportunity) => opportunity.id === legacyOpportunityId,
      ),
      false,
    )
  })

  it('does not display seed or mock Opportunities without Evidence', async () => {
    assert.deepEqual(
      await getSearchTaskOpportunities(mockTaskId, async () => ({
        id: ownerId,
      })),
      [],
    )
  })

  it('does not expose another user SearchTask', async () => {
    await assert.rejects(
      () =>
        getSearchTaskOpportunities(taskId, async () => ({
          id: otherUserId,
        })),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'SEARCH_TASK_NOT_FOUND',
    )
  })
})
