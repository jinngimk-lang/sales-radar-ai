# Sales Radar AI — Company Identity Extraction Audit v1

## Executive summary

Sales Radar AI can now execute real searches and preserve SearchTask result
ownership, but it currently creates `Lead` records before it has proved that a
search result represents a company.

The most important finding is structural:

```text
The current database has no independent SearchEvidence layer.
```

Because `SearchTaskLead` can only point to a `Lead`, raw pages, weak content,
directories, blocked pages, and unverified people must first become Leads if
the system wants to retain them. `LeadResearch` then evaluates quality after
the Lead has already crossed the product boundary.

The current-day AgentReach sample confirms the impact:

| Metric | Result |
| --- | ---: |
| AgentReach Leads reviewed (2026-07-27 UTC) | 38 |
| Content | 25 |
| Community | 11 |
| Person | 2 |
| Company populated | 2 |
| Domain populated | 2 |
| Website populated | 0 |
| Company + domain | 2 |
| Trustworthy company + official domain | 0 |
| Generic identities (`Unknown`, `Exa`, platform source) | 9 |
| Blocked/access-denied content | 2 |

Both apparent company/domain successes were false positives:

- `Bit` was inferred from the URL shortener `bit.ly`.
- `U` was inferred from the subdomain `u.made-in-china.com`.

The recommended direction is not to extract more names from every snippet.
It is to introduce a conservative identity and verification boundary:

```text
SearchEvidence
  -> Company Identity Extraction
  -> Identity Verification
  -> Product Relevance
  -> Lead Quality Gate
  -> Lead
```

Unknown values must remain Unknown. A smaller result set with verified identity
and evidence is more valuable than a larger set of content cards.

---

## 1. Current architecture

### 1.1 Current data flow

```text
Exa hosted MCP
  |
  | human-readable or JSON mcporter response
  v
AgentReachProvider.executeSearch()
  |
  v
parseAgentReachOutput()
  |-- collectStructuredResults() / toRawResult()
  `-- parseTextResults()
  |
  v
AgentReachProvider.toSearchResult()
  |
  | SearchResult (memory only)
  v
LeadExtractorService.extractMany()
  |
  | enriched SearchResult (memory only)
  v
LeadNormalizerService.normalizeMany()
  |
  | NormalizedLead
  v
SearchTaskService.processSearchTask()
  |
  |-- Lead
  `-- SearchTaskLead
       |
       v
LeadResearchService / Lead Research AI
```

### 1.2 Current files and responsibilities

| Stage | File | Main functions/classes |
| --- | --- | --- |
| Provider execution | `backend/src/providers/search/agent-reach.provider.ts` | `AgentReachProvider.search`, `executeSearch`, `toSearchResult` |
| Provider-neutral contract | `backend/src/providers/search/search-provider.interface.ts` | `SearchResult`, `SearchProvider` |
| MCP output parsing | `backend/src/providers/search/agent-reach.provider.ts` | `parseAgentReachOutput`, `collectStructuredResults`, `toRawResult`, `parseTextResults` |
| Candidate extraction | `backend/src/services/lead-extractor.service.ts` | `LeadExtractorService.extract`, `extractMany`, `extractCompanies`, `extractCompanyDomain` |
| Type classification | `backend/src/services/lead-classifier.service.ts` | `LeadClassifierService.classify` |
| Normalization | `backend/src/services/lead-normalizer.service.ts` | `normalize`, `normalizeMany`, `resolveCompany`, `normalizeDomain` |
| Scoring | `backend/src/services/lead-scoring.service.ts` | `LeadScoringService.score` |
| Deduplication | `backend/src/services/lead-deduplication.service.ts` | `findDuplicate`, `readCompanyDomain` |
| Persistence | `backend/src/services/search-task.service.ts` | `processSearchTask` |
| Database models | `backend/prisma/schema.prisma` | `Lead`, `SearchTask`, `SearchTaskLead`, `LeadResearch` |
| Post-Lead research | `backend/src/services/lead-research.service.ts` | `LeadResearchService.analyze`, AI research path |

### 1.3 Where raw evidence is stored

At runtime, raw evidence first exists in `SearchResult`:

