import type { Request, RequestHandler } from 'express'
import { marketIntelligence } from '../services/market-intelligence/market-intelligence.service.js'
import {
  type MarketResearchSignalFocus,
  type MarketResearchTarget,
} from '../services/market-intelligence/market-web-research.service.js'
import { resilientMarketWebResearch } from '../services/market-intelligence/resilient-market-web-research.service.js'
import { ensureDemoUser } from '../services/demo-user.service.js'
import { AppError } from '../utils/app-error.js'

interface MarketSignalReader {
  listForUser(userId: string): Promise<unknown[]>
}

interface MarketResearchRunner {
  run(userId: string, target: MarketResearchTarget): Promise<unknown>
}

const SIGNAL_FOCUS = new Set<MarketResearchSignalFocus>([
  'ALL',
  'FACTORY_EXPANSION',
  'INVESTMENT',
  'DIGITAL_TRANSFORMATION',
  'HIRING_SIGNAL',
  'POLICY_CHANGE',
  'INDUSTRY_TREND',
])

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

    const userId = authenticatedUserId ?? (await demoUserResolver()).id
    const signals = await service.listForUser(userId)
    response.json({ data: signals, meta: { total: signals.length } })
  }
}

export const listMarketSignalsController =
  createListMarketSignalsController()

export function createRunMarketResearchController(
  service: MarketResearchRunner = resilientMarketWebResearch,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = readAuthenticatedUserId(request)
    const userId = authenticatedUserId ?? (await demoUserResolver()).id
    const target = readResearchTarget(request.body)
    const session = await service.run(userId, target)
    response.status(201).json({ data: session })
  }
}

export const runMarketResearchController =
  createRunMarketResearchController()

function readResearchTarget(value: unknown): MarketResearchTarget {
  const input =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const product = readText(input.product, 200)
  if (!product || product.length < 2) {
    throw new AppError(
      400,
      'MARKET_RESEARCH_PRODUCT_REQUIRED',
      'product must contain at least 2 characters',
    )
  }
  const focus = readText(input.signalFocus, 40) ?? 'ALL'
  if (!SIGNAL_FOCUS.has(focus as MarketResearchSignalFocus)) {
    throw new AppError(
      400,
      'MARKET_RESEARCH_SIGNAL_FOCUS_INVALID',
      'signalFocus is invalid',
    )
  }

  return {
    product,
    industry: readText(input.industry, 120),
    region: readText(input.region, 80),
    customerType: readText(input.customerType, 80),
    signalFocus: focus as MarketResearchSignalFocus,
  }
}

function readText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined
}
