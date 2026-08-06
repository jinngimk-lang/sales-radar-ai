import type { RequestHandler } from 'express'
import { revenueLiveService } from '../services/revenue-live.service.js'
import { AppError } from '../utils/app-error.js'

export const getRevenueLiveStatus: RequestHandler = async (
  _request,
  response,
) => {
  const userId = readUserId(response.locals.userId)
  const status = await revenueLiveService.getStatus(userId)
  response.json({ data: status })
}

export const startRevenueLiveRun: RequestHandler = async (
  request,
  response,
) => {
  const userId = readUserId(response.locals.userId)
  const opportunityId = readOptionalId(request.body?.opportunityId)
  const status = await revenueLiveService.startRun(userId, opportunityId)
  response.status(202).json({ data: status })
}

export const stopRevenueLiveRun: RequestHandler = async (
  request,
  response,
) => {
  const userId = readUserId(response.locals.userId)
  const runId = readRequiredId(request.params.id, 'id')
  const status = await revenueLiveService.stopRun(userId, runId)
  response.json({ data: status })
}

function readUserId(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  throw new AppError(
    401,
    'AUTHENTICATION_REQUIRED',
    'Authentication is required to access revenue live operations',
  )
}

function readOptionalId(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  return readRequiredId(value, 'opportunityId')
}

function readRequiredId(value: unknown, field: string) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a non-empty string`)
}
