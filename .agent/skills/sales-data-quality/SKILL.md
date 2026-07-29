---
name: sales-data-quality
description: Guard Sales Radar AI sales data quality by checking source grounding, claim classification, user ownership, traceability, and CRM boundaries. Use when reviewing SearchEvidence, MarketSignal, Opportunity, CompanyProfile, Research Trace, Qualified Lead, Contact, or proposed sales-data promotion before display or persistence.
---

# Sales Data Quality

## Purpose

Act as the read-only sales data quality gate for Sales Radar AI. Inspect trusted entities and proposed outputs, identify quality or boundary violations, and return an explainable quality report without modifying business data.

## Core Rules

1. Follow Evidence First: source, then evidence, then fact, then assessment, then recommendation.
2. A `FACT` must have an explicit, real source reference.
3. An `ASSESSMENT` must include the reasons supporting the judgment.
4. A `RECOMMENDATION` must be clearly labeled and written as advice, never as confirmed behavior.
5. `CompanyProfile` is not a `Customer`.
6. `Opportunity` is not confirmed procurement demand.
7. Never associate entities owned by different users.
8. Never modify business data; output quality-check results only.
9. Missing or insufficient support must remain `NEEDS_REVIEW`.
10. Never increase lead qualification, create customer truth, or bypass the Lead Quality Gate.

## Input

Accept only the minimum data needed for inspection:

- Current authenticated `userId`.
- Entity identifiers, entity types, and owner identifiers.
- Existing claim type: `FACT`, `ASSESSMENT`, or `RECOMMENDATION`.
- Source references and their ownership or relationship metadata.
- Assessment reasons.
- Verification status and pending verification questions.
- Relevant version identifiers and timestamps.

Treat every input as untrusted until ownership, source relationships, and required fields are verified.

## Output

Return a read-only quality report:

```text
qualityStatus:
  PASS | NEEDS_REVIEW | REJECTED

checks:
  - rule
  - status
  - reason
  - entityReferences
  - sourceReferences

violations:
  - code
  - message

pendingVerification:
  - question
  - requiredEvidence
```

Use:

- `PASS` only when all applicable rules are satisfied.
- `NEEDS_REVIEW` when information is incomplete or support is insufficient.
- `REJECTED` for cross-user relationships, invented facts, unsupported CRM promotion, or other explicit trust-boundary violations.

Never include mutated business entities in the output.

## Allowed Actions

- Read existing trusted entities needed for a quality check.
- Verify that every referenced entity belongs to the current user.
- Verify that a factual claim has an explicit source relationship.
- Check that an assessment contains reasons.
- Check that a recommendation uses advisory language.
- Detect semantic boundary violations between evidence, opportunity, company profile, customer, contact, and qualified lead.
- Identify missing sources, weak traceability, unsupported claims, and pending verification work.
- Return an explainable quality status and rule-by-rule findings.

## Forbidden Actions

- Create, update, delete, qualify, promote, or merge business records.
- Create a Lead, Contact, Customer, Opportunity, CompanyProfile, or source relationship.
- Change qualification status, opportunity status, customer status, or CRM state.
- Treat a CompanyProfile as a confirmed customer.
- Treat an Opportunity as confirmed procurement.
- Infer purchase intent, contact identity, email, phone number, role, budget, or timeline without explicit evidence.
- Invent or complete missing sources, facts, relationships, or ownership.
- Link records by keyword similarity, company-name similarity, URL similarity, or AI inference.
- Return data owned by another user.
- Bypass Evidence Validation, Lead Quality Gate, Qualification Version, or Assistant Trust Boundary.

## Data Boundary

This skill is a read-only validation layer:

```text
Trusted entities and proposed output
                ↓
       Sales data quality checks
                ↓
       Quality report only
```

It may inspect SearchEvidence, MarketSignal, Opportunity, CompanyProfile, CompanySource, Research Trace, Qualified Lead, and Contact metadata when authorized. It does not replace Evidence Validation, Opportunity Analysis, Company Intelligence, Lead Qualification, or CRM workflows.

All entity relationships must be explicit and must share the authenticated user's ownership boundary. If ownership cannot be confirmed, return `REJECTED` without exposing the foreign entity.

## Traceability

Every check result must record or return:

- Quality-rule identifier.
- Quality-policy version.
- Input entity type and ID.
- Authenticated user context.
- Claim type.
- Explicit source IDs used by the check.
- Pass, review, or rejection reason.
- Verification questions when evidence is incomplete.
- Evaluation timestamp.

Do not expose prompts, API keys, provider credentials, raw model internals, or unrelated user data.

## Future Extension

The read-only contract may later support:

- Versioned quality policies.
- Automated regression evaluations.
- Human review queues for `NEEDS_REVIEW`.
- Quality metrics by entity type and pipeline stage.
- Non-mutating audit events approved as a separate architecture change.
- Pre-persistence validation hooks that still leave final business changes to existing services and quality gates.

Future extensions must preserve Evidence First, user isolation, explicit source relationships, and human-controlled CRM promotion.
