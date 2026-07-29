# Sales Radar AI Intelligence Foundation Contract v1

Status: Proposed  
Phase: B-0 Design Only  
Scope: `DataSource`, `IngestionRun`, and `RawSourceDocument` contracts. No Prisma, API, adapter, scheduler, or business-logic implementation.

## 1. Contract Purpose

Define the minimum infrastructure objects required to bring real external market information into Sales Radar AI through one controlled path:

```text
External world
      ↓
DataSource
      ↓
IngestionRun
      ↓
RawSourceDocument
      ↓ Validation
SearchEvidence
      ↓ Extraction
MarketSignal
      ↓ Assessment
Opportunity
```

These three foundation objects are intelligence infrastructure. They are not customer data and must not create CRM relationships.

## 2. Non-Negotiable Boundaries

Maintain:

```text
Source != Raw Data
Raw Data != Evidence
Evidence != Market Signal
Market Signal != Opportunity
Opportunity != Customer
CompanyProfile != Customer
```

Prohibit:

- Creating a Lead, Contact, Customer, or Qualified Lead.
- Automatically creating an Opportunity.
- Treating successful fetching as factual verification.
- Treating a registered domain as verified company identity.
- Inferring procurement, product need, budget, supplier relationship, project stage, or responsible person.
- Establishing relationships by company-name, keyword, domain, URL, or content similarity.
- Associating records across users.
- Creating fake SearchTasks to represent scheduled ingestion.

## 3. Object Responsibilities

| Object | Question answered | Responsibility | Explicitly not responsible for |
|---|---|---|---|
| `DataSource` | What source do we monitor? | Source identity, type, tier, ownership, permission, lifecycle, schedule policy, health | Content, fact validation, Market Signal, Opportunity |
| `IngestionRun` | What happened during one collection execution? | Execution status, timing, adapter version, counts, cursor, sanitized error summary | Source truth, content truth, sales judgment |
| `RawSourceDocument` | What did the adapter capture? | Immutable captured payload, URL, title, content or excerpt, publisher, time, hash, parsing state | Evidence, verified fact, Market Signal, Opportunity |

## 4. DataSource Contract

### 4.1 Responsibility

`DataSource` represents a governed publisher or data entry point, such as:

- Toyota Newsroom.
- BMW Press.
- Siemens RSS.
- Bosch Careers.
- A government procurement publication.
- A future permitted social or job-platform endpoint.

Registration means “monitor this source.” It does not mean that every item from the source is true or commercially relevant.

### 4.2 Field Contract

| Field | Type | Required | Meaning and constraint |
|---|---|---:|---|
| `id` | ID | Yes | Stable registry identifier |
| `userId` | ID | Yes | Tenant owner; all downstream records inherit this boundary |
| `name` | String | Yes | User-facing source name |
| `sourceType` | Enum | Yes | Governed source category |
| `tier` | Enum | Yes | Source-governance tier, not Evidence confidence |
| `canonicalBaseUrl` | URL | Yes | Normalized source entry URL |
| `publisherName` | String | No | Explicit publisher identity when known |
| `publisherVerificationStatus` | Enum | Yes | Whether publisher ownership is verified |
| `status` | Enum | Yes | Lifecycle status |
| `healthStatus` | Enum | Yes | Technical accessibility status |
| `accessMethod` | Enum | Yes | RSS, HTTP, official API, browser-permitted access, or other approved method |
| `verificationRequired` | Boolean | Yes | Whether human or policy verification is required before activation |
| `schedulePolicy` | Object | No | Frequency and allowed execution window; not a scheduler implementation |
| `credentialReference` | String | No | Reference to a future secret vault; never store the secret itself |
| `lastSuccessfulAt` | Timestamp | No | Last successful technical collection |
| `lastFailedAt` | Timestamp | No | Last failed technical collection |
| `consecutiveFailures` | Integer | Yes | Source-level failure counter |
| `lastHttpStatus` | Integer | No | Latest relevant HTTP status |
| `rateLimitStatus` | Enum | Yes | Clear, limited, or unknown |
| `retryAfter` | Timestamp | No | Earliest permitted retry time |
| `registryVersion` | String | Yes | Source-governance contract version |
| `createdAt` | Timestamp | Yes | Registration time |
| `updatedAt` | Timestamp | Yes | Last lifecycle or configuration update |

