-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('MANUFACTURER', 'INTEGRATOR', 'DISTRIBUTOR', 'SOFTWARE_COMPANY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CompanyIdentityStatus" AS ENUM ('UNKNOWN', 'PARTIAL', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyAnalysisStatus" AS ENUM ('DRAFT', 'READY', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "CompanySourceType" AS ENUM ('OFFICIAL_WEBSITE', 'SEARCH_EVIDENCE', 'NEWS', 'COMPANY_ANNOUNCEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "normalizedDomain" TEXT,
    "officialWebsite" TEXT,
    "country" TEXT,
    "region" TEXT,
    "industry" TEXT,
    "companyType" "CompanyType" NOT NULL DEFAULT 'UNKNOWN',
    "identityStatus" "CompanyIdentityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "identityConfidence" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessModel" TEXT,
    "analysisStatus" "CompanyAnalysisStatus" NOT NULL DEFAULT 'DRAFT',
    "analysisVersion" TEXT NOT NULL DEFAULT 'v1',
    "provider" TEXT,
    "model" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "currentSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySource" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "searchEvidenceId" TEXT,
    "opportunityId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "CompanySourceType" NOT NULL,
    "excerpt" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyIntelligenceSnapshot" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "productProfileId" TEXT,
    "productContextSnapshot" JSONB NOT NULL,
    "identitySnapshot" JSONB NOT NULL,
    "understandingSnapshot" JSONB NOT NULL,
    "relevanceAssessment" JSONB NOT NULL,
    "researchHints" JSONB NOT NULL,
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "analysisVersion" TEXT NOT NULL DEFAULT 'v1',
    "provider" TEXT,
    "model" TEXT,
    "analysisStatus" "CompanyAnalysisStatus" NOT NULL DEFAULT 'DRAFT',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "analysisKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyIntelligenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyOpportunity" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_currentSnapshotId_key" ON "CompanyProfile"("currentSnapshotId");

-- CreateIndex
CREATE INDEX "CompanyProfile_userId_normalizedDomain_idx" ON "CompanyProfile"("userId", "normalizedDomain");

-- CreateIndex
CREATE INDEX "CompanyProfile_userId_analysisStatus_updatedAt_idx" ON "CompanyProfile"("userId", "analysisStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_identityKey_key" ON "CompanyProfile"("userId", "identityKey");

-- CreateIndex
CREATE INDEX "CompanySource_companyProfileId_capturedAt_idx" ON "CompanySource"("companyProfileId", "capturedAt");

-- CreateIndex
CREATE INDEX "CompanySource_searchEvidenceId_idx" ON "CompanySource"("searchEvidenceId");

-- CreateIndex
CREATE INDEX "CompanySource_opportunityId_idx" ON "CompanySource"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySource_companyProfileId_sourceHash_key" ON "CompanySource"("companyProfileId", "sourceHash");

-- CreateIndex
CREATE INDEX "CompanyIntelligenceSnapshot_companyProfileId_createdAt_idx" ON "CompanyIntelligenceSnapshot"("companyProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyIntelligenceSnapshot_opportunityId_idx" ON "CompanyIntelligenceSnapshot"("opportunityId");

-- CreateIndex
CREATE INDEX "CompanyIntelligenceSnapshot_productProfileId_idx" ON "CompanyIntelligenceSnapshot"("productProfileId");

-- CreateIndex
CREATE INDEX "CompanyIntelligenceSnapshot_analysisStatus_createdAt_idx" ON "CompanyIntelligenceSnapshot"("analysisStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyIntelligenceSnapshot_companyProfileId_analysisKey_key" ON "CompanyIntelligenceSnapshot"("companyProfileId", "analysisKey");

-- CreateIndex
CREATE INDEX "CompanyOpportunity_companyProfileId_createdAt_idx" ON "CompanyOpportunity"("companyProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyOpportunity_opportunityId_relationshipType_idx" ON "CompanyOpportunity"("opportunityId", "relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyOpportunity_companyProfileId_opportunityId_relations_key" ON "CompanyOpportunity"("companyProfileId", "opportunityId", "relationshipType");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_currentSnapshotId_fkey" FOREIGN KEY ("currentSnapshotId") REFERENCES "CompanyIntelligenceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_searchEvidenceId_fkey" FOREIGN KEY ("searchEvidenceId") REFERENCES "SearchEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIntelligenceSnapshot" ADD CONSTRAINT "CompanyIntelligenceSnapshot_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIntelligenceSnapshot" ADD CONSTRAINT "CompanyIntelligenceSnapshot_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIntelligenceSnapshot" ADD CONSTRAINT "CompanyIntelligenceSnapshot_productProfileId_fkey" FOREIGN KEY ("productProfileId") REFERENCES "ProductProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOpportunity" ADD CONSTRAINT "CompanyOpportunity_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyOpportunity" ADD CONSTRAINT "CompanyOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain constraints
ALTER TABLE "CompanyProfile"
ADD CONSTRAINT "CompanyProfile_identityConfidence_check"
CHECK ("identityConfidence" BETWEEN 0 AND 100);

ALTER TABLE "CompanyProfile"
ADD CONSTRAINT "CompanyProfile_currentVersion_check"
CHECK ("currentVersion" >= 0);

ALTER TABLE "CompanySource"
ADD CONSTRAINT "CompanySource_confidence_check"
CHECK ("confidence" BETWEEN 0 AND 100);

ALTER TABLE "CompanyIntelligenceSnapshot"
ADD CONSTRAINT "CompanyIntelligenceSnapshot_confidence_check"
CHECK ("confidence" BETWEEN 0 AND 100);

-- A snapshot is an append-only historical record. Deletion remains possible so
-- tenant and CompanyProfile cascade cleanup can still work.
CREATE FUNCTION "prevent_company_intelligence_snapshot_update"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'CompanyIntelligenceSnapshot is immutable; create a new version instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CompanyIntelligenceSnapshot_prevent_update"
BEFORE UPDATE ON "CompanyIntelligenceSnapshot"
FOR EACH ROW
EXECUTE FUNCTION "prevent_company_intelligence_snapshot_update"();