- `sourceUrl`
- `profileUrl`
- `rawContent`
- `metadata`

It is not persisted as an independent evidence record.

After normalization, evidence is stored inside `Lead`:

- `Lead.postContent`: Exa text/highlights.
- `Lead.sourceUrl`: source page.
- `Lead.profileUrl`: profile or fallback source page.
- `Lead.sourceMetadata`: title, author, provider, search engine, extraction
  details, inferred company/domain, scores, and original metadata.

`SearchTaskLead.matchEvidence` currently keeps only a small task-specific
summary:

- provider
- source URL

Consequences:

1. Evidence cannot be retained without creating a Lead.
2. Rejected evidence has no first-class lifecycle.
3. The system cannot distinguish “pages scanned” from “qualified companies.”
4. Re-running extraction against preserved raw Provider payload is difficult
   because the full response is only partially retained.

### 1.4 Where company name is extracted

There are three current opportunities:

#### Provider parser

`toRawResult()` reads structured keys:

- `company`
- `companyName`
- `organization`
- `organizationName`

This works only when mcporter/Exa returns structured objects containing those
fields.

#### LeadExtractor

`extractCompanies()`:

1. reads `metadata.companies`;
2. accepts `SearchResult.company`;
3. for AgentReach, stops there and deliberately does not extract arbitrary
   capitalized names from snippets.

The AgentReach guard is conceptually correct: companies mentioned in content
are not necessarily the page subject. However, the current text response rarely
declares company fields, so the guard also means most AgentReach results leave
extraction with `company=null`.

#### LeadNormalizer

`resolveCompany()`:

1. accepts `result.company`;
2. accepts declared company/organization metadata;
3. otherwise derives a display company from the first label of the extracted
   domain.

The third step is unsafe. It converted:

- `bit.ly` into `Bit`;
- `u.made-in-china.com` into `U`.

This is the current source of the two apparent company/domain successes in the
current-day sample.

### 1.5 Where domain is extracted

`LeadExtractorService.extractCompanyDomain()` applies:

1. `metadata.companyDomain`;
2. `metadata.companyWebsite`;
3. first non-social URL found anywhere in title/content.

`LeadNormalizerService.normalizeDomain()` then canonicalizes the hostname.

Problems:

- first arbitrary content URL is not necessarily the subject company's domain;
- redirectors and URL shorteners are accepted;
- marketplace or directory subdomains are accepted;
- registrable domain (eTLD+1) is not separated from arbitrary subdomain;
- no evidence records why the domain belongs to the company;
- no official-site verification exists.

### 1.6 Where normalization happens

`LeadNormalizerService.normalize()` converts the enriched `SearchResult` into
the Prisma-facing `NormalizedLead`.

It also:

- resolves identity/display name;
- selects job title/contact fields;
- classifies lead type;
- invokes scoring;
- builds `sourceMetadata`;
- sanitizes raw Provider text.

This service currently combines four concerns:

1. field normalization;
2. entity identity inference;
3. content classification;
4. commercial scoring.

The identity decision is therefore not independently inspectable or reusable.

### 1.7 Where extraction fails

The primary failure chain is:

```text
Exa returns human-readable text
  -> parseTextResults retains title/url/text/author/date only
  -> AgentReachProvider has no declared company/domain/website
  -> LeadExtractor refuses to guess company from mentions
  -> domain extractor may select an unrelated body URL
  -> LeadNormalizer may convert that unrelated hostname into a company
  -> record is persisted as Lead before identity is verified
```

Secondary failures:

- Default AgentReach platforms prioritize Reddit, X, and YouTube, producing
  content evidence rather than official companies.
- LinkedIn person URLs return useful role evidence but not an official company
  domain.
- Buying-signal regex can score procurement words in general articles,
  tutorials, or vendor marketing.
- `LeadResearch` reads the same unverified company/website metadata. It can
  lower quality after persistence, but it cannot retroactively turn the record
  back into non-Lead evidence.

---

## 2. Current data-quality problems

### 2.1 Category A — valid company candidate

A valid candidate requires:

- an identifiable company subject;
- an official or strongly verified domain;
- evidence proving the company/page relationship;
- relevance to the current product/customer context.

