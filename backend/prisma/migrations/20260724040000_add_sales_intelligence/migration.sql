ALTER TABLE "LeadResearch"
ADD COLUMN "companyProfile" JSONB,
ADD COLUMN "buyingSignalDetails" JSONB,
ADD COLUMN "salesAngle" JSONB,
ADD COLUMN "outreachPlan" JSONB,
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'C',
ADD COLUMN "intelligenceVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LeadResearch"
ALTER COLUMN "intelligenceVersion" SET DEFAULT 1;
