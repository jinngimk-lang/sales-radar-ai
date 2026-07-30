import type { Request, RequestHandler } from 'express'
import { ensureDemoUser } from '../services/demo-user.service.js'
import {
  radarAssessmentPersistence,
  type CreateRadarAssessmentInput,
  type ListRadarAssessmentsInput,
} from '../services/radar-assessment-persistence.service.js'
import { AppError } from '../utils/app-error.js'

interface RadarAssessmentStore {
  createForEvidence(input: CreateRadarAssessmentInput): Promise<unknown>
  listForSearchTask(
    input: ListRadarAssessmentsInput,
  ): Promise<unknown[]>
}

export function createRadarAssessmentController(
  service: RadarAssessmentStore = radarAssessmentPersistence,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const userId = await resolveUserId(request, demoUserResolver)
    const searchEvidenceId = readRequiredString(
      request.body?.searchEvidenceId,
      'searchEvidenceId',
    )
    const assessment = await service.createForEvidence({
      userId,
      searchEvidenceId,
    })

    response.status(201).json({ data: assessment })
  }
}

export function createListRadarAssessmentsController(
  service: RadarAssessmentStore = radarAssessmentPersistence,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const userId = await resolveUserId(request, demoUserResolver)
    const searchTaskId = readRequiredString(
      request.query.searchTaskId,
      'searchTaskId',
    )
    const assessments = await service.listForSearchTask({
      userId,
      searchTaskId,
      includeBlocked: request.query.includeBlocked === 'true',
    })

    response.json({
      data: assessments,
      meta: { total: assessments.length },
    })
  }
}

export const createRadarAssessment =
  createRadarAssessmentController()
export const listRadarAssessments =
  createListRadarAssessmentsController()

async function resolveUserId(
  request: Request,
  demoUserResolver: () => Promise<{ id: string }>,
) {
  const authenticatedRequest = request as Request & {
    user?: { id?: unknown }
  }
  const requestUserId = authenticatedRequest.user?.id
  const localUserId = request.res?.locals?.userId
  const authenticatedUserId =
    typeof requestUserId === 'string' && requestUserId.trim()
      ? requestUserId.trim()
      : typeof localUserId === 'string' && localUserId.trim()
        ? localUserId.trim()
        : null

  if (!authenticatedUserId && process.env.NODE_ENV === 'production') {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required to access Radar assessments',
    )
  }

  return authenticatedUserId ?? (await demoUserResolver()).id
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  throw new AppError(
    400,
    'VALIDATION_ERROR',
    `${field} is required`,
  )
}
