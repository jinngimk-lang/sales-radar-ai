-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('COMPANY_WEBSITE', 'RSS', 'CAREERS', 'NEWS_MEDIA', 'GOVERNMENT', 'SOCIAL', 'JOB_PLATFORM');

-- CreateEnum
CREATE TYPE "DataSourceTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FAILED', 'DISABLED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "DataSourceHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PublisherVerificationStatus" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'NEEDS_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "SourceAccessMethod" AS ENUM ('HTTP', 'RSS', 'OFFICIAL_API', 'BROWSER_PERMITTED', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceRateLimitStatus" AS ENUM ('CLEAR', 'LIMITED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IngestionTriggerType" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY', 'BACKFILL');

-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "RawDocumentParsingStatus" AS ENUM ('CAPTURED', 'PARSED', 'PARSING_FAILED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "RawDocumentValidationStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'NEEDS_REVIEW', 'REJECTED');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "DataSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalBaseUrl" TEXT NOT NULL,
    "publisherName" TEXT,
    "publisherVerificationStatus" "PublisherVerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "tier" "DataSourceTier" NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "healthStatus" "DataSourceHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "accessMethod" "SourceAccessMethod" NOT NULL,
    "verificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "schedulePolicy" JSONB,
    "credentialReference" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastHttpStatus" INTEGER,
    "rateLimitStatus" "SourceRateLimitStatus" NOT NULL DEFAULT 'UNKNOWN',
    "retryAfter" TIMESTAMP(3),
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastFailureCode" TEXT,
    "registryVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "triggerType" "IngestionTriggerType" NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'PENDING',
    "adapterType" TEXT NOT NULL,
    "adapterVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "retryOfId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "cursorBefore" TEXT,
    "cursorAfter" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "validationEligibleCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "runVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawSourceDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "externalId" TEXT,
    "originalUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "excerpt" TEXT,
    "publisherName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "mimeType" TEXT,
    "language" TEXT,
    "httpStatus" INTEGER,
    "parsingStatus" "RawDocumentParsingStatus" NOT NULL DEFAULT 'CAPTURED',
    "validationStatus" "RawDocumentValidationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionCode" TEXT,
    "revisionOfId" TEXT,
    "rawFormatVersion" TEXT NOT NULL DEFAULT 'v1',
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawSourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSource_userId_status_updatedAt_idx" ON "DataSource"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "DataSource_userId_tier_updatedAt_idx" ON "DataSource"("userId", "tier", "updatedAt");

-- CreateIndex
CREATE INDEX "DataSource_healthStatus_lastHealthCheckAt_idx" ON "DataSource"("healthStatus", "lastHealthCheckAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_userId_sourceType_canonicalBaseUrl_key" ON "DataSource"("userId", "sourceType", "canonicalBaseUrl");

-- CreateIndex
CREATE INDEX "IngestionRun_userId_status_createdAt_idx" ON "IngestionRun"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionRun_dataSourceId_createdAt_idx" ON "IngestionRun"("dataSourceId", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionRun_retryOfId_idx" ON "IngestionRun"("retryOfId");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionRun_dataSourceId_idempotencyKey_key" ON "IngestionRun"("dataSourceId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RawSourceDocument_userId_capturedAt_idx" ON "RawSourceDocument"("userId", "capturedAt");

-- CreateIndex
CREATE INDEX "RawSourceDocument_dataSourceId_canonicalUrl_capturedAt_idx" ON "RawSourceDocument"("dataSourceId", "canonicalUrl", "capturedAt");

-- CreateIndex
CREATE INDEX "RawSourceDocument_ingestionRunId_capturedAt_idx" ON "RawSourceDocument"("ingestionRunId", "capturedAt");

-- CreateIndex
CREATE INDEX "RawSourceDocument_revisionOfId_idx" ON "RawSourceDocument"("revisionOfId");

-- CreateIndex
CREATE INDEX "RawSourceDocument_validationStatus_createdAt_idx" ON "RawSourceDocument"("validationStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawSourceDocument_dataSourceId_contentHash_key" ON "RawSourceDocument"("dataSourceId", "contentHash");

-- CreateIndex
CREATE INDEX "RawSourceDocument_dataSourceId_externalId_idx" ON "RawSourceDocument"("dataSourceId", "externalId");

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_retryOfId_fkey" FOREIGN KEY ("retryOfId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSourceDocument" ADD CONSTRAINT "RawSourceDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSourceDocument" ADD CONSTRAINT "RawSourceDocument_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSourceDocument" ADD CONSTRAINT "RawSourceDocument_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSourceDocument" ADD CONSTRAINT "RawSourceDocument_revisionOfId_fkey" FOREIGN KEY ("revisionOfId") REFERENCES "RawSourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Infrastructure counters and HTTP status values must remain non-negative.
ALTER TABLE "DataSource"
ADD CONSTRAINT "DataSource_failureCount_check"
CHECK ("failureCount" >= 0);

ALTER TABLE "DataSource"
ADD CONSTRAINT "DataSource_lastHttpStatus_check"
CHECK ("lastHttpStatus" IS NULL OR "lastHttpStatus" BETWEEN 100 AND 599);

ALTER TABLE "IngestionRun"
ADD CONSTRAINT "IngestionRun_counts_check"
CHECK (
  "retryCount" >= 0
  AND "fetchedCount" >= 0
  AND "createdCount" >= 0
  AND "duplicateCount" >= 0
  AND "validationEligibleCount" >= 0
  AND "rejectedCount" >= 0
  AND "failedCount" >= 0
);

ALTER TABLE "RawSourceDocument"
ADD CONSTRAINT "RawSourceDocument_httpStatus_check"
CHECK ("httpStatus" IS NULL OR "httpStatus" BETWEEN 100 AND 599);

-- Every run and raw document must stay inside the owning DataSource tenant.
CREATE FUNCTION "validate_ingestion_run_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "DataSource" source
    WHERE source."id" = NEW."dataSourceId"
      AND source."userId" = NEW."userId"
  ) THEN
    RAISE EXCEPTION 'IngestionRun must belong to the DataSource owner';
  END IF;

  IF NEW."retryOfId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "IngestionRun" previous
    WHERE previous."id" = NEW."retryOfId"
      AND previous."userId" = NEW."userId"
      AND previous."dataSourceId" = NEW."dataSourceId"
  ) THEN
    RAISE EXCEPTION 'Ingestion retry must reference a run from the same source and user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IngestionRun_validate_tenant"
BEFORE INSERT OR UPDATE ON "IngestionRun"
FOR EACH ROW
EXECUTE FUNCTION "validate_ingestion_run_tenant"();

CREATE FUNCTION "validate_raw_source_document_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "DataSource" source
    JOIN "IngestionRun" run ON run."id" = NEW."ingestionRunId"
    WHERE source."id" = NEW."dataSourceId"
      AND source."userId" = NEW."userId"
      AND run."dataSourceId" = source."id"
      AND run."userId" = NEW."userId"
  ) THEN
    RAISE EXCEPTION 'RawSourceDocument must belong to the same source, run, and user';
  END IF;

  IF NEW."revisionOfId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "RawSourceDocument" previous
    WHERE previous."id" = NEW."revisionOfId"
      AND previous."userId" = NEW."userId"
      AND previous."dataSourceId" = NEW."dataSourceId"
      AND previous."canonicalUrl" = NEW."canonicalUrl"
  ) THEN
    RAISE EXCEPTION 'RawSourceDocument revision must belong to the same source, user, and canonical URL';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RawSourceDocument_validate_tenant"
BEFORE INSERT ON "RawSourceDocument"
FOR EACH ROW
EXECUTE FUNCTION "validate_raw_source_document_tenant"();

-- Captured raw content is immutable. Changed pages must create new revisions.
CREATE FUNCTION "prevent_raw_source_document_update"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RawSourceDocument is immutable; create a new revision instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RawSourceDocument_prevent_update"
BEFORE UPDATE ON "RawSourceDocument"
FOR EACH ROW
EXECUTE FUNCTION "prevent_raw_source_document_update"();

-- Terminal runs are historical execution records and cannot be rewritten.
CREATE FUNCTION "prevent_terminal_ingestion_run_update"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" IN ('COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED', 'RATE_LIMITED') THEN
    RAISE EXCEPTION 'Terminal IngestionRun is immutable; create a retry run instead';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IngestionRun_prevent_terminal_update"
BEFORE UPDATE ON "IngestionRun"
FOR EACH ROW
EXECUTE FUNCTION "prevent_terminal_ingestion_run_update"();
