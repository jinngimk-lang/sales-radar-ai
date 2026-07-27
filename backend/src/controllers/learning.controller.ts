import { Industry, Region } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  salesLearningAnalytics,
  type SalesLearningFilters,
} from '../services/sales-learning-analytics.service.js'
import { AppError } from '../utils/app-error.js'
import { salesLearningInsights } from '../services/sales-learning-insight.service.js'

function readFilter<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): T | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Unsupported ${name}`)
  }
  return value as T
}

export const getLearningOverviewController: RequestHandler = async (
  request,
  response,
) => {
  const filters: SalesLearningFilters = {
    industry: readFilter(
      request.query.industry,
      Object.values(Industry),
      'industry',
    ),
    region: readFilter(
      request.query.region,
      Object.values(Region),
      'region',
    ),
  }
  response.json({ data: await salesLearningAnalytics.overview(filters) })
}

export const getLearningProductsController: RequestHandler = async (
  _request,
  response,
) => {
  const products = await salesLearningAnalytics.products()
  response.json({ data: products, meta: { total: products.length } })
}

export const getLearningInsightsController: RequestHandler = async (
  _request,
  response,
) => {
  const insights = await salesLearningInsights.insights()
  response.json({ data: insights, meta: { total: insights.length } })
}
