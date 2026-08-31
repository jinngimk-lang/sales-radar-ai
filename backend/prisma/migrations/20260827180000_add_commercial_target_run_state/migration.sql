ALTER TABLE "CommercialTarget"
ADD COLUMN "lastRunStatus" TEXT,
ADD COLUMN "lastRunStartedAt" TIMESTAMP(3),
ADD COLUMN "lastRunCompletedAt" TIMESTAMP(3),
ADD COLUMN "lastRunSourceCount" INTEGER,
ADD COLUMN "lastRunSignalCount" INTEGER,
ADD COLUMN "lastRunErrorCode" TEXT;

ALTER TABLE "CommercialTarget"
ADD CONSTRAINT "CommercialTarget_lastRunStatus_check"
CHECK (
  "lastRunStatus" IS NULL OR
  "lastRunStatus" IN ('RUNNING', 'COMPLETED', 'FAILED')
);

ALTER TABLE "CommercialTarget"
ADD CONSTRAINT "CommercialTarget_lastRunSourceCount_check"
CHECK ("lastRunSourceCount" IS NULL OR "lastRunSourceCount" >= 0);

ALTER TABLE "CommercialTarget"
ADD CONSTRAINT "CommercialTarget_lastRunSignalCount_check"
CHECK ("lastRunSignalCount" IS NULL OR "lastRunSignalCount" >= 0);
