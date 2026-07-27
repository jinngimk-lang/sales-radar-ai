CREATE TABLE "PromptTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromptTemplate_taskType_version_key"
ON "PromptTemplate"("taskType", "version");

CREATE INDEX "PromptTemplate_taskType_updatedAt_idx"
ON "PromptTemplate"("taskType", "updatedAt");
