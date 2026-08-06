import { randomUUID } from 'node:crypto'
import { prisma } from '../prisma/client.js'
import {
  calculateRiskAdjustedValue,
  summarizeRevenueLedger,
  type RevenueLedgerStatus,
} from './revenue-domain.service.js'
import { AppError } from '../utils/app-error.js'

export type RevenueOpportunityCategory =
  | 'OPEN_SOURCE_BOUNTY'
  | 'SECURITY_BOUNTY'
  | 'AI_TASK'
  | 'USER_RESEARCH'
  | 'AFFILIATE'
  | 'QUANT_RESEARCH'
  | 'OTHER'

export type RevenueOpportunityStatus =
  | 'DISCOVERED'
  | 'QUALIFIED'
  | 'ACTIVE'
  | 'WAITING'
  | 'WON'
  | 'LOST'
  | 'REJECTED'

export interface CreateRevenueOpportunityInput {
  userId: string
  title: string
  platform: string
  category: RevenueOpportunityCategory
  sourceUrl: string
  currency: string
  payoutMinMinor: number
  payoutMaxMinor: number
  successProbabilityPct: number
  estimatedHours: number
  capitalRequiredMinor: number
  riskScore: number
  status?: RevenueOpportunityStatus
  evidenceSummary?: string | null
  nextAction?: string | null
  expiresAt?: Date | null
}

export interface UpdateRevenueOpportunityInput {
  userId: string
  id: string
  status?: RevenueOpportunityStatus
  evidenceSummary?: string | null
  nextAction?: string | null
}

export interface CreateRevenueLedgerInput {
  userId: string
  opportunityId?: string | null
  amountMinor: number
  currency: string
  status: RevenueLedgerStatus
  evidenceUrl?: string | null
  evidenceNote?: string | null
  recognizedAt?: Date
  paidAt?: Date | null
}

