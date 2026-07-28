-- Snapshot references are historical identifiers. Keeping them as scalar
-- references prevents ProductProfile or Opportunity lifecycle changes from
-- mutating an immutable snapshot.
ALTER TABLE "CompanyIntelligenceSnapshot"
DROP CONSTRAINT "CompanyIntelligenceSnapshot_opportunityId_fkey";

ALTER TABLE "CompanyIntelligenceSnapshot"
DROP CONSTRAINT "CompanyIntelligenceSnapshot_productProfileId_fkey";

-- The current snapshot pointer must always refer to this CompanyProfile.
CREATE FUNCTION "validate_company_profile_current_snapshot"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."currentSnapshotId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "CompanyIntelligenceSnapshot" snapshot
    WHERE snapshot."id" = NEW."currentSnapshotId"
      AND snapshot."companyProfileId" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'Current Company Intelligence snapshot must belong to the same CompanyProfile';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CompanyProfile_validate_current_snapshot"
BEFORE INSERT OR UPDATE OF "currentSnapshotId" ON "CompanyProfile"
FOR EACH ROW
EXECUTE FUNCTION "validate_company_profile_current_snapshot"();

-- CompanySource may stand alone from Evidence or Opportunity, but any optional
-- reference must belong to the same tenant as its CompanyProfile.
CREATE FUNCTION "validate_company_source_tenant"()
RETURNS TRIGGER AS $$
DECLARE
  owner_id TEXT;
BEGIN
  SELECT profile."userId" INTO owner_id
  FROM "CompanyProfile" profile
  WHERE profile."id" = NEW."companyProfileId";

  IF NEW."searchEvidenceId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "SearchEvidence" evidence
    JOIN "SearchTask" task ON task."id" = evidence."searchTaskId"
    WHERE evidence."id" = NEW."searchEvidenceId"
      AND task."userId" = owner_id
  ) THEN
    RAISE EXCEPTION 'CompanySource SearchEvidence must belong to the same user';
  END IF;

  IF NEW."opportunityId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "Opportunity" opportunity
    WHERE opportunity."id" = NEW."opportunityId"
      AND opportunity."userId" = owner_id
  ) THEN
    RAISE EXCEPTION 'CompanySource Opportunity must belong to the same user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CompanySource_validate_tenant"
BEFORE INSERT OR UPDATE ON "CompanySource"
FOR EACH ROW
EXECUTE FUNCTION "validate_company_source_tenant"();

-- Snapshot references are validated at creation and then remain immutable.
CREATE FUNCTION "validate_company_intelligence_snapshot_tenant"()
RETURNS TRIGGER AS $$
DECLARE
  owner_id TEXT;
BEGIN
  SELECT profile."userId" INTO owner_id
  FROM "CompanyProfile" profile
  WHERE profile."id" = NEW."companyProfileId";

  IF NEW."opportunityId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "Opportunity" opportunity
    WHERE opportunity."id" = NEW."opportunityId"
      AND opportunity."userId" = owner_id
  ) THEN
    RAISE EXCEPTION 'Company Intelligence Opportunity must belong to the same user';
  END IF;

  IF NEW."productProfileId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "ProductProfile" product
    WHERE product."id" = NEW."productProfileId"
      AND product."userId" = owner_id
  ) THEN
    RAISE EXCEPTION 'Company Intelligence ProductProfile must belong to the same user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CompanyIntelligenceSnapshot_validate_tenant"
BEFORE INSERT ON "CompanyIntelligenceSnapshot"
FOR EACH ROW
EXECUTE FUNCTION "validate_company_intelligence_snapshot_tenant"();

CREATE FUNCTION "validate_company_opportunity_tenant"()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "CompanyProfile" profile
    JOIN "Opportunity" opportunity ON opportunity."id" = NEW."opportunityId"
    WHERE profile."id" = NEW."companyProfileId"
      AND profile."userId" = opportunity."userId"
  ) THEN
    RAISE EXCEPTION 'CompanyOpportunity must link records owned by the same user';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CompanyOpportunity_validate_tenant"
BEFORE INSERT OR UPDATE ON "CompanyOpportunity"
FOR EACH ROW
EXECUTE FUNCTION "validate_company_opportunity_tenant"();
