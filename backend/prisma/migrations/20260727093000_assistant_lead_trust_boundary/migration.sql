-- Production trust states are additive and default to non-qualified.
-- Existing prototype, seed, and legacy rows are preserved but quarantined
-- from production Assistant queries until explicitly verified.
CREATE TYPE "LeadIdentityStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');
CREATE TYPE "LeadEvidenceStatus" AS ENUM ('UNKNOWN', 'VALID', 'INVALID');
CREATE TYPE "LeadQualificationStatus" AS ENUM ('UNQUALIFIED', 'QUALIFIED', 'REJECTED');

ALTER TABLE "Lead"
ADD COLUMN "normalizedDomain" TEXT,
ADD COLUMN "identityStatus" "LeadIdentityStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "evidenceStatus" "LeadEvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "productRelevancePassed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "qualificationStatus" "LeadQualificationStatus" NOT NULL DEFAULT 'UNQUALIFIED';

CREATE INDEX "Lead_userId_qualificationStatus_updatedAt_idx"
ON "Lead"("userId", "qualificationStatus", "updatedAt");

CREATE INDEX "Lead_normalizedDomain_idx"
ON "Lead"("normalizedDomain");
