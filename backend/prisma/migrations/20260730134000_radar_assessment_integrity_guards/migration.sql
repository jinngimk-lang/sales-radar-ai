-- Enforce tenant and SearchEvidence/SearchTask consistency even if a caller
-- bypasses the application service.
CREATE FUNCTION "validate_radar_assessment_ownership"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "SearchEvidence" evidence
    JOIN "SearchTask" task
      ON task."id" = evidence."searchTaskId"
    WHERE evidence."id" = NEW."searchEvidenceId"
      AND evidence."searchTaskId" = NEW."searchTaskId"
      AND task."userId" = NEW."userId"
  ) THEN
    RAISE EXCEPTION 'RadarAssessment must link records from the same user and SearchTask';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RadarAssessment_validate_ownership"
BEFORE INSERT ON "RadarAssessment"
FOR EACH ROW
EXECUTE FUNCTION "validate_radar_assessment_ownership"();

-- An assessment is a historical judgment snapshot. Re-evaluation must insert
-- a new version/context row instead of overwriting the previous judgment.
CREATE FUNCTION "prevent_radar_assessment_update"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RadarAssessment snapshots are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RadarAssessment_prevent_update"
BEFORE UPDATE ON "RadarAssessment"
FOR EACH ROW
EXECUTE FUNCTION "prevent_radar_assessment_update"();
