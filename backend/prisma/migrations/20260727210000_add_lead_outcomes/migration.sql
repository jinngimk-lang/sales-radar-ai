CREATE TYPE "LeadOutcomeStatus" AS ENUM (
    'NEW',
    'CONTACTED',
    'REPLIED',
    'MEETING',
    'QUALIFIED',
    'PROPOSAL',
    'WON',
    'LOST'
);

CREATE TABLE "LeadOutcome" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "LeadOutcomeStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadOutcome_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadOutcome_leadId_key"
ON "LeadOutcome"("leadId");

CREATE INDEX "LeadOutcome_userId_status_idx"
ON "LeadOutcome"("userId", "status");

CREATE INDEX "LeadOutcome_userId_updatedAt_idx"
ON "LeadOutcome"("userId", "updatedAt");

ALTER TABLE "LeadOutcome"
ADD CONSTRAINT "LeadOutcome_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadOutcome"
ADD CONSTRAINT "LeadOutcome_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
