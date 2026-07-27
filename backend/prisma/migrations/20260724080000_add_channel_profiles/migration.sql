CREATE TABLE "ChannelProfile" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "channelType" TEXT NOT NULL DEFAULT 'unknown',
  "companyName" TEXT NOT NULL DEFAULT 'Unknown',
  "industry" TEXT NOT NULL DEFAULT 'Unknown',
  "region" TEXT NOT NULL DEFAULT 'Unknown',
  "website" TEXT NOT NULL DEFAULT 'Unknown',
  "evidence" JSONB NOT NULL,
  "channelScore" INTEGER NOT NULL DEFAULT 0,
  "confidence" INTEGER NOT NULL DEFAULT 0,
  "recommendationReason" TEXT NOT NULL,
  "cooperationStrategy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChannelProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChannelProfile_leadId_key"
ON "ChannelProfile"("leadId");

CREATE INDEX "ChannelProfile_channelType_channelScore_idx"
ON "ChannelProfile"("channelType", "channelScore");

ALTER TABLE "ChannelProfile"
ADD CONSTRAINT "ChannelProfile_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
