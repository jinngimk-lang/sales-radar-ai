import type { Request, RequestHandler } from 'express'
import { marketIntelligence } from '../services/market-intelligence/market-intelligence.service.js'
import { ensureDemoUser } from '../services/demo-user.service.js'
import { AppError } from '../utils/app-error.js'

interface MarketSignalReader {
  listForUser(userId: string): Promise<unknown[]>
}

function readAuthenticatedUserId(request: Request) {
  const authenticatedRequest = request as Request & {
    user?: { id?: unknown }
  }
  const requestUserId = authenticatedRequest.user?.id
  const localUserId = request.res?.locals?.userId

  if (typeof requestUserId === 'string' && requestUserId.trim()) {
    return requestUserId.trim()
  }
  if (typeof localUserId === 'string' && localUserId.trim()) {
    return localUserId.trim()
  }
  return null
}

export function createListMarketSignalsController(
  service: MarketSignalReader = marketIntelligence,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = readAuthenticatedUserId(request)
    if (!authenticatedUserId && process.env.NODE_ENV === 'production') {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required to access market signals',
      )
    }

    const userId =
      authenticatedUserId ?? (await demoUserResolver()).id
    const signals = await service.listForUser(userId)
    response.json({ data: signals, meta: { total: signals.length } })
  }
}

export const listMarketSignalsController =
  createListMarketSignalsController()
