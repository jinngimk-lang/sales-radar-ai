ALTER TYPE "Platform" ADD VALUE IF NOT EXISTS 'Website' BEFORE 'Reddit';

CREATE TYPE "SearchEvidenceExtractionStatus" AS ENUM (
  'PENDING',
  'PROCESSED',
  'REJECTED',
  'FAILED'
);

CREATE TABLE "SearchEvidence" (
  "id" TEXT NOT NULL,
  "searchTaskId" TEXT NOT NULL,
  "leadId" TEXT,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "platform" "Platform" NOT NULL,
  "rawUrl" TEXT NOT NULL,
  "profileUrl" TEXT,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "rawMetadata" JSONB,
  "extractionStatus" "SearchEvidenceExtractionStatus" NOT NULL DEFAULT 'PENDING',
  "companyName" TEXT,
  "normalizedDomain" TEXT,
  "website" TEXT,
  "identityConfidence" INTEGER NOT NULL DEFAULT 0,
  "identityStatus" "LeadIdentityStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "evidenceStatus" "LeadEvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
  "productRelevancePassed" BOOLEAN NOT NULL DEFAULT false,
  "qualificationStatus" "LeadQualificationStatus" NOT NULL DEFAULT 'UNQUALIFIED',
  "qualificationReasons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SearchEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchEvidence_searchTaskId_provider_externalId_key"
ON "SearchEvidence"("searchTaskId", "provider", "externalId");

CREATE INDEX "SearchEvidence_searchTaskId_extractionStatus_idx"
ON "SearchEvidence"("searchTaskId", "extractionStatus");

CREATE INDEX "SearchEvidence_leadId_idx"
ON "SearchEvidence"("leadId");

CREATE INDEX "SearchEvidence_qualificationStatus_createdAt_idx"
ON "SearchEvidence"("qualificationStatus", "createdAt");

ALTER TABLE "SearchEvidence"
ADD CONSTRAINT "SearchEvidence_searchTaskId_fkey"
FOREIGN KEY ("searchTaskId") REFERENCES "SearchTask"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SearchEvidence"
ADD CONSTRAINT "SearchEvidence_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
