CREATE TABLE "LeadResearchFeedback" (
    "id" TEXT NOT NULL,
    "leadResearchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadResearchFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadResearchFeedback_leadResearchId_userId_key"
ON "LeadResearchFeedback"("leadResearchId", "userId");

CREATE INDEX "LeadResearchFeedback_userId_createdAt_idx"
ON "LeadResearchFeedback"("userId", "createdAt");

CREATE INDEX "LeadResearchFeedback_feedbackType_createdAt_idx"
ON "LeadResearchFeedback"("feedbackType", "createdAt");

ALTER TABLE "LeadResearchFeedback"
ADD CONSTRAINT "LeadResearchFeedback_leadResearchId_fkey"
FOREIGN KEY ("leadResearchId") REFERENCES "LeadResearch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadResearchFeedback"
ADD CONSTRAINT "LeadResearchFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
