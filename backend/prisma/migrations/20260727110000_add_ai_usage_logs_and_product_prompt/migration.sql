CREATE TABLE "AIUsageLog" (
  "id" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIUsageLog_taskType_createdAt_idx"
ON "AIUsageLog"("taskType", "createdAt");

CREATE INDEX "AIUsageLog_provider_success_createdAt_idx"
ON "AIUsageLog"("provider", "success", "createdAt");

INSERT INTO "PromptTemplate" (
  "id",
  "name",
  "taskType",
  "template",
  "version",
  "createdAt",
  "updatedAt"
) VALUES (
  'prompt_product_understanding_v1',
  'Product Understanding v1',
  'PRODUCT_UNDERSTANDING',
  'You are a B2B global sales product analysis expert. Analyze the supplied product description and return structured JSON containing product classification, industry, applications, buyer personas, decision-maker roles, target countries, buyer search keywords, channel keywords, buying signals, customer pain points, and value angles. Do not invent companies, customers, contacts, or procurement events. Return JSON only.',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
