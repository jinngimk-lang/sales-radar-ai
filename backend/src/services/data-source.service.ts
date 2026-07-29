import {
  DataSourceStatus,
  type DataSource,
  type DataSourceTier,
  type DataSourceType,
  type Prisma,
  type PublisherVerificationStatus,
  type SourceAccessMethod,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'

export interface CreateDataSourceInput {
  sourceType: DataSourceType
  name: string
  url: string
  tier: DataSourceTier
  accessMethod: SourceAccessMethod
  publisherName?: string
  publisherVerificationStatus?: PublisherVerificationStatus
  verificationRequired?: boolean
  schedulePolicy?: Prisma.InputJsonValue
  credentialReference?: string
  registryVersion?: string
}

export interface DataSourceCreateResult {
  source: DataSource
  created: boolean
}

const allowedTransitions: Record<DataSourceStatus, DataSourceStatus[]> = {
  [DataSourceStatus.NEEDS_REVIEW]: [
    DataSourceStatus.ACTIVE,
    DataSourceStatus.DISABLED,
  ],
  [DataSourceStatus.ACTIVE]: [
    DataSourceStatus.PAUSED,
    DataSourceStatus.FAILED,
    DataSourceStatus.DISABLED,
  ],
  [DataSourceStatus.PAUSED]: [
    DataSourceStatus.ACTIVE,
    DataSourceStatus.DISABLED,
  ],
  [DataSourceStatus.FAILED]: [
    DataSourceStatus.ACTIVE,
    DataSourceStatus.PAUSED,
    DataSourceStatus.DISABLED,
  ],
  [DataSourceStatus.DISABLED]: [],
}

export function canonicalizeSourceUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new AppError(400, 'INVALID_SOURCE_URL', 'Source URL must be valid')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(
      400,
      'INVALID_SOURCE_URL',
      'Source URL must use HTTP or HTTPS',
    )
  }

  parsed.hash = ''
  parsed.hostname = parsed.hostname.toLowerCase()
  parsed.pathname =
    parsed.pathname === '/'
      ? '/'
      : parsed.pathname.replace(/\/+$/, '') || '/'
  return parsed.toString()
}

export class DataSourceService {
  async createSource(
    userId: string,
    input: CreateDataSourceInput,
  ): Promise<DataSourceCreateResult> {
    const name = input.name.trim()
    if (!name) {
      throw new AppError(
        400,
        'INVALID_SOURCE_NAME',
        'Source name is required',
      )
    }

    const canonicalBaseUrl = canonicalizeSourceUrl(input.url)
    const existing = await prisma.dataSource.findUnique({
      where: {
        userId_sourceType_canonicalBaseUrl: {
          userId,
          sourceType: input.sourceType,
          canonicalBaseUrl,
        },
      },
    })
    if (existing) return { source: existing, created: false }

    const source = await prisma.dataSource.create({
      data: {
        userId,
        sourceType: input.sourceType,
        name,
        canonicalBaseUrl,
        publisherName: cleanOptional(input.publisherName),
        publisherVerificationStatus: input.publisherVerificationStatus,
        tier: input.tier,
        accessMethod: input.accessMethod,
        verificationRequired: input.verificationRequired,
        schedulePolicy: input.schedulePolicy,
        credentialReference: cleanOptional(input.credentialReference),
        registryVersion: cleanOptional(input.registryVersion),
      },
    })
    return { source, created: true }
  }

  async listSources(userId: string): Promise<DataSource[]> {
    return prisma.dataSource.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async getSource(userId: string, id: string): Promise<DataSource> {
    const source = await prisma.dataSource.findFirst({
      where: { id, userId },
    })
    if (!source) {
      throw new AppError(404, 'DATA_SOURCE_NOT_FOUND', 'Data source not found')
    }
    return source
  }

  async transitionStatus(
    userId: string,
    id: string,
    nextStatus: DataSourceStatus,
  ): Promise<DataSource> {
    const source = await this.getSource(userId, id)
    if (source.status === nextStatus) return source

    if (!allowedTransitions[source.status].includes(nextStatus)) {
      throw new AppError(
        409,
        'INVALID_DATA_SOURCE_TRANSITION',
        `Cannot transition data source from ${source.status} to ${nextStatus}`,
      )
    }

    if (
      nextStatus === DataSourceStatus.ACTIVE &&
      source.verificationRequired &&
      !['VERIFIED', 'PARTIALLY_VERIFIED'].includes(
        source.publisherVerificationStatus,
      )
    ) {
      throw new AppError(
        409,
        'DATA_SOURCE_REQUIRES_VERIFICATION',
        'Data source must be verified before activation',
      )
    }

    return prisma.dataSource.update({
      where: { id: source.id },
      data: { status: nextStatus },
    })
  }
}

function cleanOptional(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned || undefined
}

export const dataSources = new DataSourceService()
