import { randomUUID } from 'node:crypto'
import { prisma } from '../prisma/client.js'
import { revenuePersistence } from './revenue-persistence.service.js'
import { AppError } from '../utils/app-error.js'

export type RevenueLiveRunStatus =
  | 'STARTING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'STOP_REQUESTED'
  | 'STOPPED'
  | 'TIMED_OUT'

export interface RevenueLiveOpportunity {
  id: string
  title: string
  platform: string
  sourceUrl: string
}

export interface RevenueLiveRunRecord {
  id: string
  userId: string
  opportunityId: string | null
  providerRunId: string
  providerSessionId: string | null
  status: RevenueLiveRunStatus
  taskSummary: string
  targetUrl: string
  currentUrl: string | null
  currentTitle: string | null
  messageCursor: string | null
  resultSummary: string | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: Date
  endedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface RevenueLiveEventRecord {
  id: string
  runId: string
  userId: string
  providerMessageId: string
  kind: string
  level: string
  message: string
  detail: string | null
  occurredAt: Date
  createdAt: Date
}

export interface CreateRevenueLiveRunInput {
  userId: string
  opportunityId: string
  providerRunId: string
  status: RevenueLiveRunStatus
  taskSummary: string
  targetUrl: string
}

export interface UpdateRevenueLiveRunInput {
  status?: RevenueLiveRunStatus
  providerSessionId?: string | null
  currentUrl?: string | null
  currentTitle?: string | null
  messageCursor?: string | null
  resultSummary?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  endedAt?: Date | null
}

export interface CreateRevenueLiveEventInput {
  providerMessageId: string
  kind: string
  level: string
  message: string
  detail?: string | null
  occurredAt: Date
}

let liveTableBootstrap: Promise<void> | null = null

export const revenueLivePersistence = {
  async getOpportunityForLiveRun(
    userId: string,
    opportunityId?: string | null,
  ): Promise<RevenueLiveOpportunity | null> {
    await ensureRevenueOpportunityTable(userId)
    const rows = opportunityId
      ? await prisma.$queryRaw<RevenueLiveOpportunity[]>`
          SELECT "id", "title", "platform", "sourceUrl"
          FROM "RevenueOpportunity"
          WHERE "id" = ${opportunityId}
            AND "userId" = ${userId}
            AND "capitalRequiredMinor" = 0
            AND "status" IN ('DISCOVERED', 'QUALIFIED', 'ACTIVE', 'WAITING')
            AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
          LIMIT 1
        `
      : await prisma.$queryRaw<RevenueLiveOpportunity[]>`
          SELECT "id", "title", "platform", "sourceUrl"
          FROM "RevenueOpportunity"
          WHERE "userId" = ${userId}
            AND "capitalRequiredMinor" = 0
            AND "status" IN ('DISCOVERED', 'QUALIFIED', 'ACTIVE', 'WAITING')
            AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
          ORDER BY
            "riskScore" ASC,
            "successProbabilityPct" DESC,
            "payoutMaxMinor" DESC,
            "updatedAt" DESC
          LIMIT 1
        `
    return rows[0] ?? null
  },

  async getActiveRun(userId: string): Promise<RevenueLiveRunRecord | null> {
    await ensureRevenueLiveTables()
    const rows = await prisma.$queryRaw<RevenueLiveRunRecord[]>`
      SELECT *
      FROM "RevenueLiveRun"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `
    return rows[0] ?? null
  },

  async createRun(input: CreateRevenueLiveRunInput) {
    await ensureRevenueLiveTables()
    const id = randomUUID()
    const rows = await prisma.$queryRaw<RevenueLiveRunRecord[]>`
      INSERT INTO "RevenueLiveRun" (
        "id", "userId", "opportunityId", "providerRunId", "status",
        "taskSummary", "targetUrl"
      ) VALUES (
        ${id}, ${input.userId}, ${input.opportunityId}, ${input.providerRunId},
        ${input.status}, ${input.taskSummary}, ${input.targetUrl}
      )
      RETURNING *
    `
    const created = rows[0]
    if (!created) {
      throw new AppError(
        500,
        'REVENUE_LIVE_CREATE_FAILED',
        'Revenue live run was not created',
      )
    }
    return created
  },

  async updateRun(
    userId: string,
    id: string,
    patch: UpdateRevenueLiveRunInput,
  ) {
    await ensureRevenueLiveTables()
    const rows = await prisma.$queryRaw<RevenueLiveRunRecord[]>`
      UPDATE "RevenueLiveRun"
      SET
        "status" = COALESCE(${patch.status ?? null}, "status"),
        "providerSessionId" = COALESCE(${patch.providerSessionId ?? null}, "providerSessionId"),
        "currentUrl" = COALESCE(${patch.currentUrl ?? null}, "currentUrl"),
        "currentTitle" = COALESCE(${patch.currentTitle ?? null}, "currentTitle"),
        "messageCursor" = COALESCE(${patch.messageCursor ?? null}, "messageCursor"),
        "resultSummary" = COALESCE(${patch.resultSummary ?? null}, "resultSummary"),
        "errorCode" = COALESCE(${patch.errorCode ?? null}, "errorCode"),
        "errorMessage" = COALESCE(${patch.errorMessage ?? null}, "errorMessage"),
        "endedAt" = COALESCE(${patch.endedAt ?? null}, "endedAt"),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id} AND "userId" = ${userId}
      RETURNING *
    `
    const updated = rows[0]
    if (!updated) {
      throw new AppError(
        404,
        'REVENUE_LIVE_RUN_NOT_FOUND',
        'Revenue live run was not found',
      )
    }
    return updated
  },

  async addEvents(
    userId: string,
    runId: string,
    events: CreateRevenueLiveEventInput[],
  ) {
    await ensureRevenueLiveTables()
    for (const event of events) {
      await prisma.$executeRaw`
        INSERT INTO "RevenueLiveEvent" (
          "id", "runId", "userId", "providerMessageId", "kind", "level",
          "message", "detail", "occurredAt"
        ) VALUES (
          ${randomUUID()}, ${runId}, ${userId}, ${event.providerMessageId},
          ${event.kind}, ${event.level}, ${event.message}, ${event.detail ?? null},
          ${event.occurredAt}
        )
        ON CONFLICT ("runId", "providerMessageId") DO NOTHING
      `
    }
  },

  async getRunEvents(
    userId: string,
    runId: string,
  ): Promise<RevenueLiveEventRecord[]> {
    await ensureRevenueLiveTables()
    return prisma.$queryRaw<RevenueLiveEventRecord[]>`
      SELECT *
      FROM "RevenueLiveEvent"
      WHERE "userId" = ${userId} AND "runId" = ${runId}
      ORDER BY "occurredAt" ASC, "createdAt" ASC
      LIMIT 250
    `
  },
}

async function ensureRevenueOpportunityTable(userId: string) {
  await revenuePersistence.getDashboard(userId, 'USD')
}

async function ensureRevenueLiveTables() {
  liveTableBootstrap ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RevenueLiveRun" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "opportunityId" TEXT REFERENCES "RevenueOpportunity"("id") ON DELETE SET NULL,
        "providerRunId" TEXT NOT NULL UNIQUE,
        "providerSessionId" TEXT,
        "status" TEXT NOT NULL,
        "taskSummary" TEXT NOT NULL,
        "targetUrl" TEXT NOT NULL,
        "currentUrl" TEXT,
        "currentTitle" TEXT,
        "messageCursor" TEXT,
        "resultSummary" TEXT,
        "errorCode" TEXT,
        "errorMessage" TEXT,
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RevenueLiveEvent" (
        "id" TEXT PRIMARY KEY,
        "runId" TEXT NOT NULL REFERENCES "RevenueLiveRun"("id") ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "providerMessageId" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "level" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "detail" TEXT,
        "occurredAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("runId", "providerMessageId")
      )
    `)
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "RevenueLiveRun_userId_createdAt_idx" ON "RevenueLiveRun"("userId", "createdAt")',
    )
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "RevenueLiveEvent_runId_occurredAt_idx" ON "RevenueLiveEvent"("runId", "occurredAt")',
    )
  })().catch((error) => {
    liveTableBootstrap = null
    throw error
  })
  return liveTableBootstrap
}
