ALTER TABLE "ContactProfile"
ADD COLUMN "contactScore" INTEGER,
ADD COLUMN "priorityRank" INTEGER,
ADD COLUMN "recommendationReason" TEXT;

CREATE INDEX "ContactProfile_leadId_priorityRank_idx"
ON "ContactProfile"("leadId", "priorityRank");