No current-day sample satisfied all four conditions.

A future valid example would look like:

```json
{
  "companyName": "Example Manufacturing GmbH",
  "normalizedDomain": "example-manufacturing.de",
  "website": "https://example-manufacturing.de",
  "evidence": [
    {
      "sourceUrl": "https://example-manufacturing.de/about",
      "claim": "Page ownership and organization name match the domain"
    }
  ],
  "confidence": 0.94
}
```

This should become a Lead only if ProductContext relevance also passes.

### 2.2 Category B — weak candidate

Observed examples:

#### FrieslandCampina / Keelvar YouTube case

Title:

```text
FrieslandCampina: Streamlining Packaging and Logistics Sourcing with Keelvar
```

Why it is useful evidence:

- names a customer-case subject;
- describes a business process and potential problem;
- contains a concrete source URL.

Why it is not yet a qualified Lead:

- the official FrieslandCampina domain is not present or verified;
- the page publisher/vendor and customer subject must be distinguished;
- the content does not prove a current buying event.

Recommended state: `SearchEvidence / NEEDS_IDENTITY_VERIFICATION`.

#### LinkedIn person at Konecranes

Title:

```text
Oliver Milovanovic – Konecranes | LinkedIn
```

Why it is useful:

- provides a real person/profile URL;
- includes a company relationship and procurement role evidence.

Why it is still weak:

- company domain is unknown;
- person-to-company relationship comes from search text and should be
  verified;
- the person is not automatically a current buyer for the searched product.

Recommended state: `SearchEvidence / PERSON_CANDIDATE`, then enrich company
identity before Lead promotion.

#### Tracxn manufacturing SaaS directory

Why it is useful:

- identifies a market category and candidate company names.

Why it is not itself a Lead:

- the directory is the source publisher, not the candidate company;
- listed companies need individual identities and official domains;
- list membership does not prove customer relevance or purchase intent.

Recommended state: directory evidence that can spawn separate identity
candidates, never a Lead representing Tracxn or the page title.

### 2.3 Category C — invalid candidate

Observed examples:

#### Generic community page

```text
https://www.reddit.com/r/procurement/
```

It contains procurement language but no company subject, domain, or specific
business event.

Recommended state: evidence-only or rejected as `GENERIC_COMMUNITY_PAGE`.

#### Network-block response

Content:

```text
You've been blocked by network security.
```

It provides no usable business evidence.

Recommended state: rejected as `BLOCKED_OR_EMPTY_CONTENT`.

#### Tutorial/top-list content

Examples:

- “Top 10 ... suppliers”
- “How to source products ...”
- generic webinars and explainers

These may be research sources but are not customers.

Recommended state: `CONTENT_EVIDENCE`; do not create a sales Lead.

#### Domain-derived false identity

```text
Bit <- bit.ly
U <- u.made-in-china.com
```

The domain points to a redirector or marketplace subdomain. The first hostname
label is not a company identity.

Recommended state: reject identity as `UNVERIFIED_DOMAIN_RELATION`.

#### Historical multi-candidate fragments

Historical data contains one YouTube page expanded into candidates such as:

- `Wholesale`
- `Sustainability`
- `Premium Pricing`
- `Packaging`
- `#430`

Another LinkedIn company page produced sentence fragments such as:

- `Containers Manufacturing - Type: Privately Held - Headquarters: Aurora`
- `more. Shorr Packaging Corp. employs 420 people`

These records predate the current AgentReach “provider-declared entities only”
guard, but they should remain regression fixtures. They demonstrate why
capitalization and comma-list extraction cannot establish identity.

### 2.4 Duplicate behavior

Across 138 AgentReach Leads reviewed:

- 109 unique source URLs;
- 9 source URLs produced multiple Lead records;
- some pages expanded into as many as 10 candidate Leads.

Multiple companies from one source are legitimate only when each company has:

- a separate evidence span;
- a defined relationship to the source;
- an independently verified identity/domain;
- its own ProductContext relevance result.

Without those conditions, multi-candidate expansion magnifies extraction noise.

---

## 3. Proposed Company Identity Extraction layer

### 3.1 Architectural position

