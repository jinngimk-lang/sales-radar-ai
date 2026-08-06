import { createHash, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { getRevenueLiveConfig } from '../config/revenue-live.config.js'
import { AppError } from '../utils/app-error.js'

export function verifyRevenueOperatorToken(
  candidate: string | undefined,
  configured: string | undefined,
) {
  if (!candidate || !configured) return false
  const candidateDigest = createHash('sha256').update(candidate).digest()
  const configuredDigest = createHash('sha256').update(configured).digest()
  return timingSafeEqual(candidateDigest, configuredDigest)
}

export const requireRevenueOperator: RequestHandler = (
  request,
  _response,
  next,
) => {
  const { operatorToken } = getRevenueLiveConfig()
  if (!operatorToken) {
    next(
      new AppError(
        503,
        'REVENUE_OPERATOR_NOT_CONFIGURED',
        'Revenue live operator access is not configured',
      ),
    )
    return
  }

  const authorization = request.header('authorization')
  const candidate = authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (!verifyRevenueOperatorToken(candidate, operatorToken)) {
    next(
      new AppError(
        401,
        'REVENUE_OPERATOR_UNAUTHORIZED',
        'Revenue live operator authorization is required',
      ),
    )
    return
  }

  next()
}
