import {
  IngestionRunStatus,
  type RawDocumentParsingStatus,
  type RawSourceDocument,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { canonicalizeSourceUrl } from './data-source.service.js'

export interface SaveRawSourceDocumentInput {
  dataSourceId: string
  ingestionRunId: string
  externalId?: string
  originalUrl: string
  canonicalUrl?: string
  title?: string
  content?: string
  excerpt?: string
  publisherName?: string
  publishedAt?: Date
  capturedAt?: Date
  contentHash: string
  mimeType?: string
  language?: string
  httpStatus?: number
  parsingStatus?: RawDocumentParsingStatus
  rejectionCode?: string
  rawFormatVersion?: string
  retentionUntil?: Date
}

export interface SaveRawSourceDocumentResult {
  document: RawSourceDocument
  created: boolean
  duplicateReason?: 'CONTENT_HASH' | 'CANONICAL_URL'
}

export class RawSourceDocumentService {
  async saveRawDocument(
    userId: string,
    input: SaveRawSourceDocumentInput,
  ): Promise<SaveRawSourceDocumentResult> {
    const run = await prisma.ingestionRun.findFirst({
      where: {
        id: input.ingestionRunId,
        userId,
        dataSourceId: input.dataSourceId,
      },
    })
    if (!run) {
      throw new AppError(
        404,
        'INGESTION_RUN_NOT_FOUND',
        'Ingestion run not found',
      )
    }
    if (run.status !== IngestionRunStatus.RUNNING) {
      throw new AppError(
        409,
        'INGESTION_RUN_NOT_RUNNING',
        'Raw documents may only be saved while a run is active',
      )
    }

    const originalUrl = canonicalizeSourceUrl(input.originalUrl)
    const canonicalUrl = canonicalizeSourceUrl(
      input.canonicalUrl ?? input.originalUrl,
    )
    const contentHash = normalizeHash(input.contentHash)

    const urlDuplicate = await prisma.rawSourceDocument.findFirst({
      where: {
        userId,
        dataSourceId: input.dataSourceId,
        canonicalUrl,
        contentHash,
      },
    })
    if (urlDuplicate) {
      return {
        document: urlDuplicate,
        created: false,
        duplicateReason: 'CANONICAL_URL',
      }
    }

    const hashDuplicate = await prisma.rawSourceDocument.findUnique({
      where: {
        dataSourceId_contentHash: {
          dataSourceId: input.dataSourceId,
          contentHash,
        },
      },
    })
    if (hashDuplicate) {
      return {
        document: hashDuplicate,
        created: false,
        duplicateReason: 'CONTENT_HASH',
      }
    }

    const latestRevision = await prisma.rawSourceDocument.findFirst({
      where: {
        userId,
        dataSourceId: input.dataSourceId,
        canonicalUrl,
      },
      orderBy: { capturedAt: 'desc' },
    })

    const document = await prisma.rawSourceDocument.create({
      data: {
        userId,
        dataSourceId: input.dataSourceId,
        ingestionRunId: input.ingestionRunId,
        externalId: cleanOptional(input.externalId),
        originalUrl,
        canonicalUrl,
        title: cleanOptional(input.title),
        content: input.content,
        excerpt: input.excerpt,
        publisherName: cleanOptional(input.publisherName),
        publishedAt: input.publishedAt,
        capturedAt: input.capturedAt,
        contentHash,
        mimeType: cleanOptional(input.mimeType),
        language: cleanOptional(input.language),
        httpStatus: input.httpStatus,
        parsingStatus: input.parsingStatus,
        rejectionCode: cleanOptional(input.rejectionCode),
        revisionOfId: latestRevision?.id,
        rawFormatVersion: cleanOptional(input.rawFormatVersion),
        retentionUntil: input.retentionUntil,
      },
    })

    return { document, created: true }
  }

  async listForSource(
    userId: string,
    dataSourceId: string,
  ): Promise<RawSourceDocument[]> {
    const source = await prisma.dataSource.findFirst({
      where: { id: dataSourceId, userId },
      select: { id: true },
    })
    if (!source) {
      throw new AppError(404, 'DATA_SOURCE_NOT_FOUND', 'Data source not found')
    }
    return prisma.rawSourceDocument.findMany({
      where: { userId, dataSourceId },
      orderBy: { capturedAt: 'desc' },
    })
  }
}

function normalizeHash(value: string): string {
  const hash = value.trim().toLowerCase()
  if (!/^[a-f0-9]{32,128}$/.test(hash)) {
    throw new AppError(
      400,
      'INVALID_CONTENT_HASH',
      'Content hash must be a hexadecimal digest',
    )
  }
  return hash
}

function cleanOptional(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim() || undefined
}

export const rawSourceDocuments = new RawSourceDocumentService()
