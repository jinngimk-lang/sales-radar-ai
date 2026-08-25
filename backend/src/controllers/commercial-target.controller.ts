import type { Request, RequestHandler } from 'express'
import {
  commercialTargetService,
  type CommercialTargetInput,
  type CommercialTargetStatus,
  type CommercialTargetUpdate,
} from '../services/commercial-target.service.js'
import {
  MARKET_RESEARCH_GOALS,
  type MarketResearchCommercialGoal,
} from '../services/market-intelligence/commercial-goal.js'
import { AppError } from '../utils/app-error.js'

const TARGET_STATUSES = new Set<CommercialTargetStatus>([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CLOSED',
])

const SIGNAL_FOCUS = new Set([
  'ALL',
  'FACTORY_EXPANSION',
  'INVESTMENT',
  'DIGITAL_TRANSFORMATION',
  'HIRING_SIGNAL',
  'POLICY_CHANGE',
  'INDUSTRY_TREND',
])

const REGIONS = new Set([
  'USA',
  'Europe',
  'SoutheastAsia',
  'China',
  'MiddleEast',
])

const CUSTOMER_TYPES = new Set(['Buyer', 'Agent', 'Company', 'Individual'])

function workspaceUserId(request: Request) {
  const requestUserId = (request as Request & { user?: { id?: unknown } }).user?.id
  const localUserId = request.res?.locals?.userId
  const userId =
    typeof requestUserId === 'string' && requestUserId.trim()
      ? requestUserId.trim()
      : typeof localUserId === 'string' && localUserId.trim()
        ? localUserId.trim()
        : null

  if (!userId) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required to access commercial targets',
    )
  }
  return userId
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined
}

function nullableEnum(
  value: unknown,
  allowed: Set<string>,
  code: string,
  label: string,
) {
  if (value === null || value === undefined || value === '') return null
  const parsed = text(value, 80)
  if (!parsed || !allowed.has(parsed)) {
    throw new AppError(400, code, `${label} is invalid`)
  }
  return parsed
}

export function readCommercialTargetInput(
  value: unknown,
  partial = false,
): CommercialTargetInput | CommercialTargetUpdate {
  const input =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}

  const name = text(input.name, 120)
  const product = text(input.product, 200)
  if (!partial && (!name || name.length < 2)) {
    throw new AppError(400, 'COMMERCIAL_TARGET_NAME_REQUIRED', 'name is required')
  }
  if (!partial && (!product || product.length < 2)) {
    throw new AppError(
      400,
      'COMMERCIAL_TARGET_PRODUCT_REQUIRED',
      'product is required',
    )
  }

  const goalRaw = text(input.goal, 40)
  if (
    (!partial && !goalRaw) ||
    (goalRaw && !MARKET_RESEARCH_GOALS.has(goalRaw as MarketResearchCommercialGoal))
  ) {
    throw new AppError(
      400,
      'COMMERCIAL_TARGET_GOAL_INVALID',
      'goal is invalid',
    )
  }

  const signalFocusRaw = text(input.signalFocus, 40)
  if (signalFocusRaw && !SIGNAL_FOCUS.has(signalFocusRaw)) {
    throw new AppError(
      400,
      'COMMERCIAL_TARGET_SIGNAL_FOCUS_INVALID',
      'signalFocus is invalid',
    )
  }

  const statusRaw = text(input.status, 24)
  if (statusRaw && !TARGET_STATUSES.has(statusRaw as CommercialTargetStatus)) {
    throw new AppError(
      400,
      'COMMERCIAL_TARGET_STATUS_INVALID',
      'status is invalid',
    )
  }

  const parsed: CommercialTargetUpdate = {}
  if (name !== undefined) parsed.name = name
  if (product !== undefined) parsed.product = product
  if (Object.prototype.hasOwnProperty.call(input, 'industry')) {
    parsed.industry = text(input.industry, 120) ?? null
  }
  if (Object.prototype.hasOwnProperty.call(input, 'region')) {
    parsed.region = nullableEnum(
      input.region,
      REGIONS,
      'COMMERCIAL_TARGET_REGION_INVALID',
      'region',
    )
  }
  if (Object.prototype.hasOwnProperty.call(input, 'customerType')) {
    parsed.customerType = nullableEnum(
      input.customerType,
      CUSTOMER_TYPES,
      'COMMERCIAL_TARGET_CUSTOMER_TYPE_INVALID',
      'customerType',
    )
  }
  if (goalRaw) parsed.goal = goalRaw as MarketResearchCommercialGoal
  if (signalFocusRaw) parsed.signalFocus = signalFocusRaw
  if (statusRaw) parsed.status = statusRaw as CommercialTargetStatus
  if (Object.prototype.hasOwnProperty.call(input, 'lastRunAt')) {
    if (input.lastRunAt === null) {
      parsed.lastRunAt = null
    } else if (typeof input.lastRunAt === 'string') {
      const date = new Date(input.lastRunAt)
      if (Number.isNaN(date.getTime())) {
        throw new AppError(
          400,
          'COMMERCIAL_TARGET_LAST_RUN_INVALID',
          'lastRunAt is invalid',
        )
      }
      parsed.lastRunAt = date
    }
  }

  if (partial) return parsed

  return {
    name: name!,
    product: product!,
    industry: parsed.industry,
    region: parsed.region,
    customerType: parsed.customerType,
    goal: goalRaw as MarketResearchCommercialGoal,
    signalFocus: signalFocusRaw ?? 'ALL',
    status: (statusRaw as CommercialTargetStatus | undefined) ?? 'ACTIVE',
  }
}

export const listCommercialTargetsController: RequestHandler = async (
  request,
  response,
) => {
  const targets = await commercialTargetService.list(workspaceUserId(request))
  response.json({ data: targets, meta: { total: targets.length } })
}

export const createCommercialTargetController: RequestHandler = async (
  request,
  response,
) => {
  const target = await commercialTargetService.create(
    workspaceUserId(request),
    readCommercialTargetInput(request.body) as CommercialTargetInput,
  )
  response.status(201).json({ data: target })
}

export const getCommercialTargetController: RequestHandler = async (
  request,
  response,
) => {
  response.json({
    data: await commercialTargetService.get(
      workspaceUserId(request),
      request.params.id ?? '',
    ),
  })
}

export const updateCommercialTargetController: RequestHandler = async (
  request,
  response,
) => {
  response.json({
    data: await commercialTargetService.update(
      workspaceUserId(request),
      request.params.id ?? '',
      readCommercialTargetInput(request.body, true),
    ),
  })
}
