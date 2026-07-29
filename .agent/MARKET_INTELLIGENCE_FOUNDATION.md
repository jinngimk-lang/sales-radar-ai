# Sales Radar AI Market Intelligence Foundation v1

Status: Proposed  
Scope: Data-entry architecture only; no Prisma, API, Search, Opportunity, Lead, or Contact implementation.

## 1. Foundation Goal

Establish one trusted entry path for future market sources:

```text
Website / RSS / Job Board / News / Government / Social
                            ↓
                    Source Registry
                            ↓
                     Adapter Layer
                            ↓
                    Raw Data Store
                            ↓
                  Evidence Validation
                            ↓
                    SearchEvidence
                            ↓
               Market Signal Extraction
                            ↓
              Opportunity Quality Gate
```

Never implement `crawler → Opportunity` or `source → CRM entity`.

## 2. Source Registry Design

The Source Registry prevents source logic from being hard-coded into business services.

```ts
interface DataSourceRegistry {
  id: string
  userId: string
  name: string
  type:
    | 'WEBSITE'
    | 'RSS'
    | 'SOCIAL'
    | 'JOB_BOARD'
    | 'NEWS'
    | 'GOVERNMENT'
  baseUrl: string
  tier: 1 | 2 | 3
  adapterType: string
  verificationRequired: boolean
  schedule?: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}
```

Rules:

- Verify ownership and user isolation.
- Verify a company domain before registering it as an official source.
- Treat Google, Bing, Baidu, Exa, and AgentReach as discovery providers, not factual publishers.
- Store the final publisher as the source.
- Add a new platform through Registry configuration plus an Adapter, not through changes to Opportunity or Lead services.

## 3. Data Adapter Layer

Define one adapter contract:

```ts
interface MarketSourceAdapter {
  supports(source: DataSourceRegistry): boolean
  fetch(context: IngestionContext): Promise<RawSourceItem[]>
}
```

Adapter responsibilities:

- Fetch permitted public data.
- Preserve external ID and original URL.
- Preserve publisher, publication time, and capture time.
- Return raw content without making sales conclusions.
- Respect rate limits, robots rules, API terms, and authentication boundaries.

Adapters must not:

- Create SearchEvidence directly without validation.
- Create MarketSignal, Opportunity, Lead, or Contact.
- Infer company identity or procurement.

Initial adapters:

1. Company newsroom and announcement pages.
2. RSS and Atom feeds.
3. Public company careers pages and public ATS endpoints.
4. Industry-news feeds.

Future adapters:

- Government and regulatory feeds.
- Trade-show announcements.
- LinkedIn, X, Reddit, YouTube, and forums.

## 4. Raw Data to Evidence to Signal

### RawSourceDocument

Raw data represents captured but unverified material.

Suggested fields:

```text
id
userId
sourceRegistryId
ingestionRunId
externalId
originalUrl
canonicalUrl
publisher
title
content or permitted excerpt
publishedAt
capturedAt
contentHash
parsingStatus
retentionUntil
```

Raw content may contain duplicates, errors, navigation pages, stale pages, or unsupported claims. It must not be shown as a confirmed fact.

### Validated SearchEvidence

Create Evidence only when:

1. A real URL exists.
2. Publisher identity is available.
3. Body content or a valid excerpt exists.
4. Publication or capture time is traceable.
5. The page is not an error, login, navigation, or directory page.
6. The Evidence and source share the authenticated user boundary.
7. The source relationship is explicit.

If the current SearchEvidence model requires SearchTask ownership, do not create fake SearchTasks for scheduled ingestion. Future schema work should support exactly one origin:

```text
SEARCH_TASK
or
INGESTION_RUN
```

### MarketSignal

Extract a Signal only when Evidence explicitly describes a change event:

```text
FUNDING
EXPANSION
NEW_FACTORY
HIRING
DIGITAL_TRANSFORMATION
LEADERSHIP_CHANGE
PARTNERSHIP
```

Never extract:

```text
PURCHASE_INTENT
NEEDS_PRODUCT
BUYING_NOW
```

Signal output must preserve Evidence IDs, event time, source tier, verification status, confidence reasons, and extraction version.

