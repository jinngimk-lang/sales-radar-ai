CREATE FUNCTION "validate_opportunity_evidence_ownership"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Opportunity" opportunity
    JOIN "SearchEvidence" evidence
      ON evidence."id" = NEW."searchEvidenceId"
    JOIN "SearchTask" task
      ON task."id" = evidence."searchTaskId"
    WHERE opportunity."id" = NEW."opportunityId"
      AND opportunity."searchTaskId" = evidence."searchTaskId"
      AND opportunity."userId" = task."userId"
  ) THEN
    RAISE EXCEPTION 'OpportunityEvidence must link records from the same user and SearchTask';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "OpportunityEvidence_validate_ownership"
BEFORE INSERT OR UPDATE ON "OpportunityEvidence"
FOR EACH ROW
EXECUTE FUNCTION "validate_opportunity_evidence_ownership"();

CREATE FUNCTION "sync_opportunity_integrity_after_evidence_write"()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Opportunity"
  SET "integrityStatus" = 'EVIDENCE_LINKED'
  WHERE "id" = NEW."opportunityId";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "OpportunityEvidence_mark_linked"
AFTER INSERT OR UPDATE OF "opportunityId" ON "OpportunityEvidence"
FOR EACH ROW
EXECUTE FUNCTION "sync_opportunity_integrity_after_evidence_write"();

CREATE FUNCTION "sync_opportunity_integrity_after_evidence_delete"()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Opportunity"
  SET "integrityStatus" = 'LEGACY_INVALID'
  WHERE "id" = OLD."opportunityId"
    AND NOT EXISTS (
      SELECT 1
      FROM "OpportunityEvidence" evidence
      WHERE evidence."opportunityId" = OLD."opportunityId"
    );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "OpportunityEvidence_mark_legacy_after_delete"
AFTER DELETE ON "OpportunityEvidence"
FOR EACH ROW
EXECUTE FUNCTION "sync_opportunity_integrity_after_evidence_delete"();
