import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { Industry, Platform, Region } from '@prisma/client'
import type { Request, Response } from 'express'
import { prisma } from '../src/prisma/client.js'
import { buildCreateSearchTaskController } from '../src/controllers/search-task.controller.js'
import {
  createSearchTask,
  processSearchTask,
  type SearchTaskExecutionDependencies,
} from '../src/services/search-task.service.js'
import type { ProviderHealth } from '../src/services/provider-health.service.js'

const suffix = randomUUID()
let userId = ''
const taskIds: string[] = []

function providerHealth(
  state: ProviderHealth['state'],
  code: string,
): ProviderHealth {
  return {
    provider: 'agent-reach',
    dependency: 'exa',
    state,
    code,
    message: 'test-only provider health detail',
    checkedAt: new Date().toISOString(),
  }
}

describe('SearchTask provider health execution boundary', () => {
  before(async () => {
    const user = await prisma.user.create({
      data: {
        email: `search-health-${suffix}@salesradar.local`,
        passwordHash: 'test-only',
      },
    })
    userId = user.id
  })

  after(async () => {
    await prisma.searchTask.deleteMany({
      where: { id: { in: taskIds } },
    })
    await prisma.user.deleteMany({ where: { id: userId } })
  })

  it('creates a pending SearchTask before provider availability is evaluated', async () => {
    const task = await createSearchTask({
      userId,
      keyword: `provider-health-entry-${suffix}`,
      platforms: [],
      regions: [],
    })
    taskIds.push(task.id)

    assert.equal(task.status, 'PENDING')
    assert.equal(task.provider, 'agent-reach')
    assert.equal(task.errorCode, null)
  })

  it('returns 202 from the API entry without running a provider health gate', async () => {
    let scheduledTaskId = ''
    let responseStatus = 0
    let responseBody: unknown
    const controller = buildCreateSearchTaskController((taskId) => {
      scheduledTaskId = taskId
    })
    const request = {
      body: {
        keyword: `provider-health-controller-${suffix}`,
        platforms: [],
        regions: [],
      },
    } as Request
    const response = {
      status(code: number) {
        responseStatus = code
        return this
      },
      json(body: unknown) {
        responseBody = body
        return this
      },
    } as unknown as Response

    await Promise.resolve(controller(request, response, () => undefined))

    const envelope = responseBody as {
      data?: { id?: string; status?: string }
    }
    assert.equal(responseStatus, 202)
    assert.equal(envelope.data?.status, 'PENDING')
    assert.equal(scheduledTaskId, envelope.data?.id)
    assert.ok(scheduledTaskId)
    taskIds.push(scheduledTaskId)
  })

  it('records unavailable provider health and fails without producing data', async () => {
    const task = await createSearchTask({
      userId,
      keyword: `provider-health-unavailable-${suffix}`,
      platforms: [],
      regions: [],
    })
    taskIds.push(task.id)
    let providerResolved = false
    const dependencies: SearchTaskExecutionDependencies = {
      checkProviderHealth: async () =>
        providerHealth('UNAVAILABLE', 'MCPORTER_NOT_FOUND'),
      resolveProvider: () => {
        providerResolved = true
        throw new Error('Provider must not run when health is unavailable')
      },
    }

    await processSearchTask(task.id, dependencies)

    const stored = await prisma.searchTask.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        searchEvidence: true,
        opportunities: true,
        resultLinks: true,
      },
    })
    const parameters = stored.parameters as {
      providerExecution?: {
        provider?: string
        health?: {
          state?: string
          code?: string
          checkedAt?: string
        }
      }
    } | null

    assert.equal(providerResolved, false)
    assert.equal(stored.status, 'FAILED')
    assert.equal(stored.errorCode, 'SEARCH_PROVIDER_UNAVAILABLE')
    assert.equal(
      stored.errorMessage,
      'The search service is temporarily unavailable. Please try again later.',
    )
    assert.equal(stored.retryCount, 1)
    assert.ok(stored.completedAt)
    assert.equal(parameters?.providerExecution?.provider, 'agent-reach')
    assert.equal(
      parameters?.providerExecution?.health?.state,
      'UNAVAILABLE',
    )
    assert.equal(
      parameters?.providerExecution?.health?.code,
      'MCPORTER_NOT_FOUND',
    )
    assert.ok(parameters?.providerExecution?.health?.checkedAt)
    assert.equal(stored.searchEvidence.length, 0)
    assert.equal(stored.opportunities.length, 0)
    assert.equal(stored.resultLinks.length, 0)
  })

  it('records available health and completes an empty real-provider execution', async () => {
    const task = await createSearchTask({
      userId,
      keyword: `provider-health-available-${suffix}`,
      platforms: [],
      regions: [],
    })
    taskIds.push(task.id)
    const dependencies: SearchTaskExecutionDependencies = {
      checkProviderHealth: async () => providerHealth('AVAILABLE', 'OK'),
      resolveProvider: () => ({
        name: 'agent-reach',
        search: async () => [],
      }),
    }

    await processSearchTask(task.id, dependencies)

    const stored = await prisma.searchTask.findUniqueOrThrow({
      where: { id: task.id },
    })
    const parameters = stored.parameters as {
      providerExecution?: {
        health?: { state?: string; code?: string }
      }
    } | null

    assert.equal(stored.status, 'COMPLETED')
    assert.equal(stored.resultCount, 0)
    assert.equal(stored.errorCode, null)
    assert.equal(parameters?.providerExecution?.health?.state, 'AVAILABLE')
    assert.equal(parameters?.providerExecution?.health?.code, 'OK')
  })

  it('persists one idempotent RadarAssessment for each SearchEvidence before completing', async () => {
    const task = await createSearchTask({
      userId,
      keyword: `radar-runtime-${suffix}`,
      platforms: [Platform.Website],
      regions: [Region.Europe],
    })
    taskIds.push(task.id)
    const dependencies: SearchTaskExecutionDependencies = {
      checkProviderHealth: async () => providerHealth('AVAILABLE', 'OK'),
      resolveProvider: () => ({
        name: 'agent-reach',
        search: async () => [
          {
            externalId: `radar-runtime-evidence-${suffix}`,
            platform: Platform.Website,
            sourceUrl: `https://example.com/radar-runtime/${suffix}`,
            profileUrl: `https://example.com/radar-runtime/${suffix}`,
            company: 'Runtime Manufacturing GmbH',
            customerName: 'Runtime Manufacturing GmbH',
            country: 'Germany',
            region: Region.Europe,
            industry: Industry.IndustrialManufacturing,
            rawContent:
              'Runtime Manufacturing GmbH announced an expansion of its European factory. The official update describes a new production line, project timing, and increased manufacturing capacity.',
            metadata: {
              title:
                'Runtime Manufacturing GmbH expands European factory',
              entityRole: 'end_customer',
              publishedAt: '2026-07-30',
            },
          },
        ],
      }),
    }

    await processSearchTask(task.id, dependencies)
    await processSearchTask(task.id, dependencies)

    const stored = await prisma.searchTask.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        searchEvidence: true,
        radarAssessments: true,
      },
    })

    assert.equal(stored.status, 'COMPLETED')
    assert.equal(stored.searchEvidence.length, 1)
    assert.equal(stored.radarAssessments.length, 1)
    assert.equal(
      stored.radarAssessments[0]?.searchEvidenceId,
      stored.searchEvidence[0]?.id,
    )
  })
})