### 4.3 Source Type

Use:

```text
COMPANY_WEBSITE
RSS
CAREERS
NEWS_MEDIA
GOVERNMENT
SOCIAL
JOB_PLATFORM
```

### 4.4 Source Tier

Use:

```text
TIER_1
TIER_2
TIER_3
```

- `TIER_1`: verified first-party or authoritative publisher.
- `TIER_2`: professional secondary publisher.
- `TIER_3`: social, community, employee, public-user, or weakly controlled source.

Tier never proves that an individual claim is factual.

### 4.5 Publisher Verification

Use:

```text
VERIFIED
PARTIALLY_VERIFIED
NEEDS_REVIEW
REJECTED
```

A domain alone cannot produce `VERIFIED`. Verification requires an explicit relationship, such as:

- A known CompanyProfile source relationship.
- A first-party reference.
- A verified public registry or other approved authority.
- Human confirmation through an authorized workflow.

### 4.6 Lifecycle

Use:

```text
ACTIVE
PAUSED
FAILED
DISABLED
NEEDS_REVIEW
```

Allowed transitions:

```text
NEEDS_REVIEW → ACTIVE
ACTIVE → PAUSED
PAUSED → ACTIVE
ACTIVE → FAILED
FAILED → ACTIVE
FAILED → PAUSED
ANY → DISABLED
```

Requirements:

- Activation requires ownership, permission, and access-method checks.
- `FAILED` represents technical failure, not false content.
- `DISABLED` stops future scheduling but preserves history.
- Never delete historical runs or documents because a source is paused or disabled.

### 4.7 Uniqueness and Idempotency

Candidate uniqueness boundary:

```text
userId + sourceType + canonicalBaseUrl
```

Do not merge sources across users. Do not merge different source types merely because they share a domain.

## 5. IngestionRun Contract

### 5.1 Responsibility

`IngestionRun` records one scheduled or manually triggered adapter execution.

Example:

```text
Source: BMW Press
Started: 2026-08-01 08:00
Status: COMPLETED
Fetched: 30
New: 24
Duplicates: 2
Rejected: 4
```

These counts describe pipeline processing, not the number of facts, signals, opportunities, or customers.

### 5.2 Field Contract

| Field | Type | Required | Meaning and constraint |
|---|---|---:|---|
| `id` | ID | Yes | Stable run identifier |
| `userId` | ID | Yes | Must equal the DataSource owner |
| `dataSourceId` | ID | Yes | Explicit parent source |
| `triggerType` | Enum | Yes | Scheduled, manual, retry, or backfill |
| `status` | Enum | Yes | Run lifecycle |
| `adapterType` | String | Yes | Adapter contract identifier |
| `adapterVersion` | String | Yes | Version used for reproducibility |
| `idempotencyKey` | String | Yes | Prevent duplicate execution records |
| `cursorBefore` | String | No | Adapter cursor before execution |
| `cursorAfter` | String | No | Cursor after successful or partial execution |
| `startedAt` | Timestamp | No | Execution start |
| `completedAt` | Timestamp | No | Terminal time |
| `fetchedCount` | Integer | Yes | Items received from source |
| `createdCount` | Integer | Yes | New RawSourceDocuments |
| `duplicateCount` | Integer | Yes | Exact or canonical duplicates |
| `validationEligibleCount` | Integer | Yes | Raw documents eligible for Evidence Validation |
| `rejectedCount` | Integer | Yes | Invalid or disallowed raw items |
| `failedCount` | Integer | Yes | Item-level processing failures |
| `errorCode` | String | No | Sanitized terminal or partial error category |
| `errorSummary` | String | No | Safe operational summary; no credentials or full stack |
| `runVersion` | String | Yes | Ingestion-run contract version |
| `createdAt` | Timestamp | Yes | Record creation time |

### 5.3 Lifecycle

Use:

