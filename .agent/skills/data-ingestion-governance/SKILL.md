---
name: data-ingestion-governance
description: Guard the boundary between DataSource, IngestionRun, RawSourceDocument, and validated Evidence in Sales Radar AI. Use when designing, implementing, reviewing, or testing ingestion infrastructure, adapters, deduplication, raw-data retention, evidence promotion, or ingestion failures.
---

# Data Ingestion Governance

## Purpose

Control how captured market data may proceed toward Evidence Validation.

Maintain:

```text
Source != Raw Data
Raw Data != Evidence
Evidence != Market Signal
Market Signal != Opportunity
Opportunity != Customer
```

## Input

Require:

- Authenticated `userId`.
- Explicit `DataSource` and `IngestionRun` IDs.
- Real original and canonical URLs.
- Captured title, body, or excerpt.
- Publisher and publication metadata when supplied by the source.
- Content hash, capture time, adapter version, and contract version.
- Explicit ownership and revision references.

## Output

Return an ingestion-governance result containing:

- Raw document ID and status.
- Source and run references.
- Duplicate or revision decision.
- Parsing and Evidence-eligibility status.
- Reasons, version, and timestamp.
- `NEEDS_REVIEW` or rejection reason when validation prerequisites are absent.

Do not output a fact, Market Signal, Opportunity, Lead, Contact, Qualified Lead, or Customer.

## Core Rules

- Treat every `RawSourceDocument` as unverified.
- Preserve captured history; create a revision instead of overwriting content.
- Deduplicate only within the same user and explicit DataSource.
- Prefer stable external ID, then exact content hash, then exact canonical URL plus hash.
- Never merge by company name, title, keyword, domain similarity, or fuzzy URL similarity.
- Require Evidence Validation before creating `SearchEvidence`.
- Keep failed, rejected, and duplicate provenance available for audit.
- Never replace ingestion failure with mock, historical, or fabricated data.

## Allowed Actions

- Validate same-user Source, run, raw-document, and revision relationships.
- Normalize explicit URLs without deriving company identity.
- Record Source lifecycle and technical health.
- Start, finish, fail, or retry an ingestion run.
- Save immutable raw documents.
- Identify exact duplicates and explicit revisions.
- Mark raw data eligible, rejected, or requiring review.
- Provide an explicit handoff candidate to Evidence Validation.

## Forbidden Actions

- Create or mutate `SearchEvidence` without Evidence Validation.
- Create a fact, Market Signal, Opportunity, CompanyProfile, Lead, Contact, Qualified Lead, or Customer.
- Treat a successful fetch, HTTP status, title, keyword, or publisher name as factual proof.
- Infer procurement, product need, company action, customer identity, contact identity, budget, project stage, or supplier relationship.
- Associate records across users.
- Bypass Evidence Validation, Opportunity Quality Gate, Lead Quality Gate, or Qualification Version.
- Create a fake SearchTask for scheduled ingestion.
- Store API keys, cookies, passwords, or raw credentials.

## Data Boundary

`DataSource` governs a publisher or entry point.

`IngestionRun` records a collection execution.

`RawSourceDocument` preserves captured material.

`SearchEvidence` is a separate validated entity created only by the Evidence pipeline.

No ingestion entity may point directly to CRM or sales entities.

## Traceability

Record:

- Authenticated user context.
- Source, run, raw-document, and revision IDs.
- Original and canonical URLs.
- Adapter and contract versions.
- Capture and publication times.
- Content hash.
- Status transitions and reasons.
- Duplicate or revision result.
- Evaluation timestamp.

Never expose credentials, Prompt content, model internals, or unrelated tenant data.

## Future Extension

Prepare for:

- Tier 1 newsroom and RSS adapters.
- Careers and job-signal ingestion.
- Industry-news ingestion.
- Object storage and retention policies.
- Human Evidence review queues.
- Explicit RawSourceDocument-to-SearchEvidence linkage.
- Source reliability and freshness controls.

All extensions must preserve the Evidence prerequisite and sales-data quality gates.