## 5. Source Tier Rules

### Tier 1

Sources:

- Company newsroom.
- Company announcement.
- Careers page.
- Investor-relations page.
- Government or regulatory announcement.

Use as primary Evidence when publisher identity and content are verified.

### Tier 2

Sources:

- Industry media.
- News publications.
- Industry associations.
- Trade-show announcements.

Require original-source detection and转载去重. Prefer corroboration by Tier 1.

### Tier 3

Sources:

- LinkedIn.
- X.
- Reddit.
- YouTube.
- Community forums.
- Other user-generated content.

Default to discovery context. A single Tier 3 item must not produce an Opportunity candidate.

## 6. Social Platform Integration

Model the public author context:

```text
VERIFIED_COMPANY
EMPLOYEE
PUBLIC_USER
ANONYMOUS
```

Rules:

- Verify account ownership before treating it as an official company source.
- Treat employee statements as personal public expression unless explicitly confirmed by the company.
- Treat public and anonymous posts as leads for research only.
- Do not infer procurement from discussion, likes, follows, comments, or product interest.
- Do not guess people, emails, roles, or CompanyProfile relationships.
- Use official APIs or permitted public access; do not bypass login or platform controls.
- Track deletion and stale-content status.
- Require independent corroboration before a social Signal can inform Opportunity assessment.

## 7. Deduplication Strategy

### Raw level

Prefer:

1. External source ID.
2. Canonical URL.
3. Normalized URL.
4. Exact normalized content hash.

Strip tracking parameters but do not merge different pages through fuzzy URL similarity.

### Evidence level

Use:

```text
userId + publisher + canonicalUrl + contentVersion
```

Preserve revisions instead of overwriting historical Evidence.

### Signal level

Candidate fingerprint:

```text
verifiedCompanyProfileId
+ signalType
+ event time bucket
+ primaryEvidenceId
```

Do not merge by company name or keyword. Keep ambiguous records separate and mark them for review.

## 8. Validation Strategy

Validation stages:

1. Source Registry ownership and enablement.
2. URL, publisher, and access validation.
3. Content and timestamp validation.
4. Duplicate and revision detection.
5. Evidence creation.
6. Explicit event extraction.
7. Market Signal evaluation.
8. Opportunity Quality Gate.

Failure states:

```text
SOURCE_UNAVAILABLE
RATE_LIMIT
TIMEOUT
ROBOTS_BLOCKED
AUTH_REQUIRED
INVALID_RESPONSE
PARSING_FAILED
CONTENT_EMPTY
DUPLICATE
OWNERSHIP_MISMATCH
```

Use retry with exponential backoff only for retryable failures. Never replace failure with mock or historical content. A source failure must not block unrelated SearchTask or ingestion sources.

## 9. Research Trace Integration

Research Trace must display the explicit path:

```text
Source Registry
      ↓
Raw capture
      ↓
Validated SearchEvidence
      ↓
Market Signal FACT
      ↓
Opportunity ASSESSMENT
      ↓
Sales RECOMMENDATION
```

User-facing Trace should show:

- What happened.
- Which source supports it.
- When it was published and captured.
- What is confirmed.
- What is a commercial assessment.
- What the salesperson should verify.

Do not expose:

- Adapter credentials.
- Prompt content.
- Provider internals.
- Raw model output.

Do not use Research Trace to create or modify business entities.

## 10. Implementation Order

1. Source Registry contract.
2. Adapter contract and ingestion-run contract.
3. RawSourceDocument and retention design.
4. Company newsroom and RSS adapter.
5. Raw-to-Evidence validation.
6. Careers and hiring adapter.
7. Industry-news adapter and转载去重.
8. Market Signal extraction and evaluation.
9. Research Trace relationship.
10. Social adapters after the trust boundary is proven.

Next sequence:

```text
Market Data Foundation
        ↓
Real website / RSS ingestion
        ↓
Market Signal generation
        ↓
Research Trace linkage
        ↓
Contact Intelligence
        ↓
Sales Copilot
```

The foundation must keep the truth hierarchy:

```text
Source
  ↓
Evidence
  ↓
Fact
  ↓
Assessment
  ↓
Recommendation
```
