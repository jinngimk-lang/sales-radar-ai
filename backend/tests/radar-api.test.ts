import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Request, Response } from 'express'
import {
  createListRadarAssessmentsController,
  createRadarAssessmentController,
} from '../src/controllers/radar.controller.js'

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
})
