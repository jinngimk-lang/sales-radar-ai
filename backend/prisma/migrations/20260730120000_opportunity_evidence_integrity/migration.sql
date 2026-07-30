CREATE TYPE "OpportunityIntegrityStatus" AS ENUM (
  'EVIDENCE_LINKED',
  'LEGACY_INVALID'
);

ALTER TABLE "Opportunity"
ADD COLUMN "integrityStatus" "OpportunityIntegrityStatus" NOT NULL
DEFAULT 'LEGACY_INVALID';

-- Preserve historical Opportunities, but only mark records with an explicit
-- OpportunityEvidence relationship as safe for current user-facing queries.
UPDATE "Opportunity" opportunity
SET "integrityStatus" = 'EVIDENCE_LINKED'
WHERE EXISTS (
  SELECT 1
  FROM "OpportunityEvidence" evidence
  WHERE evidence."opportunityId" = opportunity."id"
);

CREATE INDEX "Opportunity_userId_integrityStatus_createdAt_idx"
ON "Opportunity"("userId", "integrityStatus", "createdAt");

CREATE INDEX "Opportunity_searchTaskId_integrityStatus_confidence_idx"
ON "Opportunity"("searchTaskId", "integrityStatus", "confidence");
