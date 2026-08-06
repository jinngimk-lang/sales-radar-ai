CREATE TABLE IF NOT EXISTS "RevenueOpportunity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "payoutMinMinor" INTEGER NOT NULL DEFAULT 0,
  "payoutMaxMinor" INTEGER NOT NULL DEFAULT 0,
  "successProbabilityPct" INTEGER NOT NULL DEFAULT 0,
  "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "capitalRequiredMinor" INTEGER NOT NULL DEFAULT 0,
  "riskScore" INTEGER NOT NULL DEFAULT 50,
  "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
  "evidenceSummary" TEXT,
  "nextAction" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevenueOpportunity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RevenueOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RevenueLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "evidenceNote" TEXT,
  "recognizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevenueLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RevenueLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RevenueLedgerEntry_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "RevenueOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RevenueOpportunity_userId_status_updatedAt_idx"
  ON "RevenueOpportunity"("userId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "RevenueOpportunity_userId_currency_updatedAt_idx"
  ON "RevenueOpportunity"("userId", "currency", "updatedAt");
CREATE INDEX IF NOT EXISTS "RevenueLedgerEntry_userId_currency_status_idx"
  ON "RevenueLedgerEntry"("userId", "currency", "status");
CREATE INDEX IF NOT EXISTS "RevenueLedgerEntry_opportunityId_idx"
  ON "RevenueLedgerEntry"("opportunityId");
