import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  DataSourceStatus,
  DataSourceTier,
  DataSourceType,
  IngestionRunStatus,
  IngestionTriggerType,
  PublisherVerificationStatus,
  RawDocumentParsingStatus,
  SourceAccessMethod,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { DataSourceService } from '../src/services/data-source.service.js'
import { IngestionRunService } from '../src/services/ingestion-run.service.js'
import { RawSourceDocumentService } from '../src/services/raw-source-document.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const dataSourceService = new DataSourceService()
const ingestionRunService = new IngestionRunService()
const rawDocumentService = new RawSourceDocumentService()

let ownerId = ''
let otherUserId = ''
let dataSourceId = ''
let completedRunId = ''
let failedRunId = ''
let retryRunId = ''
let firstDocumentId = ''
let secondDocumentId = ''

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

describe('Market Intelligence Foundation Phase B-1', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `ingestion-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `ingestion-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id
  })

  after(async () => {
    if (ownerId) {
      await prisma.rawSourceDocument.deleteMany({ where: { userId: ownerId } })
      await prisma.ingestionRun.deleteMany({ where: { userId: ownerId } })
      await prisma.dataSource.deleteMany({ where: { userId: ownerId } })
    }
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('creates an isolated source and enforces lifecycle transitions', async () => {
    const created = await dataSourceService.createSource(ownerId, {
      sourceType: DataSourceType.COMPANY_WEBSITE,
      name: 'Verified company newsroom',
      url: `https://example.com/${suffix}/news/#latest`,
      tier: DataSourceTier.TIER_1,
      accessMethod: SourceAccessMethod.HTTP,
      publisherName: 'Example Manufacturing',
      publisherVerificationStatus: PublisherVerificationStatus.VERIFIED,
    })
    dataSourceId = created.source.id

    assert.equal(created.created, true)
    assert.equal(created.source.status, DataSourceStatus.NEEDS_REVIEW)
    assert.equal(created.source.canonicalBaseUrl.includes('#'), false)

    const duplicate = await dataSourceService.createSource(ownerId, {
      sourceType: DataSourceType.COMPANY_WEBSITE,
      name: 'Same source',
      url: `https://example.com/${suffix}/news`,
      tier: DataSourceTier.TIER_1,
      accessMethod: SourceAccessMethod.HTTP,
      publisherVerificationStatus: PublisherVerificationStatus.VERIFIED,
    })
    assert.equal(duplicate.created, false)
    assert.equal(duplicate.source.id, dataSourceId)

    const active = await dataSourceService.transitionStatus(
      ownerId,
      dataSourceId,
      DataSourceStatus.ACTIVE,
    )
    assert.equal(active.status, DataSourceStatus.ACTIVE)
    const paused = await dataSourceService.transitionStatus(
      ownerId,
      dataSourceId,
      DataSourceStatus.PAUSED,
    )
    assert.equal(paused.status, DataSourceStatus.PAUSED)
    await dataSourceService.transitionStatus(
      ownerId,
      dataSourceId,
      DataSourceStatus.ACTIVE,
    )

    await assert.rejects(
      () => dataSourceService.getSource(otherUserId, dataSourceId),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'DATA_SOURCE_NOT_FOUND',
    )
  })

  it('records a run once and completes it with execution counts', async () => {
    const input = {
      dataSourceId,
      triggerType: IngestionTriggerType.MANUAL,
      adapterType: 'company-news-http',
      adapterVersion: 'v1',
      idempotencyKey: `manual-${suffix}`,
    }
    const run = await ingestionRunService.startRun(ownerId, input)
    completedRunId = run.id
    const duplicate = await ingestionRunService.startRun(ownerId, input)

    assert.equal(run.status, IngestionRunStatus.RUNNING)
    assert.equal(duplicate.id, run.id)

    const completed = await ingestionRunService.finishRun(ownerId, run.id, {
      fetchedCount: 2,
      createdCount: 2,
      duplicateCount: 0,
      validationEligibleCount: 0,
      rejectedCount: 0,
      failedCount: 0,
    })
    assert.equal(completed.status, IngestionRunStatus.COMPLETED)
    assert.equal(completed.createdCount, 2)

    await assert.rejects(
      () =>
        ingestionRunService.finishRun(ownerId, run.id, {
          fetchedCount: 2,
          createdCount: 2,
          duplicateCount: 0,
          validationEligibleCount: 0,
          rejectedCount: 0,
          failedCount: 0,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === 'INGESTION_RUN_NOT_RUNNING',
    )
  })

  it('records failed executions and creates retry history without overwriting', async () => {
    const failed = await ingestionRunService.startRun(ownerId, {
      dataSourceId,
      triggerType: IngestionTriggerType.SCHEDULED,
      adapterType: 'company-news-http',
      adapterVersion: 'v1',
      idempotencyKey: `failed-${suffix}`,
    })
    failedRunId = failed.id
    const terminal = await ingestionRunService.failRun(ownerId, failed.id, {
      errorCode: 'SOURCE_UNAVAILABLE',
      errorSummary: 'The publisher endpoint was unavailable.',
      httpStatus: 503,
    })
    assert.equal(terminal.status, IngestionRunStatus.FAILED)

    const failedSource = await dataSourceService.getSource(ownerId, dataSourceId)
    assert.equal(failedSource.status, DataSourceStatus.FAILED)
    assert.equal(failedSource.failureCount, 1)

    await dataSourceService.transitionStatus(
      ownerId,
      dataSourceId,
      DataSourceStatus.ACTIVE,
    )
    const retry = await ingestionRunService.startRun(ownerId, {
      dataSourceId,
      triggerType: IngestionTriggerType.RETRY,
      adapterType: 'company-news-http',
      adapterVersion: 'v1',
      idempotencyKey: `retry-${suffix}`,
      retryOfId: failed.id,
    })
    retryRunId = retry.id
    assert.equal(retry.retryCount, 1)
    assert.equal(retry.retryOfId, failed.id)

    await ingestionRunService.finishRun(ownerId, retry.id, {
      fetchedCount: 0,
      createdCount: 0,
      duplicateCount: 0,
      validationEligibleCount: 0,
      rejectedCount: 0,
      failedCount: 0,
    })
  })

  it('deduplicates exact content while retaining changed URL revisions', async () => {
    const run = await ingestionRunService.startRun(ownerId, {
      dataSourceId,
      triggerType: IngestionTriggerType.MANUAL,
      adapterType: 'company-news-http',
      adapterVersion: 'v1',
      idempotencyKey: `documents-${suffix}`,
    })
    const pageUrl = `https://example.com/${suffix}/news/factory-expansion`
    const firstHash = hash('first captured version')
    const first = await rawDocumentService.saveRawDocument(ownerId, {
      dataSourceId,
      ingestionRunId: run.id,
      originalUrl: pageUrl,
      title: 'Company announces factory expansion',
      content: 'The source page describes an expansion event.',
      contentHash: firstHash,
      parsingStatus: RawDocumentParsingStatus.PARSED,
    })
    firstDocumentId = first.document.id

    const hashDuplicate = await rawDocumentService.saveRawDocument(ownerId, {
      dataSourceId,
      ingestionRunId: run.id,
      originalUrl: `${pageUrl}?tracking=another-location`,
      content: 'The same normalized captured content.',
      contentHash: firstHash,
    })
    assert.equal(hashDuplicate.created, false)
    assert.equal(hashDuplicate.document.id, first.document.id)
    assert.equal(hashDuplicate.duplicateReason, 'CONTENT_HASH')

    const urlDuplicate = await rawDocumentService.saveRawDocument(ownerId, {
      dataSourceId,
      ingestionRunId: run.id,
      originalUrl: pageUrl,
      content: 'The same URL and content hash must remain one raw document.',
      contentHash: firstHash,
    })
    assert.equal(urlDuplicate.created, false)
    assert.equal(urlDuplicate.document.id, first.document.id)
    assert.equal(urlDuplicate.duplicateReason, 'CANONICAL_URL')

    const second = await rawDocumentService.saveRawDocument(ownerId, {
      dataSourceId,
      ingestionRunId: run.id,
      originalUrl: pageUrl,
      title: 'Company updates factory expansion announcement',
      content: 'The source page now contains an updated announcement.',
      contentHash: hash('second captured version'),
      parsingStatus: RawDocumentParsingStatus.PARSED,
    })
    secondDocumentId = second.document.id

    assert.equal(second.created, true)
    assert.equal(second.document.revisionOfId, first.document.id)
    assert.notEqual(second.document.id, first.document.id)

    const preservedFirst = await prisma.rawSourceDocument.findUniqueOrThrow({
      where: { id: first.document.id },
    })
    assert.equal(
      preservedFirst.title,
      'Company announces factory expansion',
    )
    await assert.rejects(() =>
      prisma.rawSourceDocument.update({
        where: { id: first.document.id },
        data: { title: 'Overwritten title' },
      }),
    )

    await ingestionRunService.finishRun(ownerId, run.id, {
      fetchedCount: 4,
      createdCount: 2,
      duplicateCount: 2,
      validationEligibleCount: 0,
      rejectedCount: 0,
      failedCount: 0,
    })
  })

  it('rejects cross-user source and run associations at the database boundary', async () => {
    await assert.rejects(() =>
      prisma.ingestionRun.create({
        data: {
          userId: otherUserId,
          dataSourceId,
          triggerType: IngestionTriggerType.MANUAL,
          status: IngestionRunStatus.RUNNING,
          adapterType: 'invalid-cross-user',
          adapterVersion: 'v1',
          idempotencyKey: `cross-user-${suffix}`,
        },
      }),
    )

    await assert.rejects(() =>
      rawDocumentService.listForSource(otherUserId, dataSourceId),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === 'DATA_SOURCE_NOT_FOUND',
    )
  })

  it('does not create Evidence or modify the existing sales chain', async () => {
    assert.ok(firstDocumentId)
    assert.ok(secondDocumentId)
    assert.ok(completedRunId)
    assert.ok(failedRunId)
    assert.ok(retryRunId)

    const [tasks, evidence, signals, opportunities, leads, contacts] =
      await Promise.all([
        prisma.searchTask.count({ where: { userId: ownerId } }),
        prisma.searchEvidence.count({
          where: { searchTask: { userId: ownerId } },
        }),
        prisma.marketSignal.count({ where: { userId: ownerId } }),
        prisma.opportunity.count({ where: { userId: ownerId } }),
        prisma.lead.count({ where: { userId: ownerId } }),
        prisma.contactProfile.count({
          where: { lead: { userId: ownerId } },
        }),
      ])

    assert.deepEqual(
      { tasks, evidence, signals, opportunities, leads, contacts },
      {
        tasks: 0,
        evidence: 0,
        signals: 0,
        opportunities: 0,
        leads: 0,
        contacts: 0,
      },
    )
  })
})
