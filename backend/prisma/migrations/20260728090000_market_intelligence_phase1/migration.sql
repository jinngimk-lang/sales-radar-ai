-- CreateEnum
CREATE TYPE "MarketSignalType" AS ENUM (
  'FACTORY_EXPANSION',
  'INVESTMENT',
  'DIGITAL_TRANSFORMATION',
  'HIRING_SIGNAL',
  'POLICY_CHANGE',
  'INDUSTRY_TREND'
);

-- CreateTable
CREATE TABLE "MarketSignal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT,
  "companyName" TEXT,
  "country" TEXT,
  "region" TEXT,
  "signalType" "MarketSignalType" NOT NULL,
  "confidence" INTEGER NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketSignal_userId_sourceUrl_signalType_key"
ON "MarketSignal"("userId", "sourceUrl", "signalType");

-- CreateIndex
CREATE INDEX "MarketSignal_userId_detectedAt_idx"
ON "MarketSignal"("userId", "detectedAt");

-- CreateIndex
CREATE INDEX "MarketSignal_userId_signalType_detectedAt_idx"
ON "MarketSignal"("userId", "signalType", "detectedAt");

-- AddForeignKey
ALTER TABLE "MarketSignal"
ADD CONSTRAINT "MarketSignal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
