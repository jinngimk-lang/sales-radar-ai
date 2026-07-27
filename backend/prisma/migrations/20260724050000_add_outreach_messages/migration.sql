CREATE TABLE "OutreachMessage" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutreachMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutreachMessage_leadId_generatedAt_idx"
ON "OutreachMessage"("leadId", "generatedAt");

CREATE INDEX "OutreachMessage_leadId_channel_idx"
ON "OutreachMessage"("leadId", "channel");

ALTER TABLE "OutreachMessage"
ADD CONSTRAINT "OutreachMessage_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
