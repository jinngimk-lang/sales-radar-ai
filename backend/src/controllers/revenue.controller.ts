import type { Request, RequestHandler } from 'express'
import { AppError } from '../utils/app-error.js'
import {
  revenuePersistence,
  type RevenueOpportunityCategory,
  type RevenueOpportunityStatus,
} from '../services/revenue-persistence.service.js'
import type { RevenueLedgerStatus } from '../services/revenue-domain.service.js'

const CATEGORIES = new Set<RevenueOpportunityCategory>([
  'OPEN_SOURCE_BOUNTY',
  'SECURITY_BOUNTY',
  'AI_TASK',
  'USER_RESEARCH',
  'AFFILIATE',
  'QUANT_RESEARCH',
  'OTHER',
])
const OPPORTUNITY_STATUSES = new Set<RevenueOpportunityStatus>([
  'DISCOVERED',
  'QUALIFIED',
  'ACTIVE',
  'WAITING',
  'WON',
  'LOST',
  'REJECTED',
])
const LEDGER_STATUSES = new Set<RevenueLedgerStatus>([
  'POTENTIAL',
  'CONFIRMED',
  'PENDING_PAYOUT',
  'PAID',
])

export const getRevenueDashboard: RequestHandler = async (request, response) => {
  const userId = readUserId(request)
  const currency = readOptionalString(request.query.currency) ?? 'USD'
  const dashboard = await revenuePersistence.getDashboard(userId, currency)
  response.json({ data: dashboard })
}

export const createRevenueOpportunity: RequestHandler = async (
  request,
  response,
) => {
  const userId = readUserId(request)
  const category = readEnum(
    request.body?.category,
    'category',
    CATEGORIES,
  )
  const status = request.body?.status
    ? readEnum(request.body.status, 'status', OPPORTUNITY_STATUSES)
    : undefined

  const opportunity = await revenuePersistence.createOpportunity({
    userId,
    title: readRequiredString(request.body?.title, 'title'),
    platform: readRequiredString(request.body?.platform, 'platform'),
    category,
    sourceUrl: readHttpUrl(request.body?.sourceUrl, 'sourceUrl'),
    currency: readOptionalString(request.body?.currency) ?? 'USD',
    payoutMinMinor: readInteger(request.body?.payoutMinMinor, 'payoutMinMinor', 0),
    payoutMaxMinor: readInteger(request.body?.payoutMaxMinor, 'payoutMaxMinor', 0),
    successProbabilityPct: readNumber(
      request.body?.successProbabilityPct,
      'successProbabilityPct',
      0,
      100,
    ),
    estimatedHours: readNumber(request.body?.estimatedHours, 'estimatedHours', 0, 10_000),
    capitalRequiredMinor: readInteger(
      request.body?.capitalRequiredMinor,
      'capitalRequiredMinor',
      0,
    ),
    riskScore: readNumber(request.body?.riskScore, 'riskScore', 0, 100),
    status,
    evidenceSummary: readOptionalString(request.body?.evidenceSummary),
    nextAction: readOptionalString(request.body?.nextAction),
    expiresAt: readOptionalDate(request.body?.expiresAt, 'expiresAt'),
  })

  response.status(201).json({ data: opportunity })
}

export const updateRevenueOpportunity: RequestHandler = async (
  request,
  response,
) => {
  const userId = readUserId(request)
  const status = request.body?.status
    ? readEnum(request.body.status, 'status', OPPORTUNITY_STATUSES)
    : undefined
  const opportunity = await revenuePersistence.updateOpportunity({
    userId,
    id: readRequiredString(request.params.id, 'id'),
    status,
    evidenceSummary: readOptionalString(request.body?.evidenceSummary),
    nextAction: readOptionalString(request.body?.nextAction),
  })
  response.json({ data: opportunity })
}

export const createRevenueLedgerEntry: RequestHandler = async (
  request,
  response,
) => {
  const userId = readUserId(request)
  const status = readEnum(request.body?.status, 'status', LEDGER_STATUSES)
  const entry = await revenuePersistence.createLedgerEntry({
    userId,
    opportunityId: readOptionalString(request.body?.opportunityId),
    amountMinor: readInteger(request.body?.amountMinor, 'amountMinor', 1),
    currency: readOptionalString(request.body?.currency) ?? 'USD',
    status,
    evidenceUrl: request.body?.evidenceUrl
      ? readHttpUrl(request.body.evidenceUrl, 'evidenceUrl')
      : null,
    evidenceNote: readOptionalString(request.body?.evidenceNote),
    recognizedAt:
      readOptionalDate(request.body?.recognizedAt, 'recognizedAt') ?? undefined,
    paidAt: readOptionalDate(request.body?.paidAt, 'paidAt'),
  })
  response.status(201).json({ data: entry })
}

function readUserId(request: Request) {
  const userId = request.res?.locals?.userId
  if (typeof userId === 'string' && userId.trim()) return userId.trim()
  throw new AppError(
    401,
    'AUTHENTICATION_REQUIRED',
    'Authentication is required to access the revenue console',
  )
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  throw new AppError(400, 'VALIDATION_ERROR', `${field} is required`)
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readInteger(
  value: unknown,
  field: string,
  minimum: number,
): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (Number.isInteger(number) && number >= minimum) return number
  throw new AppError(
    400,
    'VALIDATION_ERROR',
    `${field} must be an integer greater than or equal to ${minimum}`,
  )
}

function readNumber(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  const number = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(number) && number >= minimum && number <= maximum) {
    return number
  }
  throw new AppError(
    400,
    'VALIDATION_ERROR',
    `${field} must be between ${minimum} and ${maximum}`,
  )
}

function readEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: Set<T>,
): T {
  if (typeof value === 'string' && allowed.has(value as T)) return value as T
  throw new AppError(400, 'VALIDATION_ERROR', `${field} is invalid`)
}

function readHttpUrl(value: unknown, field: string) {
  const raw = readRequiredString(value, field)
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {
    // handled below
  }
  throw new AppError(400, 'VALIDATION_ERROR', `${field} must be an HTTP URL`)
}

function readOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null || value === '') return null
  const date = new Date(String(value))
  if (!Number.isNaN(date.getTime())) return date
  throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a valid date`)
}
