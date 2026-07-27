-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "sourceMetadata" JSONB;

-- Backfill existing rows before enforcing the required external identifier.
UPDATE "Lead"
SET "externalId" = "id"
WHERE "externalId" IS NULL;

ALTER TABLE "Lead"
ALTER COLUMN "externalId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SearchTask"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "errorCode" TEXT;

-- CreateIndex
CREATE INDEX "Lead_sourceUrl_idx" ON "Lead"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_userId_provider_externalId_key"
ON "Lead"("userId", "provider", "externalId");
