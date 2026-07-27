-- CreateTable
CREATE TABLE "SearchTaskLead" (
    "id" TEXT NOT NULL,
    "searchTaskId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "rankScore" INTEGER NOT NULL DEFAULT 0,
    "matchReason" TEXT,
    "matchEvidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchTaskLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchTaskLead_searchTaskId_rankScore_idx" ON "SearchTaskLead"("searchTaskId", "rankScore");

-- CreateIndex
CREATE INDEX "SearchTaskLead_leadId_idx" ON "SearchTaskLead"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchTaskLead_searchTaskId_leadId_key" ON "SearchTaskLead"("searchTaskId", "leadId");

-- AddForeignKey
ALTER TABLE "SearchTaskLead" ADD CONSTRAINT "SearchTaskLead_searchTaskId_fkey" FOREIGN KEY ("searchTaskId") REFERENCES "SearchTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchTaskLead" ADD CONSTRAINT "SearchTaskLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
