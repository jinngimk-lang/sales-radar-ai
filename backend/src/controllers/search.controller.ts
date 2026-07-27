import type { RequestHandler } from 'express'
import { globalSearchIntelligence } from '../services/global-search-intelligence.service.js'
import { AppError } from '../utils/app-error.js'
import { providerHealthService } from '../services/provider-health.service.js'

export const getSearchProviderHealthController: RequestHandler = async (
  _request,
  response,
) => {
  const health = await providerHealthService.checkAgentReach()
  response.json({ data: health })
}

export const parseSearchIntentController: RequestHandler = async (
  request,
  response,
) => {
  const input = [request.body?.query, request.body?.text, request.body?.intent]
    .find((value) => typeof value === 'string' && value.trim())

  if (typeof input !== 'string') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'query is required',
    )
  }

  const strategy = await globalSearchIntelligence.createStrategy(input.trim())
  response.json({ data: strategy })
}
