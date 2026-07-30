-- Reconcile records that may have received an explicit Evidence relationship
-- between the status-column migration and the integrity-trigger migration.
UPDATE "Opportunity" opportunity
SET "integrityStatus" = 'EVIDENCE_LINKED'
WHERE EXISTS (
  SELECT 1
  FROM "OpportunityEvidence" evidence
  WHERE evidence."opportunityId" = opportunity."id"
);

UPDATE "Opportunity" opportunity
SET "integrityStatus" = 'LEGACY_INVALID'
WHERE NOT EXISTS (
  SELECT 1
  FROM "OpportunityEvidence" evidence
  WHERE evidence."opportunityId" = opportunity."id"
);