```text
Search Provider
  -> Evidence Ingestion
  -> Evidence Classification
  -> Company Identity Extraction
  -> Company Identity Verification
  -> Product Relevance Evaluation
  -> Lead Quality Gate
  -> Lead persistence
```

The new layer should run before `LeadNormalizer` and before `Lead` persistence.

### 3.2 Input contract

```ts
interface CompanyIdentityExtractionInput {
  evidenceId: string
  provider: string
  sourceUrl: string
  canonicalUrl: string
  title: string
  snippet: string
  content: string
  sourceType: 'official_site' | 'company_profile' | 'person_profile'
    | 'case_study' | 'article' | 'directory' | 'community'
    | 'video' | 'document' | 'unknown'
  providerMetadata: Record<string, unknown>
}
```

The extractor should not receive a pre-assumed customer identity.

### 3.3 Output contract

```ts
interface CompanyIdentity {
  companyName: string | null
  normalizedDomain: string | null
  website: string | null
  industry: string | null
  country: string | null
  region: string | null
  subjectRole:
    | 'page_owner'
    | 'employer'
    | 'customer_case_subject'
    | 'mentioned_company'
    | 'publisher'
    | 'unknown'
  evidence: IdentityEvidence[]
  confidence: number
  verificationStatus:
    | 'VERIFIED'
    | 'PARTIAL'
    | 'UNVERIFIED'
    | 'CONFLICTED'
  rejectionReasons: string[]
}

interface IdentityEvidence {
  field: 'companyName' | 'domain' | 'website' | 'industry'
    | 'country' | 'relationship'
  value: string
  sourceUrl: string
  sourceKind: string
  excerpt?: string
  confidence: number
}
```

Null is required when identity is unknown. Do not use generated placeholders as
stored identity.

### 3.4 Extraction source priority

#### Tier 1 — authoritative

- structured Provider company fields plus an official domain;
- official website organization/schema metadata;
- official domain page ownership signals;
- verified company profile URL with a separately verified official website.

#### Tier 2 — strong relationship evidence

- person profile explicitly naming employer;
- customer case study explicitly distinguishing vendor and customer;
- company directory entry containing a candidate website, followed by
  independent domain verification.

#### Tier 3 — candidate only

- title parsing;
- organization mentions in snippets;
- channel names;
- page author/publisher names.

Tier 3 may generate an identity candidate but must not produce `VERIFIED`.

#### Never sufficient

- first capitalized phrase;
- first hostname label;
- URL shortener;
- social media hostname;
- marketplace/directory hostname;
- arbitrary links found in content;
- company mentioned without a subject relationship.

### 3.5 Subject-role resolution

Before extracting company identity, identify the entity's relationship to the
page:

| Role | Meaning | Lead treatment |
| --- | --- | --- |
| `page_owner` | Official company owns the page/domain | Strong |
| `employer` | Person profile names current company | Strong after verification |
| `customer_case_subject` | Case study is about this customer | Strong evidence, verify domain |
| `publisher` | Media/vendor published the content | Usually not the target |
| `mentioned_company` | Company only appears in text/list | Evidence only |
| `unknown` | Relationship cannot be established | Evidence only |

This directly addresses the current vendor/customer and brand/customer
confusion.

### 3.6 Domain normalization and verification

Domain processing should:

1. parse URL safely;
2. resolve registrable domain (eTLD+1), not the first hostname label;
3. normalize IDN, case, `www`, and trailing dot;
4. reject social/platform hosts;
5. reject known shorteners;
6. treat marketplaces, directories, document hosts, and tracking links as
   source domains, not company domains;
7. record the source of the domain assertion;
8. verify company name/domain consistency;
9. preserve conflicts rather than selecting one silently.

Examples:

```text
bit.ly                       -> reject as shortener
u.made-in-china.com          -> source/marketplace domain, not company identity
linkedin.com/company/acme    -> company-profile evidence, domain still unknown
acme.de/about                -> candidate official domain acme.de
```

`website` should be a canonical official URL. `normalizedDomain` should be its
registrable hostname. They should not be inferred from each other unless the
official relationship is verified.

### 3.7 Deterministic first, AI second

Recommended execution:

