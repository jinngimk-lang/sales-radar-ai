import { Platform, Region } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  createSearchTask,
  getSearchTask,
  getSearchTaskOpportunities,
  getSearchTaskResults,
  processSearchTask,
} from '../services/search-task.service.js'
import { AppError } from '../utils/app-error.js'
import { globalSearchIntelligence } from '../services/global-search-intelligence.service.js'
import { providerHealthService } from '../services/provider-health.service.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'

function parseEnumArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !allowed.includes(item as T))) {
    throw new AppError(400, 'VALIDATION_ERROR', `${fieldName} contains unsupported values`)
  }
  return value as T[]
}

export const createSearchTaskController: RequestHandler = async (
  request,
  response,
) => {
  const keyword =
    typeof request.body?.keyword === 'string' ? request.body.keyword.trim() : ''

  if (!keyword) {
    throw new AppError(400, 'VALIDATION_ERROR', 'keyword is required')
  }

  await providerHealthService.requireAgentReach()

  const requestedProductContext = parseProductContext(
    request.body?.productContext,
  )
  const strategy = await globalSearchIntelligence.createStrategy(
    keyword,
    requestedProductContext,
  )
  const productContext = effectiveProductContext(
    requestedProductContext,
    strategy,
  )
  const requestedRegions = parseEnumArray(
    request.body?.regions,
    Object.values(Region),
    'regions',
  )
  const inferredRegion = Object.values(Region).includes(
    strategy.intent.region as Region,
  )
    ? [strategy.intent.region as Region]
    : []

  const task = await createSearchTask({
    keyword: globalSearchIntelligence.optimizedKeyword(strategy, keyword),
    platforms: parseEnumArray(
      request.body?.platforms,
      Object.values(Platform),
      'platforms',
    ),
    regions:
      requestedRegions.length > 0 ? requestedRegions : inferredRegion,
    productContext,
  })

  setImmediate(() => {
    void processSearchTask(task.id).catch((error: unknown) => {
      console.error(`Search task ${task.id} failed`, error)
    })
  })

  response.status(202).json({ data: task, strategy })
}

export const getSearchTaskController: RequestHandler = async (
  request,
  response,
) => {
  const task = await getSearchTask(request.params.id)

  if (!task) {
    throw new AppError(404, 'SEARCH_TASK_NOT_FOUND', 'Search task not found')
  }

  response.json({ data: task })
}

export const getSearchTaskResultsController: RequestHandler = async (
  request,
  response,
) => {
  const results = await getSearchTaskResults(request.params.id)
  response.json({ data: results, meta: { total: results.length } })
}

export const getSearchTaskOpportunitiesController: RequestHandler = async (
  request,
  response,
) => {
  const opportunities = await getSearchTaskOpportunities(request.params.id)
  response.json({
    data: opportunities,
    meta: { total: opportunities.length },
  })
}

function parseProductContext(value: unknown) {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'productContext must be an object',
    )
  }

  const source = value as Record<string, unknown>
  const context = {
    product: readOptionalString(source.product, 'productContext.product'),
    industry: readOptionalString(source.industry, 'productContext.industry'),
    region: readOptionalString(source.region, 'productContext.region'),
    country: readOptionalString(source.country, 'productContext.country'),
    customerType: readOptionalString(
      source.customerType,
      'productContext.customerType',
    ),
    businessProblem: readOptionalString(
      source.businessProblem,
      'productContext.businessProblem',
    ),
    buyingSignals: readOptionalStringArray(
      source.buyingSignals,
      'productContext.buyingSignals',
    ),
  }

  return Object.values(context).some(Boolean) ? context : undefined
}

function readOptionalStringArray(value: unknown, fieldName: string) {
  if (value === undefined || value === null) return undefined
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string')
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', `${fieldName} must be a string array`)
  }
  const values = value.map((item) => item.trim()).filter(Boolean)
  return values.length > 0 ? values : undefined
}

function effectiveProductContext(
  requested: SearchProductContext | undefined,
  strategy: Awaited<
    ReturnType<typeof globalSearchIntelligence.createStrategy>
  >,
): SearchProductContext {
  const known = (value: string) =>
    value && value !== 'Unknown' ? value : undefined

  return {
    product: known(strategy.intent.product),
    customerType: strategy.intent.customerType,
    industry: known(strategy.intent.industry),
    region: known(strategy.intent.region),
    country: known(strategy.intent.country),
    businessProblem: known(strategy.intent.businessProblem),
    buyingSignals: strategy.intent.buyingSignals,
  }
}

function readOptionalString(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', `${fieldName} must be a string`)
  }
  return value.trim() || undefined
}
