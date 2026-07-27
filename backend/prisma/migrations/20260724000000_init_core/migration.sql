-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('Reddit', 'X', 'Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Xiaohongshu', 'YouTube');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('USA', 'Europe', 'SoutheastAsia', 'China', 'MiddleEast');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('Buyer', 'Agent', 'Company', 'Individual');

-- CreateEnum
CREATE TYPE "IntentLevel" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('IndustrialManufacturing', 'ConsumerElectronics', 'MedicalHealth', 'SaaSSoftware', 'TradeExport', 'BeautyIndustry');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('new', 'contacted', 'engaging', 'won', 'lost');

-- CreateEnum
CREATE TYPE "RecommendedAction" AS ENUM ('contact_now', 'follow_up', 'monitor', 'nurture');

-- CreateEnum
CREATE TYPE "SearchTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AIAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "searchTaskId" TEXT,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "initials" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "customerType" "CustomerType" NOT NULL,
    "postContent" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "country" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "industry" "Industry" NOT NULL,
    "jobTitle" TEXT,
    "company" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "profileUrl" TEXT NOT NULL,
    "interestTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intentScore" INTEGER NOT NULL DEFAULT 0,
    "contactStatus" "FollowUpStatus" NOT NULL DEFAULT 'new',
    "recommendedAction" "RecommendedAction",
    "isFavorited" BOOLEAN NOT NULL DEFAULT false,
    "customTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "platforms" "Platform"[] DEFAULT ARRAY[]::"Platform"[],
    "regions" "Region"[] DEFAULT ARRAY[]::"Region"[],
    "status" "SearchTaskStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "parameters" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "AIAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "model" TEXT,
    "promptVersion" TEXT,
    "intentType" TEXT,
    "intentScore" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestion" TEXT,
    "background" TEXT,
    "need" TEXT,
    "purchaseProbability" "IntentLevel",
    "salesStrategy" TEXT,
    "reasoning" TEXT,
    "needKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedScript" TEXT,
    "contactAdvice" TEXT,
    "profile" JSONB,
    "rawResponse" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_userId_createdAt_idx" ON "Lead"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_userId_intentScore_idx" ON "Lead"("userId", "intentScore");

-- CreateIndex
CREATE INDEX "Lead_userId_contactStatus_idx" ON "Lead"("userId", "contactStatus");

-- CreateIndex
CREATE INDEX "Lead_searchTaskId_idx" ON "Lead"("searchTaskId");

-- CreateIndex
CREATE INDEX "Lead_platform_profileUrl_idx" ON "Lead"("platform", "profileUrl");

-- CreateIndex
CREATE INDEX "SearchTask_userId_createdAt_idx" ON "SearchTask"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchTask_status_createdAt_idx" ON "SearchTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AIAnalysis_leadId_createdAt_idx" ON "AIAnalysis"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AIAnalysis_status_idx" ON "AIAnalysis"("status");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_searchTaskId_fkey" FOREIGN KEY ("searchTaskId") REFERENCES "SearchTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchTask" ADD CONSTRAINT "SearchTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