1. deterministic URL/page/source classification;
2. deterministic structured metadata extraction;
3. deterministic invalid-host and content-quality rules;
4. optional AI entity/relationship extraction for ambiguous text;
5. deterministic response validation and confidence calculation;
6. no AI output can override a hard domain/source contradiction.

AI can propose:

- possible company subject;
- entity role;
- evidence spans;
- industry hints.

It must not invent:

- official website;
- domain ownership;
- company location;
- customer relationship;
- buying event.

---

## 4. Lead Quality Gate recommendation

### 4.1 Hard requirements

A record becomes a sales `Lead` only when all four gates pass.

#### Gate 1 — identifiable company

- `companyName` is not null;
- not a generic word or sentence fragment;
- subject role is known;
- identity confidence meets the minimum threshold.

Recommended minimum: `confidence >= 0.75`.

#### Gate 2 — valid official domain

- `normalizedDomain` is not null;
- not social, shortener, marketplace, directory, tracking, or document host;
- relationship between company and domain has evidence;
- domain is canonicalized.

#### Gate 3 — source evidence

- source URL is valid and canonical;
- title/content is not empty, blocked, captcha, or access-denied;
- evidence explains the company identity and relationship;
- evidence is retained independently from the Lead.

#### Gate 4 — customer relevance

- evaluated against the SearchTask's ProductContextSnapshot;
- industry/application/customer-type relevance is explicit;
- result contains a human-readable match reason;
- negative evidence is considered.

Recommended minimum relevance threshold: separately calibrated, initially
`>= 0.60`, with no hard identity failure.

### 4.2 Promotion outcomes

```text
All hard gates pass
  -> Lead

Identity/company exists but domain or relevance is incomplete
  -> SearchEvidence / NEEDS_ENRICHMENT

Useful article, directory, case study, person, or community discussion
  -> SearchEvidence / SUPPORTING_EVIDENCE

Blocked, empty, generic, duplicate, or contradicted source
  -> SearchEvidence / REJECTED
```

### 4.3 Lead versus SearchEvidence

| Condition | Lead | SearchEvidence only |
| --- | ---: | ---: |
| Verified company + official domain + evidence + relevance | Yes | Also linked as evidence |
| Company name, no official domain | No | Yes |
| Person profile, employer not verified | No | Yes |
| Customer case study without verified customer domain | No | Yes |
| Directory/list page | No | Yes |
| Community buying discussion without company | No | Yes |
| Tutorial/news/video | No | Yes |
| Blocked/empty page | No | Rejected evidence |
| Duplicate canonical source | No new Lead | Link/deduplicate evidence |

### 4.4 Scoring after the gate

Commercial intent score should rank already qualified Leads. It should not
compensate for missing identity.

Current behavior allows procurement keywords to produce medium/high scores for
content with no company. Future order should be:

```text
Identity qualification
  -> Product relevance
  -> Commercial intent scoring
  -> Lead ranking
```

---

## 5. ProductContextSnapshot compatibility

### 5.1 Required snapshot fields

The extraction layer should remain product-independent, while the relevance
stage consumes an immutable snapshot:

```ts
interface ProductContextSnapshot {
  productProfileId?: string
  productName: string
  category?: string
  industries: string[]
  applications: string[]
  targetRegions: string[]
  targetCountries: string[]
  targetCustomerTypes: string[]
  recommendedBuyerRoles: string[]
  buyerKeywords: string[]
  channelKeywords: string[]
  negativeKeywords?: string[]
  createdAt: string
  version: number
}
```

### 5.2 Responsibility separation

```text
Company Identity Extraction answers:
"Who is this company, and what evidence proves it?"

Product Relevance answers:
"Why could this verified company be a customer for this product?"
```

The explanation should cite:

- verified company industry/application;
- target product/customer type;
- matching evidence;
- region match;
- missing or conflicting evidence.

Example:

```json
{
  "match": true,
  "reason": "The verified company operates a European packaging plant and the source describes production-line sourcing, matching the selected packaging automation product context.",
  "evidenceIds": ["evidence_1", "evidence_2"],
  "confidence": 0.81
}
```

The reason must not assert a purchase requirement unless the evidence contains
one.

---

## 6. Required database, API, and frontend impact

