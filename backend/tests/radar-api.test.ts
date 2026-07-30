import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Request, Response } from 'express'
import {
  createListRadarAssessmentsController,
  createRadarAssessmentController,
} from '../src/controllers/radar.controller.js'
import { attachDemoWorkspaceUser } from '../src/middleware/demo-workspace-user.js'
import { AppError } from '../src/utils/app-error.js'

describe('Radar Assessment API', () => {
  it('creates an Assessment with the authenticated user context', async () => {
    let received: unknown
    let statusCode = 0
    let payload: unknown
    const controller = createRadarAssessmentController({
      async createForEvidence(input) {
        received = input
        return {
          id: 'assessment-1',
          decision: 'POTENTIAL_OPPORTUNITY',
        }
      },
      async listForSearchTask() {
        return []
      },
    })
    const request = {
      body: { searchEvidenceId: 'evidence-1' },
      user: { id: 'user-1' },
    } as unknown as Request
    const response = {
      status(code: number) {
        statusCode = code
        return this
      },
      json(body: unknown) {
        payload = body
        return this
      },
    } as unknown as Response

    await controller(request, response, () => undefined)

    assert.deepEqual(received, {
      userId: 'user-1',
      searchEvidenceId: 'evidence-1',
    })
    assert.equal(statusCode, 201)
    assert.deepEqual(payload, {
      data: {
        id: 'assessment-1',
        decision: 'POTENTIAL_OPPORTUNITY',
      },
    })
  })

  it('lists Radar Workspace results without Blocked by default', async () => {
    let received: unknown
    let payload: unknown
    const controller = createListRadarAssessmentsController({
      async createForEvidence() {
        return {}
      },
      async listForSearchTask(input) {
        received = input
        return [{ id: 'assessment-1' }]
      },
    })
    const request = {
      query: { searchTaskId: 'task-1' },
      user: { id: 'user-1' },
    } as unknown as Request
    const response = {
      json(body: unknown) {
        payload = body
        return this
      },
    } as unknown as Response

    await controller(request, response, () => undefined)

    assert.deepEqual(received, {
      userId: 'user-1',
      searchTaskId: 'task-1',
      includeBlocked: false,
    })
    assert.deepEqual(payload, {
      data: [{ id: 'assessment-1' }],
      meta: { total: 1 },
    })
  })

  it('rejects an unauthenticated production request', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const controller = createListRadarAssessmentsController({
      async createForEvidence() {
        return {}
      },
      async listForSearchTask() {
        return []
      },
    })
    const request = {
      query: { searchTaskId: 'task-1' },
    } as unknown as Request
    const response = {
      json() {
        return this
      },
    } as unknown as Response

    try {
      await assert.rejects(
        () => controller(request, response, () => undefined),
        (error: unknown) =>
          error instanceof AppError &&
          error.statusCode === 401 &&
          error.code === 'AUTHENTICATION_REQUIRED',
      )
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = previousNodeEnv
      }
    }
  })

  it('uses the existing demo workspace as the authenticated API context', async () => {
    let receivedUserId = ''
    let payload: unknown
    const request = {
      query: { searchTaskId: 'task-1' },
    } as unknown as Request
    const response = {
      locals: {},
      json(body: unknown) {
        payload = body
        return this
      },
    } as unknown as Response
    Object.defineProperty(request, 'res', {
      configurable: true,
      value: response,
    })

    await new Promise<void>((resolve, reject) => {
      attachDemoWorkspaceUser(request, response, (error?: unknown) => {
        if (error) reject(error)
        else resolve()
      })
    })

    const controller = createListRadarAssessmentsController({
      async createForEvidence() {
        return {}
      },
      async listForSearchTask(input) {
        receivedUserId = input.userId
        return []
      },
    })
    await controller(request, response, () => undefined)

    assert.ok(receivedUserId)
    assert.equal(receivedUserId, response.locals.userId)
    assert.deepEqual(payload, { data: [], meta: { total: 0 } })
  })
})
