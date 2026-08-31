-- Communication truth is stored separately from generated outreach and mutable business outcomes.
CREATE TYPE "CommunicationEventType" AS ENUM ('SENT', 'DELIVERED', 'REPLIED', 'MEETING', 'FAILED');
CREATE TYPE "CommunicationVerificationSource" AS ENUM ('PROVIDER_VERIFIED', 'USER_EVIDENCE_VERIFIED');

CREATE TABLE "CommunicationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "outreachMessageId" TEXT,
    "channel" TEXT NOT NULL,
    "eventType" "CommunicationEventType" NOT NULL,
    "verificationSource" "CommunicationVerificationSource" NOT NULL,
    "provider" TEXT,
    "externalEventId" TEXT,
    "evidenceUrl" TEXT,
    "evidenceNote" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationEvent_leadId_channel_eventType_externalEventId_key"
ON "CommunicationEvent"("leadId", "channel", "eventType", "externalEventId");

CREATE INDEX "CommunicationEvent_userId_leadId_occurredAt_idx"
ON "CommunicationEvent"("userId", "leadId", "occurredAt");

CREATE INDEX "CommunicationEvent_leadId_eventType_occurredAt_idx"
ON "CommunicationEvent"("leadId", "eventType", "occurredAt");

CREATE INDEX "CommunicationEvent_outreachMessageId_idx"
ON "CommunicationEvent"("outreachMessageId");

ALTER TABLE "CommunicationEvent"
ADD CONSTRAINT "CommunicationEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationEvent"
ADD CONSTRAINT "CommunicationEvent_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunicationEvent"
ADD CONSTRAINT "CommunicationEvent_outreachMessageId_fkey"
FOREIGN KEY ("outreachMessageId") REFERENCES "OutreachMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