These are future design recommendations, not changes made by this audit.

### 6.1 Database impact

#### Add `SearchEvidence`

Minimum recommended fields:

```text
id
searchTaskId
provider
externalId
sourceUrl
canonicalUrl
sourceType
title
snippet
rawContent
rawMetadata
contentStatus
createdAt
```

#### Add extraction result

Either a separate `CompanyIdentityCandidate` table or a versioned JSON result
associated with `SearchEvidence`:

```text
companyName
normalizedDomain
website
industry
country
region
subjectRole
evidence
confidence
verificationStatus
rejectionReasons
extractorVersion
createdAt
updatedAt
```

A separate table is preferable if multiple company candidates can come from one
evidence item.

#### Link Lead to evidence

Add a many-to-many `LeadEvidence` relationship. Keep `SearchTaskLead` as the
qualified result ownership boundary.

#### Lead identity fields

Future Lead should expose first-class, indexed fields:

- company name;
- normalized domain;
- website;
- identity confidence;
- quality-gate status/version.

Keeping domain only inside JSON prevents reliable constraints and deduplication.

### 6.2 API impact

Keep the trustworthy current-result endpoint:

```text
GET /api/search-task/:id/results
```

It should return only gate-passed Leads.

Add an evidence-oriented endpoint only if needed for diagnostics or transparent
empty-state explanations:

```text
GET /api/search-task/:id/evidence
```

Suggested task result metadata:

```json
{
  "scanned": 20,
  "qualifiedLeads": 3,
  "evidenceOnly": 12,
  "rejected": 5,
  "rejectionSummary": {
    "NO_VERIFIED_DOMAIN": 7,
    "CONTENT_ONLY": 4,
    "BLOCKED_CONTENT": 1
  }
}
```

Do not return evidence-only items in the Lead array.

### 6.3 Frontend impact

Discover should continue showing only trustworthy Leads.

Recommended lightweight behavior:

- show “20 sources checked, 3 verified companies”;
- explain empty results honestly;
- do not render articles, tutorials, or community pages as customer cards;
- display company, official website, source evidence, and match reason;
- optionally let users inspect supporting evidence from the company detail
  context, not as separate fake customers.

No UI redesign is required.

---

## 7. Implementation priority

### P0 — establish the trust boundary

1. Add `SearchEvidence` persistence before Lead creation.
2. Add explicit Company Identity Extraction result.
3. Remove company-name derivation from arbitrary hostname labels.
4. Add URL/domain classification for social hosts, shorteners, directories,
   marketplaces, and blocked content.
5. Enforce Lead Quality Gate before `Lead` and `SearchTaskLead` creation.
6. Build regression tests from the observed bad examples:
   - `Bit / bit.ly`;
   - `U / u.made-in-china.com`;
   - blocked Reddit content;
   - generic procurement community;
   - sentence-fragment company names;
   - one page expanded into generic nouns.

### P1 — improve verified identity coverage

1. Resolve page subject roles: owner, employer, customer case, publisher,
   mentioned company.
2. Verify official company domains.
3. Support multiple company candidates only with separate evidence spans and
   identity verification.
4. Promote company/domain to first-class indexed Lead fields.
5. Deduplicate by normalized verified domain, not arbitrary source URL alone.

### P1 — preserve commercial context

1. Implement immutable `ProductContextSnapshot`.
2. Evaluate customer relevance after identity verification.
3. Store evidence-backed match reason on `SearchTaskLead`.

### P2 — controlled intelligence improvement

1. Add AI-assisted entity/relationship extraction behind deterministic safety
   validation.
2. Calibrate identity and relevance thresholds using sales feedback/outcomes.
3. Add evidence quality analytics without turning the product into a BI system.

---

## Final recommendation

Do not attempt to solve the current problem by loosening company-name regexes or
raising intent scores.

The minimum trustworthy next implementation is:

```text
Persist raw SearchEvidence
  -> verify company identity and official domain
  -> evaluate ProductContext relevance
  -> promote only passing candidates to Lead
```

This changes the product result from:

```text
"Here are pages that mention your market."
```

to:

```text
"Here are fewer companies we can identify, verify, and explain as potential customers."
```

