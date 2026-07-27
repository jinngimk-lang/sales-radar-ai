ALTER TABLE "Lead"
ADD COLUMN "qualificationVersion" TEXT NOT NULL DEFAULT 'v1';

ALTER TABLE "SearchEvidence"
ADD COLUMN "qualificationVersion" TEXT NOT NULL DEFAULT 'v1';

CREATE INDEX "Lead_userId_qualificationVersion_qualificationStatus_updatedAt_idx"
ON "Lead"("userId", "qualificationVersion", "qualificationStatus", "updatedAt");

CREATE INDEX "SearchEvidence_qualificationVersion_qualificationStatus_createdAt_idx"
ON "SearchEvidence"("qualificationVersion", "qualificationStatus", "createdAt");
