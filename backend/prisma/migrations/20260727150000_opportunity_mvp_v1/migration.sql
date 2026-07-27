CREATE TYPE "OpportunityType" AS ENUM (
  'COMPANY_EXPANSION',
  'INVESTMENT',
  'DIGITAL_UPGRADE'
);

CREATE TABLE "Opportunity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "searchTaskId" TEXT NOT NULL,
  "type" "OpportunityType" NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "companyName" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "whyItMatters" TEXT NOT NULL,
  "recommendedNextStep" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "productContextSnapshot" JSONB NOT NULL,
  "detectionVersion" TEXT NOT NULL DEFAULT 'v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityEvidence" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "searchEvidenceId" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "confidence" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Opportunity_searchTaskId_dedupeKey_key"
ON "Opportunity"("searchTaskId", "dedupeKey");

CREATE INDEX "Opportunity_userId_createdAt_idx"
ON "Opportunity"("userId", "createdAt");

CREATE INDEX "Opportunity_userId_type_createdAt_idx"
ON "Opportunity"("userId", "type", "createdAt");

CREATE INDEX "Opportunity_searchTaskId_confidence_idx"
ON "Opportunity"("searchTaskId", "confidence");

CREATE UNIQUE INDEX "OpportunityEvidence_opportunityId_searchEvidenceId_key"
ON "OpportunityEvidence"("opportunityId", "searchEvidenceId");

CREATE INDEX "OpportunityEvidence_searchEvidenceId_idx"
ON "OpportunityEvidence"("searchEvidenceId");

ALTER TABLE "Opportunity"
ADD CONSTRAINT "Opportunity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Opportunity"
ADD CONSTRAINT "Opportunity_searchTaskId_fkey"
FOREIGN KEY ("searchTaskId") REFERENCES "SearchTask"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityEvidence"
ADD CONSTRAINT "OpportunityEvidence_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityEvidence"
ADD CONSTRAINT "OpportunityEvidence_searchEvidenceId_fkey"
FOREIGN KEY ("searchEvidenceId") REFERENCES "SearchEvidence"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
