import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Request, Response } from 'express'
import { createSubmitLeadResearchFeedbackController } from '../src/controllers/lead.controller.js'
import {
  LeadResearchFeedbackService,
  type LeadResearchFeedbackInput,
  type LeadResearchFeedbackRepository,
} from '../src/services/lead-research-feedback.service.js'
import { AppError } from '../src/utils/app-error.js'

function harness(options?: {
  researchUserId?: string
  activeUserId?: string
  researchExists?: boolean
}) {
  const records = new Map<string, Record<string, unknown>>()
  let creates = 0
  let updates = 0
  const activeUserId = options?.activeUserId ?? 'user-1'
  const researchUserId = options?.researchUserId ?? 'user-1'

  const repository: LeadResearchFeedbackRepository = {
    findOwnedResearch: async (leadId, userId) =>
      options?.researchExists === false ||
      leadId !== 'lead-1' ||
      userId !== researchUserId
        ? null
        : { id: 'research-1' },
    upsert: async (leadResearchId, userId, input) => {
      const key = `${leadResearchId}:${userId}`
      const existing = records.get(key)
      if (existing) updates += 1
      else creates += 1
      const value = {
        id: existing?.id ?? 'feedback-1',
        leadResearchId,
        userId,
        ...input,
      }
      records.set(key, value)
      return value
    },
  }

  const service = new LeadResearchFeedbackService(repository, async () => ({
    id: activeUserId,
  }))

  return {
    service,
    state: () => ({ records, creates, updates }),
  }
}

const usefulFeedback: LeadResearchFeedbackInput = {
  rating: 5,
  feedbackType: 'useful',
  comment: '匹配判断准确',
}

describe('Lead Research Quality Loop v1', () => {
  it('creates feedback for an owned LeadResearch', async () => {
    const test = harness()
    const result = (await test.service.submit(
      'lead-1',
      usefulFeedback,
    )) as Record<string, unknown>

    assert.equal(result.userId, 'user-1')
    assert.equal(result.feedbackType, 'useful')
    assert.equal(test.state().creates, 1)
  })

  it('isolates feedback by the active user', async () => {
    const test = harness({
      activeUserId: 'user-2',
      researchUserId: 'user-1',
    })

    await assert.rejects(
      () => test.service.submit('lead-1', usefulFeedback),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'LEAD_RESEARCH_NOT_FOUND',
    )
    assert.equal(test.state().records.size, 0)
  })

  it('returns not found when LeadResearch does not exist', async () => {
    const test = harness({ researchExists: false })
    await assert.rejects(
      () => test.service.submit('lead-1', usefulFeedback),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'LEAD_RESEARCH_NOT_FOUND',
    )
  })

  it('updates a repeated user feedback instead of creating a duplicate', async () => {
    const test = harness()
    await test.service.submit('lead-1', usefulFeedback)
    const updated = (await test.service.submit('lead-1', {
      rating: 2,
      feedbackType: 'not_useful',
      comment: '行业判断需要改进',
    })) as Record<string, unknown>

    assert.equal(test.state().creates, 1)
    assert.equal(test.state().updates, 1)
    assert.equal(test.state().records.size, 1)
    assert.equal(updated.feedbackType, 'not_useful')
  })

  it('returns the saved feedback through the API controller', async () => {
    const saved = {
      id: 'feedback-1',
      leadResearchId: 'research-1',
      userId: 'user-1',
      ...usefulFeedback,
    }
    const controller = createSubmitLeadResearchFeedbackController({
      submit: async (leadId, input) => {
        assert.equal(leadId, 'lead-1')
        assert.deepEqual(input, usefulFeedback)
        return saved
      },
    })
    let statusCode = 0
    let payload: unknown
    const request = {
      params: { id: 'lead-1' },
      body: usefulFeedback,
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
    assert.equal(statusCode, 201)
    assert.deepEqual(payload, { data: saved })
  })
})
