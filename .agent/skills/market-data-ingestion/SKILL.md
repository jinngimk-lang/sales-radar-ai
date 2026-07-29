---
name: market-data-ingestion
description: Define and review how external market information enters Sales Radar AI through source registration, raw capture, evidence validation, and traceable Market Signal creation. Use when adding or assessing website, RSS, job-board, news, government, LinkedIn, X, Reddit, YouTube, forum, or other market-data sources and adapters.
---

# Market Data Ingestion

## Purpose

Define the trusted entry path for external market information:

```text
External Source
      ↓
Raw Evidence
      ↓
Validated Evidence
      ↓
Market Signal
```

Never create a customer, Lead, Contact, Qualified Lead, or Opportunity directly from an external source.

## Input

Require:

- Authenticated `userId`.
- Registered source ID and source type.
- Source tier and verification requirements.
- Original URL and publisher identity.
- Raw title, body or valid excerpt.
- Published time or captured time.
- Adapter and ingestion-run version.
- Explicit source relationships.

Treat search engines and retrieval providers as discovery mechanisms, not publishers.

## Output

Return a structured ingestion result:

- Raw-content status.
- Evidence-validation status.
- Canonical source reference.
- Source tier.
- Content hash and duplicate status.
- Explicit supported claims.
- Market Signal candidate or `NEEDS_REVIEW`.
- Rejection or verification reasons.
- Trace identifiers and versions.

Do not return or persist unsupported business conclusions.

## Allowed Sources

### Tier 1

- Company newsroom.
- Company announcement.
- Careers page.
- Investor-relations page.
- Government or regulatory announcement.

### Tier 2

- Industry publication.
- News publication.
- Industry association.
- Trade-show announcement.

### Tier 3

- LinkedIn.
- X.
- Reddit.
- YouTube.
- Community forum.
- Other social or user-generated content.

Treat Tier 3 as a discovery lead by default. Require independent corroboration before using it to support an Opportunity candidate.

## Allowed Actions

- Register and classify a source.
- Fetch public information through a permitted adapter.
- Preserve raw content and provenance.
- Normalize URLs and source metadata.
- Detect exact duplicates and content revisions.
- Validate source identity, URL, timestamp, and usable content.
- Create SearchEvidence only after validation.
- Propose a Market Signal candidate from an explicit change event.
- Return `NEEDS_REVIEW` when evidence is incomplete.
- Record traceable ingestion and validation results.

## Forbidden Actions

- Create a Customer, Lead, Contact, Qualified Lead, or Opportunity.
- Confirm procurement, purchase intent, budget, project ownership, or decision makers.
- Generate an event from a title alone.
- Infer company action from keywords.
- Link a company by name, domain, URL, or keyword similarity.
- Treat a search provider as the factual publisher.
- Use a single ordinary social post as company fact.
- Bypass Evidence Validation or Opportunity Quality Gate.
- Cross-link entities owned by different users.
- Replace failed ingestion with mock, historical, or fabricated data.
- Bypass login, access controls, robots rules, or platform restrictions.

## Data Boundary

Keep the layers distinct:

```text
Source          = external publisher or public content endpoint
Raw Evidence    = captured but unverified material
SearchEvidence  = validated, traceable research evidence
MarketSignal    = explicit change event supported by Evidence
Opportunity     = separate commercial-value assessment
```

Enforce:

```text
Source != Evidence
Evidence != Market Signal
Market Signal != Opportunity
Opportunity != Customer
```

Never allow:

```text
Source → Customer
Source → Lead
Source → Qualified Lead
Crawler → Opportunity
```

## Evidence Rules

Require every Market Signal to have:

1. A real URL.
2. An identifiable publisher.
3. Published or captured time.
4. Body content or a valid excerpt.
5. Explicit, same-user Evidence linkage.
6. An event statement supported by that Evidence.

Reject or mark `NEEDS_REVIEW` when any required relationship is absent.

Do not establish relationships through title, keyword, company-name, or URL similarity.

## Social Media Rules

For LinkedIn, X, Reddit, YouTube, and forums:

- Allow discovery and context gathering.
- Distinguish verified company accounts, employees, public users, and anonymous users.
- Verify ownership before treating an account as official.
- Treat employee content as personal public expression unless the company explicitly confirms it.
- Never treat public-user opinion as company fact.
- Never infer procurement from interest, discussion, follows, likes, or comments.
- Require corroboration before promoting a social signal beyond `NEEDS_REVIEW`.

## Traceability

Record:

- Authenticated user context.
- Source registry ID.
- Adapter and adapter version.
- Ingestion run ID.
- Original and canonical URLs.
- Publisher identity and tier.
- Capture and publication times.
- Content hash.
- Raw record, Evidence, and Signal candidate IDs.
- Validation result and reasons.
- Duplicate or revision relationship.
- Evaluation timestamp.

Do not expose credentials, Prompt content, API keys, or unrelated user data.

## Future Extension

Prepare for:

- RSS ingestion.
- Website crawling.
- Social monitoring.
- Job-signal monitoring.
- Regulatory monitoring.
- News and trade-show feeds.
- Object storage for retained raw documents.
- Human review queues.
- Source reliability and freshness policies.

All extensions must preserve explicit provenance, user isolation, and the separation between Market Signal, Opportunity, and CRM entities.
