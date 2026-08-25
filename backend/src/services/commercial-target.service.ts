import { randomUUID } from 'node:crypto'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import type { MarketResearchCommercialGoal } from './market-intelligence/commercial-goal.js'

export type CommercialTargetStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'

export interface CommercialTargetRecord {
  id: string
  userId: string
  name: string
  product: string
  industry: string | null
  region: string | null
  customerType: string | null
  goal: MarketResearchCommercialGoal
  signalFocus: string
  status: CommercialTargetStatus
  lastRunAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CommercialTargetInput {
  name: string
  product: string
  industry?: string | null
  region?: string | null
  customerType?: string | null
  goal: MarketResearchCommercialGoal
  signalFocus: string
  status?: CommercialTargetStatus
  lastRunAt?: Date | null
}

export type CommercialTargetUpdate = Partial<CommercialTargetInput>

export class CommercialTargetService {
  async list(userId: string) {
    return prisma.$queryRaw<CommercialTargetRecord[]>`
      SELECT *
      FROM "CommercialTarget"
      WHERE "userId" = ${userId}
      ORDER BY
        CASE "status"
          WHEN 'ACTIVE' THEN 0
          WHEN 'DRAFT' THEN 1
          WHEN 'PAUSED' THEN 2
          ELSE 3
        END,
        "updatedAt" DESC
    `
  }

  async get(userId: string, id: string) {
    const rows = await prisma.$queryRaw<CommercialTargetRecord[]>`
      SELECT *
      FROM "CommercialTarget"
      WHERE "id" = ${id} AND "userId" = ${userId}
      LIMIT 1
    `
    const target = rows[0]
    if (!target) {
      throw new AppError(
        404,
        'COMMERCIAL_TARGET_NOT_FOUND',
        'Commercial target was not found',
      )
    }
    return target
  }

  async create(userId: string, input: CommercialTargetInput) {
    const id = randomUUID()
    const rows = await prisma.$queryRaw<CommercialTargetRecord[]>`
      INSERT INTO "CommercialTarget" (
        "id",
        "userId",
        "name",
        "product",
        "industry",
        "region",
        "customerType",
        "goal",
        "signalFocus",
        "status",
        "lastRunAt"
      ) VALUES (
        ${id},
        ${userId},
        ${input.name},
        ${input.product},
        ${input.industry ?? null},
        ${input.region ?? null},
        ${input.customerType ?? null},
        ${input.goal},
        ${input.signalFocus},
        ${input.status ?? 'ACTIVE'},
        ${input.lastRunAt ?? null}
      )
      RETURNING *
    `
    return rows[0]
  }

  async update(userId: string, id: string, input: CommercialTargetUpdate) {
    const current = await this.get(userId, id)
    const next = {
      name: input.name ?? current.name,
      product: input.product ?? current.product,
      industry:
        input.industry === undefined ? current.industry : input.industry,
      region: input.region === undefined ? current.region : input.region,
      customerType:
        input.customerType === undefined
          ? current.customerType
          : input.customerType,
      goal: input.goal ?? current.goal,
      signalFocus: input.signalFocus ?? current.signalFocus,
      status: input.status ?? current.status,
      lastRunAt:
        input.lastRunAt === undefined ? current.lastRunAt : input.lastRunAt,
    }

    const rows = await prisma.$queryRaw<CommercialTargetRecord[]>`
      UPDATE "CommercialTarget"
      SET
        "name" = ${next.name},
        "product" = ${next.product},
        "industry" = ${next.industry},
        "region" = ${next.region},
        "customerType" = ${next.customerType},
        "goal" = ${next.goal},
        "signalFocus" = ${next.signalFocus},
        "status" = ${next.status},
        "lastRunAt" = ${next.lastRunAt},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id} AND "userId" = ${userId}
      RETURNING *
    `
    const target = rows[0]
    if (!target) {
      throw new AppError(
        404,
        'COMMERCIAL_TARGET_NOT_FOUND',
        'Commercial target was not found',
      )
    }
    return target
  }
}

export const commercialTargetService = new CommercialTargetService()
