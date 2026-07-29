import {
  DataSourceHealthStatus,
  DataSourceStatus,
  IngestionRunStatus,
  type IngestionRun,
  type IngestionTriggerType,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'

export interface StartIngestionRunInput {
  dataSourceId: string
  triggerType: IngestionTriggerType
  adapterType: string
  adapterVersion: string
  idempotencyKey: string
  cursorBefore?: string
  runVersion?: string
  retryOfId?: string
}

export interface IngestionRunCounts {
  fetchedCount: number
  createdCount: number
  duplicateCount: number
  validationEligibleCount: number
  rejectedCount: number
  failedCount: number
}

export interface FinishIngestionRunInput extends IngestionRunCounts {
  status?: typeof IngestionRunStatus.COMPLETED | typeof IngestionRunStatus.PARTIAL
  cursorAfter?: string
}

export interface FailIngestionRunInput {
  errorCode: string
  errorSummary?: string
  status?: typeof IngestionRunStatus.FAILED | typeof IngestionRunStatus.RATE_LIMITED
  httpStatus?: number
  retryAfter?: Date
}

const terminalStatuses = new Set<IngestionRunStatus>([
  IngestionRunStatus.COMPLETED,
  IngestionRunStatus.PARTIAL,
  IngestionRunStatus.FAILED,
  IngestionRunStatus.CANCELLED,
  IngestionRunStatus.RATE_LIMITED,
])

export class IngestionRunService {
  async startRun(
    userId: string,
    input: StartIngestionRunInput,
  ): Promise<IngestionRun> {
    const source = await prisma.dataSource.findFirst({
      where: { id: input.dataSourceId, userId },
    })
    if (!source) {
      throw new AppError(404, 'DATA_SOURCE_NOT_FOUND', 'Data source not found')
    }
    if (source.status !== DataSourceStatus.ACTIVE) {
      throw new AppError(
        409,
        'DATA_SOURCE_NOT_ACTIVE',
        'Data source must be active before ingestion',
      )
    }

    const adapterType = required(input.adapterType, 'adapter type')
    const adapterVersion = required(input.adapterVersion, 'adapter version')
    const idempotencyKey = required(input.idempotencyKey, 'idempotency key')

    const existing = await prisma.ingestionRun.findUnique({
      where: {
        dataSourceId_idempotencyKey: {
          dataSourceId: source.id,
          idempotencyKey,
        },
      },
    })
    if (existing) return existing

    let retryCount = 0
    if (input.retryOfId) {
      const previous = await prisma.ingestionRun.findFirst({
        where: {
          id: input.retryOfId,
          userId,
          dataSourceId: source.id,
        },
      })
      if (!previous) {
        throw new AppError(
          404,
          'INGESTION_RUN_NOT_FOUND',
          'Retry source run not found',
        )
      }
      if (!terminalStatuses.has(previous.status)) {
        throw new AppError(
          409,
          'INGESTION_RUN_NOT_TERMINAL',
          'Only terminal ingestion runs may be retried',
        )
      }
      retryCount = previous.retryCount + 1
    }

    return prisma.ingestionRun.create({
      data: {
        userId,
        dataSourceId: source.id,
        triggerType: input.triggerType,
        status: IngestionRunStatus.RUNNING,
        adapterType,
        adapterVersion,
        idempotencyKey,
        retryOfId: input.retryOfId,
        retryCount,
        cursorBefore: cleanOptional(input.cursorBefore),
        runVersion: cleanOptional(input.runVersion),
        startedAt: new Date(),
      },
    })
  }

  async getRun(userId: string, id: string): Promise<IngestionRun> {
    const run = await prisma.ingestionRun.findFirst({
      where: { id, userId },
    })
    if (!run) {
      throw new AppError(
        404,
        'INGESTION_RUN_NOT_FOUND',
        'Ingestion run not found',
      )
    }
    return run
  }

  async finishRun(
    userId: string,
    id: string,
    input: FinishIngestionRunInput,
  ): Promise<IngestionRun> {
    const run = await this.requireRunningRun(userId, id)
    const counts = validateCounts(input)
    const status = input.status ?? IngestionRunStatus.COMPLETED

    return prisma.$transaction(async (transaction) => {
      const completed = await transaction.ingestionRun.update({
        where: { id: run.id },
        data: {
          ...counts,
          status,
          cursorAfter: cleanOptional(input.cursorAfter),
          completedAt: new Date(),
        },
      })
      await transaction.dataSource.update({
        where: { id: run.dataSourceId },
        data: {
          status: DataSourceStatus.ACTIVE,
          healthStatus: DataSourceHealthStatus.HEALTHY,
          lastSuccessAt: new Date(),
          lastHealthCheckAt: new Date(),
          failureCount: 0,
          lastFailureCode: null,
        },
      })
      return completed
    })
  }

  async failRun(
    userId: string,
    id: string,
    input: FailIngestionRunInput,
  ): Promise<IngestionRun> {
    const run = await this.requireRunningRun(userId, id)
    const status = input.status ?? IngestionRunStatus.FAILED
    const errorCode = required(input.errorCode, 'error code')

    return prisma.$transaction(async (transaction) => {
      const failed = await transaction.ingestionRun.update({
        where: { id: run.id },
        data: {
          status,
          errorCode,
          errorSummary: cleanOptional(input.errorSummary)?.slice(0, 2000),
          completedAt: new Date(),
        },
      })
      await transaction.dataSource.update({
        where: { id: run.dataSourceId },
        data: {
          status: DataSourceStatus.FAILED,
          healthStatus: DataSourceHealthStatus.UNAVAILABLE,
          lastFailureAt: new Date(),
          lastHealthCheckAt: new Date(),
          lastHttpStatus: input.httpStatus,
          retryAfter: input.retryAfter,
          failureCount: { increment: 1 },
          lastFailureCode: errorCode,
        },
      })
      return failed
    })
  }

  private async requireRunningRun(
    userId: string,
    id: string,
  ): Promise<IngestionRun> {
    const run = await this.getRun(userId, id)
    if (run.status !== IngestionRunStatus.RUNNING) {
      throw new AppError(
        409,
        'INGESTION_RUN_NOT_RUNNING',
        'Ingestion run is not running',
      )
    }
    return run
  }
}

function validateCounts(input: IngestionRunCounts): IngestionRunCounts {
  const result = {
    fetchedCount: input.fetchedCount,
    createdCount: input.createdCount,
    duplicateCount: input.duplicateCount,
    validationEligibleCount: input.validationEligibleCount,
    rejectedCount: input.rejectedCount,
    failedCount: input.failedCount,
  }
  for (const [field, value] of Object.entries(result)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new AppError(
        400,
        'INVALID_INGESTION_COUNT',
        `${field} must be a non-negative integer`,
      )
    }
  }
  return result
}

function required(value: string, label: string): string {
  const cleaned = value.trim()
  if (!cleaned) {
    throw new AppError(
      400,
      'INVALID_INGESTION_INPUT',
      `${label} is required`,
    )
  }
  return cleaned
}

function cleanOptional(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim() || undefined
}

export const ingestionRuns = new IngestionRunService()
