import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  CustomerType,
  Industry,
  Platform,
  Region,
  type SearchTaskStatus,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { getSearchTaskResults } from '../src/services/search-task.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
let ownerId = ''
let otherUserId = ''
let completedTaskId = ''
let failedTaskId = ''
let linkedLeadId = ''
let historicalLeadId = ''

async function createTask(userId: string, status: SearchTaskStatus) {
  return prisma.searchTask.create({
    data: {
      userId,
      keyword: `search-truth-${suffix}`,
      provider: 'agent-reach',
      status,
      platforms: [Platform.Reddit],
      regions: [Region.Europe],
    },
  })
}

async function createLead(userId: string, label: string) {
  return prisma.lead.create({
    data: {
      userId,
      provider: 'test',
      externalId: `${label}-${suffix}`,
      username: label,
      displayName: label,
      initials: 'ST',
      platform: Platform.Reddit,
      customerType: CustomerType.Company,
      postContent: `${label} search truth evidence`,
      country: 'Germany',
      region: Region.Europe,
      industry: Industry.SaaSSoftware,
      sourceUrl: `https://example.com/${label}/${suffix}`,
      profileUrl: `https://example.com/${label}/${suffix}/profile`,
    },
  })
}

describe('Search Truth Phase 1.1 result ownership', () => {
  before(async () => {
    const owner = await prisma.user.create({
      data: {
        email: `search-truth-owner-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })
    const other = await prisma.user.create({
      data: {
        email: `search-truth-other-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })
    ownerId = owner.id
    otherUserId = other.id

    const completedTask = await createTask(ownerId, 'COMPLETED')
    const failedTask = await createTask(ownerId, 'FAILED')
    completedTaskId = completedTask.id
    failedTaskId = failedTask.id

    const linkedLead = await createLead(ownerId, 'linked-current')
    const historicalLead = await createLead(ownerId, 'historical-only')
    linkedLeadId = linkedLead.id
    historicalLeadId = historicalLead.id

    await prisma.searchTaskLead.createMany({
      data: [
        {
          searchTaskId: completedTaskId,
          leadId: linkedLeadId,
          rankScore: 90,
        },
        {
          searchTaskId: failedTaskId,
          leadId: historicalLeadId,
          rankScore: 80,
        },
      ],
    })
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('returns only Leads explicitly owned by the current SearchTask', async () => {
    const results = await getSearchTaskResults(completedTaskId, async () => ({
      id: ownerId,
    }))

    assert.deepEqual(
      results.map((result) => result.id),
      [linkedLeadId],
    )
    assert.equal(
      results.some((result) => result.id === historicalLeadId),
      false,
    )
  })

  it('returns zero current results for a failed task', async () => {
    const results = await getSearchTaskResults(failedTaskId, async () => ({
      id: ownerId,
    }))

    assert.deepEqual(results, [])
  })

  it('does not expose another user task or its results', async () => {
    await assert.rejects(
      () =>
        getSearchTaskResults(completedTaskId, async () => ({
          id: otherUserId,
        })),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'SEARCH_TASK_NOT_FOUND',
    )
  })
})