```text
PENDING
RUNNING
COMPLETED
PARTIAL
FAILED
CANCELLED
RATE_LIMITED
```

Rules:

- `COMPLETED` means the adapter completed; it does not validate content.
- `PARTIAL` means some items were processed and others failed.
- `RATE_LIMITED` must preserve retry-after information at the DataSource level.
- A run is append-only after reaching a terminal state.
- Retry creates a new run linked through a retry reference; it does not overwrite the failed run.
- Cursor advancement must occur only under adapter-specific success rules.

### 5.4 Idempotency

Candidate idempotency key:

```text
dataSourceId + triggerType + scheduledWindow + adapterVersion
```

Backfills must use an explicit window or cursor range. A retry must not produce duplicate RawSourceDocuments.

## 6. RawSourceDocument Contract

### 6.1 Responsibility

`RawSourceDocument` preserves what a registered adapter captured before Evidence Validation.

It may contain:

- Duplicate content.
- Navigation or error pages.
- Stale material.
- Misleading headlines.
- Unsupported statements.
- Incomplete publisher information.

Therefore:

```text
RawSourceDocument != SearchEvidence
RawSourceDocument != Fact
```

### 6.2 Field Contract

| Field | Type | Required | Meaning and constraint |
|---|---|---:|---|
| `id` | ID | Yes | Stable raw-document ID |
| `userId` | ID | Yes | Must equal the parent run and source owner |
| `dataSourceId` | ID | Yes | Explicit source relationship |
| `ingestionRunId` | ID | Yes | Explicit run relationship |
| `externalId` | String | No | Publisher or adapter-provided item ID |
| `originalUrl` | URL | Yes | URL returned by the source |
| `canonicalUrl` | URL | Yes | Normalized final URL |
| `title` | String | No | Captured title; never sufficient for a fact |
| `content` | Text | No | Permitted captured content |
| `excerpt` | Text | No | Valid excerpt when full content cannot be retained |
| `publisherName` | String | No | Captured publisher label; not automatically verified |
| `publishedAt` | Timestamp | No | Source publication time |
| `capturedAt` | Timestamp | Yes | Capture time |
| `contentHash` | String | Yes | Deterministic normalized-content hash |
| `mimeType` | String | No | Captured content type |
| `language` | String | No | Detected or source-declared language |
| `httpStatus` | Integer | No | Retrieval status |
| `parsingStatus` | Enum | Yes | Parser lifecycle |
| `validationStatus` | Enum | Yes | Evidence eligibility state |
| `rejectionCode` | String | No | Safe reason for rejection |
| `revisionOfId` | ID | No | Explicit prior version relationship |
| `rawFormatVersion` | String | Yes | Raw payload contract version |
| `retentionUntil` | Timestamp | No | Legal and operational retention boundary |
| `createdAt` | Timestamp | Yes | Immutable record creation time |

### 6.3 Parsing Lifecycle

Use:

```text
CAPTURED
PARSED
PARSING_FAILED
UNSUPPORTED
```

Parsing only means the payload was structurally processed.

### 6.4 Validation Lifecycle

Use:

```text
PENDING
ELIGIBLE
NEEDS_REVIEW
REJECTED
EVIDENCE_CREATED
```

Rules:

- `ELIGIBLE` means Evidence Validation may process the document.
- `EVIDENCE_CREATED` requires an explicit SearchEvidence relationship.
- `REJECTED` preserves the raw record and reason.
- No lifecycle status means that a claim is factual.

### 6.5 Immutability and Revisions

- Do not overwrite captured content, publisher, URL, or hash after creation.
- Store a changed page as a new RawSourceDocument.
- Link revisions explicitly with `revisionOfId`.
- Preserve historical versions even when the source content is later deleted.
- Use retention policy to control content removal while retaining non-sensitive hashes and provenance metadata where lawful.

### 6.6 Deduplication

Deduplication priority:

1. `dataSourceId + externalId`, when external ID is stable.
2. `dataSourceId + canonicalUrl + contentHash`.
3. Exact normalized content hash within the same source.

Never merge by:

- Similar company names.
- Similar titles.
- Keyword overlap.
- Fuzzy URL similarity.
- Cross-user content matches.

