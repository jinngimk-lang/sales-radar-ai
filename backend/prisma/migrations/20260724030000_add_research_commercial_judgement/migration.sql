ALTER TABLE "LeadResearch"
ADD COLUMN "leadQuality" TEXT NOT NULL DEFAULT 'low',
ADD COLUMN "leadCategory" TEXT NOT NULL DEFAULT 'content',
ADD COLUMN "salesRecommendation" TEXT NOT NULL DEFAULT 'ignore',
ADD COLUMN "qualityReason" TEXT NOT NULL DEFAULT 'Unknown';
