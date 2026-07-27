CREATE TABLE "ContactProfile" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Unknown',
  "jobTitle" TEXT NOT NULL DEFAULT 'Unknown',
  "company" TEXT NOT NULL DEFAULT 'Unknown',
  "source" TEXT NOT NULL,
  "profileUrl" TEXT NOT NULL DEFAULT 'Unknown',
  "email" TEXT NOT NULL DEFAULT 'Unknown',
  "phone" TEXT NOT NULL DEFAULT 'Unknown',
  "contactRole" TEXT NOT NULL DEFAULT 'unknown',
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContactProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContactProfile_leadId_name_jobTitle_profileUrl_key"
ON "ContactProfile"("leadId", "name", "jobTitle", "profileUrl");

CREATE INDEX "ContactProfile_leadId_confidence_idx"
ON "ContactProfile"("leadId", "confidence");

ALTER TABLE "ContactProfile"
ADD CONSTRAINT "ContactProfile_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