## 7. Aggregate Relationships

```text
DataSource 1 ─────── N IngestionRun
DataSource 1 ─────── N RawSourceDocument
IngestionRun 1 ───── N RawSourceDocument
RawSourceDocument 0 ─ 1 SearchEvidence
SearchEvidence 1 ─── N MarketSignalEvidence
MarketSignal 0 ───── N OpportunityEvidence
```

Relationship rules:

- Every run and raw document must have the same `userId` as its DataSource.
- SearchEvidence creation must preserve the originating RawSourceDocument ID.
- A rejected RawSourceDocument has no SearchEvidence.
- A SearchEvidence record does not guarantee a MarketSignal.
- A MarketSignal does not guarantee an Opportunity.
- No infrastructure relationship may point directly to Lead, Contact, or Customer.

## 8. Relationship to Existing SearchEvidence

### 8.1 Existing Search Flow

Keep the current path unchanged:

```text
SearchTask
  ↓
Search Provider
  ↓
SearchEvidence
```

### 8.2 Future Ingestion Flow

Add a second valid Evidence origin:

```text
DataSource
  ↓
IngestionRun
  ↓
RawSourceDocument
  ↓
Evidence Validation
  ↓
SearchEvidence
```

Do not fake a SearchTask for scheduled ingestion.

The future Evidence origin contract should express exactly one origin:

```text
SEARCH_TASK
or
INGESTION
```

Conceptual origin references:

| Origin | Required reference | Forbidden reference |
|---|---|---|
| `SEARCH_TASK` | `searchTaskId` | `rawSourceDocumentId` unless the search flow also adopts raw capture explicitly |
| `INGESTION` | `rawSourceDocumentId` and its run/source chain | Fabricated `searchTaskId` |

Before implementation, verify whether the existing SearchEvidence schema requires `searchTaskId`. Any migration must be backward-compatible and preserve existing SearchTask ownership.

## 9. Evidence Promotion Contract

RawSourceDocument may create SearchEvidence only when Evidence Validation confirms:

1. Real and permitted URL.
2. Identifiable publisher.
3. Body content or valid excerpt.
4. Published or captured time.
5. Supported content type.
6. Same-user source chain.
7. Explicit raw-to-evidence relationship.
8. No blocking safety or permission failure.

Evidence creation must be:

- Idempotent.
- Versioned.
- Traceable.
- Independent from Market Signal extraction.
- Independent from Opportunity creation.

## 10. Permission Boundary

### DataSource

- User may propose, pause, or disable an owned source through a future authorized service.
- Source Management policy decides whether activation requirements are met.
- Cross-user access returns not found without exposing existence.

### IngestionRun

- Scheduler or explicit user action may request a run.
- Only the authorized ingestion service may create or transition run state.
- A run cannot change its user or source ownership.

### RawSourceDocument

- Only an authorized adapter pipeline may create it.
- It is immutable after capture except for controlled lifecycle fields.
- Users may inspect allowed provenance but may not rewrite raw content.

### SearchEvidence and downstream entities

- Only Evidence Validation may promote eligible raw data into Evidence.
- Market Intelligence may read Evidence, not Raw Data, for factual Signal extraction.
- Opportunity Analysis may read validated Signal and Evidence, not unvalidated Raw Data.
- CRM systems must never read infrastructure records as customer truth.

## 11. Skill Registry Invocation Contract

Allowed path:

```text
source-management
        ↓
market-data-ingestion
        ↓
evidence-validation
        ↓
source-grounding
        ↓
market-intelligence
        ↓
market-signal-evaluation
        ↓
opportunity-analysis
        ↓
opportunity-quality
        ↓
company-intelligence
        ↓
research-trace
```

Responsibilities:

