CREATE TABLE "LeadResearch" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "companySummary" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "companyType" TEXT NOT NULL,
  "customerPersona" TEXT NOT NULL,
  "painPoints" JSONB NOT NULL,
  "buyingSignals" JSONB NOT NULL,
  "communicationStyle" TEXT NOT NULL,
  "recommendedApproach" TEXT NOT NULL,
  "confidenceScore" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeadResearch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadResearch_leadId_key"
ON "LeadResearch"("leadId");

CREATE INDEX "LeadResearch_createdAt_idx"
ON "LeadResearch"("createdAt");

ALTER TABLE "LeadResearch"
ADD CONSTRAINT "LeadResearch_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
