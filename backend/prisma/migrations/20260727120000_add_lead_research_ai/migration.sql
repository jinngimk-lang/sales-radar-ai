ALTER TABLE "LeadResearch"
ADD COLUMN "productProfileId" TEXT,
ADD COLUMN "matchScore" INTEGER,
ADD COLUMN "purchaseLikelihood" TEXT,
ADD COLUMN "industryFit" TEXT,
ADD COLUMN "businessFit" TEXT,
ADD COLUMN "recommendedAngle" TEXT,
ADD COLUMN "contactReason" TEXT,
ADD COLUMN "riskFactors" JSONB,
ADD COLUMN "evidence" JSONB,
ADD COLUMN "provider" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "generatedAt" TIMESTAMP(3);

CREATE INDEX "LeadResearch_productProfileId_idx"
ON "LeadResearch"("productProfileId");

ALTER TABLE "LeadResearch"
ADD CONSTRAINT "LeadResearch_productProfileId_fkey"
FOREIGN KEY ("productProfileId") REFERENCES "ProductProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PromptTemplate" (
  "id",
  "name",
  "taskType",
  "template",
  "version",
  "createdAt",
  "updatedAt"
) VALUES (
  'prompt_lead_research_v1',
  'Lead Research v1',
  'LEAD_RESEARCH',
  'You are a B2B global sales research expert. Using only the supplied Lead and ProductProfile evidence, decide whether this account deserves sales investment. Return JSON with matchScore, purchaseLikelihood, industryFit, businessFit, recommendedAngle, contactReason, riskFactors, and evidence. Do not invent procurement events, contacts, company size, customer needs, or any fact not present in the supplied context. Use Unknown when evidence is insufficient. Return JSON only.',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
