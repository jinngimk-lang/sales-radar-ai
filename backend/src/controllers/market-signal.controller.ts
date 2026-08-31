import type { Request, RequestHandler } from 'express'
import { marketIntelligence } from '../services/market-intelligence/market-intelligence.service.js'
import {
  type MarketResearchSignalFocus,
  type MarketResearchTarget,
} from '../services/market-intelligence/market-web-research.service.js'
import {
  buildCommercialResearchAudience,
  MARKET_RESEARCH_GOALS,
  type MarketResearchCommercialGoal,
} from '../services/market-intelligence/commercial-goal.js'
import { resilientMarketWebResearch } from '../services/market-intelligence/resilient-market-web-research.service.js'
import {
  commercialTargetService,
  type CommercialTargetRecord,
} from '../services/commercial-target.service.js'
import { ensureDemoUser } from '../services/demo-user.service.js'
import { AppError } from '../utils/app-error.js'
import { marketLiveBrowserService } from '../services/market-live-browser.service.js'

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
    const targetId = readText(request.body?.targetId, 160)

    let exactCommercialTargetId: string | null = null
    if (targetId) {
      const persistedTarget = await commercialTargetService.get(userId, targetId)
      if (persistedTarget.status !== 'ACTIVE') {
        throw new AppError(
          409,
          'COMMERCIAL_TARGET_INACTIVE',
          'Commercial target is paused or closed',
        )
      }
      if (matchesCommercialTarget(persistedTarget, request.body)) {
        exactCommercialTargetId = targetId
      }
    }

    if (exactCommercialTargetId) {
      await commercialTargetService.recordRunStarted(
        userId,
        exactCommercialTargetId,
        new Date(),
      )
    }

    try {
      const session = await service.run(userId, target)

      if (exactCommercialTargetId) {
        const { sources, signals } = readMarketResearchRunCollections(session)
        await commercialTargetService.recordRunCompleted(
          userId,
          exactCommercialTargetId,
          {
            completedAt: new Date(),
            sourceCount: sources.length,
            signalCount: signals.length,
          },
        )
      }

      response.status(201).json({ data: session })
    } catch (error) {
      if (exactCommercialTargetId) {
        try {
          await commercialTargetService.recordRunFailed(
            userId,
            exactCommercialTargetId,
            {
              completedAt: new Date(),
              errorCode:
                error instanceof AppError
                  ? error.code
                  : 'MARKET_SCAN_UNAVAILABLE',
            },
          )
        } catch (recordError) {
          console.error(
            '[MarketRadar] Unable to persist commercial target run failure',
            recordError,
          )
        }
      }
      throw error
    }
  }
}

export const runMarketResearchController =
  createRunMarketResearchController()

function readMarketResearchRunCollections(value: unknown) {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const sources = Array.isArray(record.sources) ? record.sources : []
  const signals = Array.isArray(record.signals) ? record.signals : []
  return { sources, signals }
}

export function matchesCommercialTarget(
  persisted: CommercialTargetRecord,
  value: unknown,
) {
  const input =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  return (
    readText(input.product, 200) === persisted.product &&
    nullableText(input.industry, 120) === persisted.industry &&
    nullableText(input.region, 80) === persisted.region &&
    nullableText(input.customerType, 80) === persisted.customerType &&
    readText(input.goal, 40) === persisted.goal &&
    (readText(input.signalFocus, 40) ?? 'ALL') === persisted.signalFocus
  )
}

export function readResearchTarget(value: unknown): MarketResearchTarget {
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

  const customerType = readText(input.customerType, 80)
  const requestedGoal = readText(input.goal, 40)
  if (
    requestedGoal &&
    !MARKET_RESEARCH_GOALS.has(requestedGoal as MarketResearchCommercialGoal)
  ) {
    throw new AppError(
      400,
      'MARKET_RESEARCH_GOAL_INVALID',
      'goal is invalid',
    )
  }

  return {
    product,
    industry: readText(input.industry, 120),
    region: readText(input.region, 80),
    customerType: requestedGoal
      ? buildCommercialResearchAudience(
          requestedGoal as MarketResearchCommercialGoal,
          customerType,
        )
      : customerType,
    signalFocus: focus as MarketResearchSignalFocus,
  }
}

function nullableText(value: unknown, maxLength: number) {
  return readText(value, maxLength) ?? null
}

function readText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined
}

export const startMarketLiveBrowserController: RequestHandler = async (
  request,
  response,
) => {
  const query = readText(request.body?.query, 240)
  const sourceUrl = readText(request.body?.sourceUrl, 2_000)
  if (!query || !sourceUrl) {
    throw new AppError(
      400,
      'MARKET_LIVE_INPUT_REQUIRED',
      'query and sourceUrl are required',
    )
  }
  const result = await marketLiveBrowserService.start({ query, sourceUrl })
  response.set('Cache-Control', 'private, no-store')
  response.status(201).json({ data: result })
}

export const getMarketLiveBrowserController: RequestHandler = async (
  request,
  response,
) => {
  const result = await marketLiveBrowserService.get(request.params.runId ?? '')
  response.set('Cache-Control', 'private, no-store')
  response.json({ data: result })
}
