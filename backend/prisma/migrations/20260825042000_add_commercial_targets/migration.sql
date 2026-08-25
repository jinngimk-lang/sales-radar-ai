CREATE TABLE "CommercialTarget" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "industry" TEXT,
  "region" TEXT,
  "customerType" TEXT,
  "goal" TEXT NOT NULL,
  "signalFocus" TEXT NOT NULL DEFAULT 'ALL',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommercialTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialTarget_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommercialTarget_goal_check"
    CHECK ("goal" IN (
      'FIND_BUYERS',
      'FIND_SUPPLIERS',
      'FIND_PARTNERS',
      'FIND_DISTRIBUTORS',
      'RESEARCH_COMPETITORS',
      'EXPLORE_MARKET'
    )),
  CONSTRAINT "CommercialTarget_signalFocus_check"
    CHECK ("signalFocus" IN (
      'ALL',
      'FACTORY_EXPANSION',
      'INVESTMENT',
      'DIGITAL_TRANSFORMATION',
      'HIRING_SIGNAL',
      'POLICY_CHANGE',
      'INDUSTRY_TREND'
    )),
  CONSTRAINT "CommercialTarget_status_check"
    CHECK ("status" IN ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED')),
  CONSTRAINT "CommercialTarget_region_check"
    CHECK ("region" IS NULL OR "region" IN ('USA', 'Europe', 'SoutheastAsia', 'China', 'MiddleEast')),
  CONSTRAINT "CommercialTarget_customerType_check"
    CHECK ("customerType" IS NULL OR "customerType" IN ('Buyer', 'Agent', 'Company', 'Individual'))
);

CREATE INDEX "CommercialTarget_userId_status_updatedAt_idx"
  ON "CommercialTarget"("userId", "status", "updatedAt");
CREATE INDEX "CommercialTarget_userId_goal_updatedAt_idx"
  ON "CommercialTarget"("userId", "goal", "updatedAt");
