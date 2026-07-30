-- RadarAssessment is an immutable interpretation snapshot.
-- It deliberately has no relation to Opportunity, Lead, or CRM entities.
CREATE TYPE "RadarEntityRole" AS ENUM (
  'END_CUSTOMER',
  'SUPPLIER',
  'PARTNER',
  'DISTRIBUTOR',
  'COMPETITOR',
  'UNKNOWN'
);

CREATE TYPE "RadarCustomerGoal" AS ENUM (
  'FIND_BUYERS',
  'FIND_SUPPLIERS',
  'FIND_PARTNERS',
  'FIND_DISTRIBUTORS',
  'RESEARCH_COMPETITORS',
  'EXPLORE_MARKET',
  'UNKNOWN'
);

CREATE TYPE "RadarAssessmentDecision" AS ENUM (
  'OPPORTUNITY_CREATED',
  'POTENTIAL_OPPORTUNITY',
  'MARKET_SIGNAL_ONLY',
  'NEEDS_REVIEW',
  'BLOCKED'
);

CREATE TYPE "RadarRecommendedAction" AS ENUM (
  'CONTACT_RESEARCH',
  'VERIFY_ENTITY',
  'VERIFY_ROLE',
  'CHECK_PARTNERSHIP',
  'MONITOR_SIGNAL',
  'REVIEW_SOURCE',
  'NO_ACTION'
);

CREATE TYPE "RadarRiskLevel" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TABLE "RadarAssessment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "searchTaskId" TEXT NOT NULL,
  "searchEvidenceId" TEXT NOT NULL,
  "assessmentVersion" TEXT NOT NULL,
  "detectionVersion" TEXT NOT NULL,
  "contextHash" TEXT NOT NULL,
  "userIntentSnapshot" JSONB NOT NULL,
  "entityRole" "RadarEntityRole" NOT NULL,
  "customerGoal" "RadarCustomerGoal" NOT NULL,
  "decision" "RadarAssessmentDecision" NOT NULL,
  "recommendedAction" "RadarRecommendedAction" NOT NULL,
  "confidenceScore" INTEGER NOT NULL,
  "matchScore" INTEGER NOT NULL,
  "riskLevel" "RadarRiskLevel" NOT NULL,
  "reasonCodes" JSONB NOT NULL,
  "scoreBreakdown" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RadarAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RadarAssessment_confidenceScore_check"
    CHECK ("confidenceScore" >= 0 AND "confidenceScore" <= 100),
  CONSTRAINT "RadarAssessment_matchScore_check"
    CHECK ("matchScore" >= 0 AND "matchScore" <= 100),
  CONSTRAINT "RadarAssessment_version_check"
    CHECK (
      length("assessmentVersion") > 0
      AND length("detectionVersion") > 0
      AND length("contextHash") > 0
    )
);

CREATE UNIQUE INDEX "RadarAssessment_evidence_version_context_key"
  ON "RadarAssessment"(
    "searchEvidenceId",
    "assessmentVersion",
    "detectionVersion",
    "contextHash"
  );

CREATE INDEX "RadarAssessment_user_created_idx"
  ON "RadarAssessment"("userId", "createdAt");

CREATE INDEX "RadarAssessment_user_decision_created_idx"
  ON "RadarAssessment"("userId", "decision", "createdAt");

CREATE INDEX "RadarAssessment_task_created_idx"
  ON "RadarAssessment"("searchTaskId", "createdAt");

CREATE INDEX "RadarAssessment_evidence_created_idx"
  ON "RadarAssessment"("searchEvidenceId", "createdAt");

ALTER TABLE "RadarAssessment"
  ADD CONSTRAINT "RadarAssessment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RadarAssessment"
  ADD CONSTRAINT "RadarAssessment_searchTaskId_fkey"
  FOREIGN KEY ("searchTaskId") REFERENCES "SearchTask"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RadarAssessment"
  ADD CONSTRAINT "RadarAssessment_searchEvidenceId_fkey"
  FOREIGN KEY ("searchEvidenceId") REFERENCES "SearchEvidence"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