| Skill | May read | May propose or write through authorized service | Must not do |
|---|---|---|---|
| `source-management` | DataSource configuration and health | DataSource lifecycle action | Fetch content or create Evidence |
| `market-data-ingestion` | Active DataSource | IngestionRun and RawSourceDocument through ingestion service | Create Signal or Opportunity |
| `evidence-validation` | RawSourceDocument and provenance | SearchEvidence through Evidence service | Fill missing facts |
| `source-grounding` | Evidence and proposed fact | Grounding decision | Create relationships by similarity |
| `market-intelligence` | Validated SearchEvidence | MarketSignal candidate | Read Raw Data as fact |
| `market-signal-evaluation` | Signal candidate and Evidence | Evaluation result | Bypass Opportunity Quality |
| `opportunity-analysis` | Validated Signal, Evidence, Product Context | Opportunity candidate | Create Customer or Lead |
| `opportunity-quality` | Opportunity candidate and sources | PASS/WARNING/BLOCK decision | Lower standards for volume |
| `agent-orchestration` | IDs, permissions, workflow state | Routing and execution state | Make commercial judgments |
| `sales-data-quality` | Proposed outputs and ownership | Quality result only | Mutate business data |

The Supervisor may route IDs but cannot skip a stage or promote an entity.

## 12. Research Trace Integration

Research Trace should be able to explain:

```text
Source registered
      ↓
Ingestion executed
      ↓
Raw document captured
      ↓
Evidence validated
      ↓
Signal identified
      ↓
Opportunity assessed
```

### User-facing default

Show:

- Publisher.
- Source URL.
- Publication and capture time.
- Confirmed fact.
- Commercial assessment.
- Recommended verification.

Do not show by default:

- Adapter internals.
- Raw payload.
- Retry counters.
- Technical stack traces.
- Credential references.

### Advanced audit expansion

May show:

- DataSource ID.
- IngestionRun ID.
- RawSourceDocument ID and hash.
- Adapter and contract version.
- Evidence ID.
- Status transitions.

Research Trace remains read-only and must not create or update any foundation or business entity.

## 13. Trace Contract

Every lifecycle action must provide:

```text
Input References
Source References
Reasoning
Version
Timestamp
Authenticated user context
Status
```

Specific requirements:

- DataSource changes include previous and next status plus reason.
- IngestionRun includes source, adapter, trigger, counts, and terminal status.
- RawSourceDocument includes source, run, URL, hash, capture time, and parsing result.
- Evidence promotion includes explicit RawSourceDocument and Evidence IDs.
- Do not store Prompt content, API keys, cookies, raw credentials, or unrelated user IDs.

## 14. Error and Recovery Contract

Use safe error categories:

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
UNSUPPORTED_FORMAT
OWNERSHIP_MISMATCH
```

Rules:

- A source failure must not affect unrelated sources or the existing SearchTask pipeline.
- Never replace failure with mock, historical, or fabricated data.
- Retry only retryable errors with explicit backoff.
- `AUTH_REQUIRED`, `ROBOTS_BLOCKED`, and permission failures require review rather than automatic retry.
- Preserve failed-run history.
- Preserve rejected raw-document provenance.

## 15. Phase B Implementation Preconditions

Before modifying Prisma:

1. Confirm compatibility with the current SearchEvidence ownership model.
2. Confirm enum names against existing Prisma enums.
3. Define deletion and retention policy.
4. Define database-level same-user constraints where possible and service-level checks elsewhere.
5. Define idempotency and unique indexes.
6. Define migration behavior for existing SearchEvidence.
7. Add tests proving no Lead, Contact, Customer, or Opportunity is created.
8. Add tests proving failed ingestion does not affect SearchTask.
9. Add tests proving cross-user associations are rejected.
10. Obtain explicit implementation approval.

## 16. Deferred Scope

Do not implement in Phase B foundation:

- Reddit, X, LinkedIn, or social adapters.
- General web crawler platforms.
- Automatic monitoring.
- Automatic company discovery.
- Market Signal extraction.
- Opportunity generation.
- Contact discovery.
- CRM promotion.

Recommended implementation sequence after this contract:

```text
DataSource / IngestionRun / RawSourceDocument
                  ↓
Tier 1 company newsroom and RSS
                  ↓
Evidence Validation
                  ↓
Hiring sources
                  ↓
Industry news
                  ↓
Market Signal extraction
                  ↓
Research Trace linkage
```