interface RevenueOpportunityRow {
  id: string
  title: string
  platform: string
  category: RevenueOpportunityCategory
  sourceUrl: string
  currency: string
  payoutMinMinor: number
  payoutMaxMinor: number
  successProbabilityPct: number
  estimatedHours: number
  capitalRequiredMinor: number
  riskScore: number
  status: RevenueOpportunityStatus
  evidenceSummary: string | null
  nextAction: string | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface RevenueLedgerRow {
  id: string
  opportunityId: string | null
  amountMinor: number
  currency: string
  status: RevenueLedgerStatus
  evidenceUrl: string | null
  evidenceNote: string | null
  recognizedAt: Date
  paidAt: Date | null
  createdAt: Date
  updatedAt: Date
}

let tableBootstrap: Promise<void> | null = null

export const revenuePersistence = {
  async getDashboard(userId: string, currency: string) {
    await ensureRevenueTables()
    const normalizedCurrency = normalizeCurrency(currency)
    const opportunities = await prisma.$queryRaw<RevenueOpportunityRow[]>`
      SELECT
        "id", "title", "platform", "category", "sourceUrl", "currency",
        "payoutMinMinor", "payoutMaxMinor", "successProbabilityPct",
        "estimatedHours", "capitalRequiredMinor", "riskScore", "status",
        "evidenceSummary", "nextAction", "expiresAt", "createdAt", "updatedAt"
      FROM "RevenueOpportunity"
      WHERE "userId" = ${userId} AND "currency" = ${normalizedCurrency}
      ORDER BY "updatedAt" DESC
    `
    const ledger = await prisma.$queryRaw<RevenueLedgerRow[]>`
      SELECT
        "id", "opportunityId", "amountMinor", "currency", "status",
        "evidenceUrl", "evidenceNote", "recognizedAt", "paidAt",
        "createdAt", "updatedAt"
      FROM "RevenueLedgerEntry"
      WHERE "userId" = ${userId} AND "currency" = ${normalizedCurrency}
      ORDER BY "recognizedAt" DESC, "createdAt" DESC
    `

    const rankedOpportunities = opportunities
      .map((item) => ({
        ...serializeOpportunity(item),
        riskAdjustedValueMinor: calculateRiskAdjustedValue(item),
      }))
      .sort((left, right) => right.riskAdjustedValueMinor - left.riskAdjustedValueMinor)
    const ledgerSummary = summarizeRevenueLedger(ledger, normalizedCurrency)
    const activeStatuses = new Set<RevenueOpportunityStatus>([
      'QUALIFIED',
      'ACTIVE',
      'WAITING',
    ])

    return {
      summary: {
        ...ledgerSummary,
        activeOpportunityCount: opportunities.filter((item) => activeStatuses.has(item.status)).length,
        totalRiskAdjustedValueMinor: rankedOpportunities.reduce(
          (total, item) => total + item.riskAdjustedValueMinor,
          0,
        ),
      },
      opportunities: rankedOpportunities,
      ledger: ledger.map(serializeLedger),
      policy: {
        zeroCapitalDefault: true,
        leverageAllowed: false,
        potentialCountsAsConfirmed: false,
        evidenceRequiredForRecognizedRevenue: true,
      },
    }
  },

  async createOpportunity(input: CreateRevenueOpportunityInput) {
    await ensureRevenueTables()
    const id = randomUUID()
    const [created] = await prisma.$queryRaw<RevenueOpportunityRow[]>`
      INSERT INTO "RevenueOpportunity" (
        "id", "userId", "title", "platform", "category", "sourceUrl",
        "currency", "payoutMinMinor", "payoutMaxMinor",
        "successProbabilityPct", "estimatedHours", "capitalRequiredMinor",
        "riskScore", "status", "evidenceSummary", "nextAction", "expiresAt"
      ) VALUES (
        ${id}, ${input.userId}, ${input.title}, ${input.platform}, ${input.category},
        ${input.sourceUrl}, ${normalizeCurrency(input.currency)}, ${input.payoutMinMinor},
        ${input.payoutMaxMinor}, ${input.successProbabilityPct}, ${input.estimatedHours},
        ${input.capitalRequiredMinor}, ${input.riskScore}, ${input.status ?? 'DISCOVERED'},
        ${input.evidenceSummary ?? null}, ${input.nextAction ?? null}, ${input.expiresAt ?? null}
      )
      RETURNING
        "id", "title", "platform", "category", "sourceUrl", "currency",
        "payoutMinMinor", "payoutMaxMinor", "successProbabilityPct",
        "estimatedHours", "capitalRequiredMinor", "riskScore", "status",
        "evidenceSummary", "nextAction", "expiresAt", "createdAt", "updatedAt"
    `

    if (!created) throw new AppError(500, 'REVENUE_CREATE_FAILED', 'Revenue opportunity was not created')
    return {
      ...serializeOpportunity(created),
      riskAdjustedValueMinor: calculateRiskAdjustedValue(created),
    }
  },

  async updateOpportunity(input: UpdateRevenueOpportunityInput) {
    await ensureRevenueTables()
    const [updated] = await prisma.$queryRaw<RevenueOpportunityRow[]>`
      UPDATE "RevenueOpportunity"
      SET
        "status" = COALESCE(${input.status ?? null}, "status"),
        "evidenceSummary" = COALESCE(${input.evidenceSummary ?? null}, "evidenceSummary"),
        "nextAction" = COALESCE(${input.nextAction ?? null}, "nextAction"),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.id} AND "userId" = ${input.userId}
      RETURNING
        "id", "title", "platform", "category", "sourceUrl", "currency",
        "payoutMinMinor", "payoutMaxMinor", "successProbabilityPct",
        "estimatedHours", "capitalRequiredMinor", "riskScore", "status",
        "evidenceSummary", "nextAction", "expiresAt", "createdAt", "updatedAt"
    `

    if (!updated) throw new AppError(404, 'REVENUE_OPPORTUNITY_NOT_FOUND', 'Revenue opportunity was not found')
    return {
      ...serializeOpportunity(updated),
      riskAdjustedValueMinor: calculateRiskAdjustedValue(updated),
    }
  },

  async createLedgerEntry(input: CreateRevenueLedgerInput) {
    await ensureRevenueTables()
    const evidence = `${input.evidenceUrl ?? ''}${input.evidenceNote ?? ''}`.trim()
    if (input.status !== 'POTENTIAL' && !evidence) {
      throw new AppError(
        400,
        'REVENUE_EVIDENCE_REQUIRED',
        'Confirmed, pending, and paid revenue require evidence',
      )
    }

    if (input.opportunityId) {
      const ownedOpportunity = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "RevenueOpportunity"
        WHERE "id" = ${input.opportunityId} AND "userId" = ${input.userId}
        LIMIT 1
      `
      if (!ownedOpportunity[0]) {
        throw new AppError(
          404,
          'REVENUE_OPPORTUNITY_NOT_FOUND',
          'Revenue opportunity was not found in the active workspace',
        )
      }
    }

    const id = randomUUID()
    const [created] = await prisma.$queryRaw<RevenueLedgerRow[]>`
      INSERT INTO "RevenueLedgerEntry" (
        "id", "userId", "opportunityId", "amountMinor", "currency",
        "status", "evidenceUrl", "evidenceNote", "recognizedAt", "paidAt"
      ) VALUES (
        ${id}, ${input.userId}, ${input.opportunityId ?? null}, ${input.amountMinor},
        ${normalizeCurrency(input.currency)}, ${input.status}, ${input.evidenceUrl ?? null},
        ${input.evidenceNote ?? null}, ${input.recognizedAt ?? new Date()}, ${input.paidAt ?? null}
      )
      RETURNING
        "id", "opportunityId", "amountMinor", "currency", "status",
        "evidenceUrl", "evidenceNote", "recognizedAt", "paidAt",
        "createdAt", "updatedAt"
    `

    if (!created) throw new AppError(500, 'REVENUE_LEDGER_CREATE_FAILED', 'Revenue ledger entry was not created')
    return serializeLedger(created)
  },
}

async function ensureRevenueTables() {
  tableBootstrap ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RevenueOpportunity" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "title" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "sourceUrl" TEXT NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "payoutMinMinor" INTEGER NOT NULL DEFAULT 0,
        "payoutMaxMinor" INTEGER NOT NULL DEFAULT 0,
        "successProbabilityPct" INTEGER NOT NULL DEFAULT 0,
        "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "capitalRequiredMinor" INTEGER NOT NULL DEFAULT 0,
        "riskScore" INTEGER NOT NULL DEFAULT 50,
        "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
        "evidenceSummary" TEXT,
        "nextAction" TEXT,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RevenueLedgerEntry" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "opportunityId" TEXT REFERENCES "RevenueOpportunity"("id") ON DELETE SET NULL,
        "amountMinor" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "status" TEXT NOT NULL,
        "evidenceUrl" TEXT,
        "evidenceNote" TEXT,
        "recognizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "RevenueOpportunity_userId_currency_updatedAt_idx" ON "RevenueOpportunity"("userId", "currency", "updatedAt")',
    )
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "RevenueLedgerEntry_userId_currency_status_idx" ON "RevenueLedgerEntry"("userId", "currency", "status")',
    )
  })().catch((error) => {
    tableBootstrap = null
    throw error
  })
  return tableBootstrap
}

function serializeOpportunity(row: RevenueOpportunityRow) {
  return {
    ...row,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function serializeLedger(row: RevenueLedgerRow) {
  return {
    ...row,
    recognizedAt: row.recognizedAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function normalizeCurrency(currency: string) {
  const normalized = currency.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'USD'
}
