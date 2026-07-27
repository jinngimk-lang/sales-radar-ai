# Sales Radar AI — Assistant Lead Data Trust Audit v1

## Executive summary

The Assistant displays `Mock Buyer`, `buyer_industrial_*`, and malformed Shorr
Packaging records because its customer list is built from an unqualified query
over the complete `Lead` table:

```text
GET /api/leads?sort=desc
```

The backend query:

- does not resolve the active user;
- does not filter by `userId`;
- does not exclude `provider=mock`;
- does not require SearchTaskLead ownership;
- does not require a completed SearchTask;
- does not require verified company identity/domain;
- does not require ProductContext relevance;
- sorts by `intentScore`, not by verification or qualification.

The database currently contains only the Demo User, so every historical,
seeded, mock, and experimental record is returned together. Mock records carry
scores of 89–93 and malformed Shorr records carry scores of 90, placing them at
the top of the Assistant list.

Current database classification:

| Classification | Count |
| --- | ---: |
| Total Leads | 149 |
| Test/mock data | 11 |
| Legacy AgentReach data | 113 |
| Current but unverified data | 25 |
| Strictly verified and qualified Leads | 0 |

All 149 records belong to:

```text
demo@salesradar.local
```

The current Assistant data source is not production safe.

---

## 1. Exact frontend-to-database flow

### 1.1 AssistantPage

File:

```text
src/pages/AssistantPage.tsx
```

On mount:

```ts
getChatSessions().then(setSessions)
getChatMessages('default').then(setMessages)
```

The session sidebar is therefore populated by `getChatSessions()`.

Selecting a session only updates `activeSession`. It does not load session-
specific messages. The existing message list remains unchanged.

### 1.2 Frontend API service

File:

```text
src/services/api.ts
```

`getChatSessions()` executes:

```http
GET /api/leads?sort=desc
```

Every returned Lead is converted directly into a `ChatSession`:

```text
session.id        <- lead.id
customerName      <- lead.displayName
initials          <- lead.initials
platform          <- lead.platform
lastMessage       <- latest analysis suggestion or generic text
updatedAt         <- lead.updatedAt
```

There is no frontend trust check.

If the request fails, `getChatSessions()` silently returns the static
`CHAT_SESSIONS` fixture from `src/data/dashboard.ts`. Those records are also
mock data (`Marcus Reyes`, `Ahmed Al-Farsi`, etc.).

`getChatMessages()` always returns `DEFAULT_CHAT_MESSAGES`. It ignores the
session ID and does not call the backend. The default message mentions the
fictional Marcus Reyes record.

`sendChatMessage()` behaves as follows:

```text
If a real Lead session is selected
  -> POST /api/leads/:leadId/analyze

If no Lead is selected / session is "default" / fallback sess_* id
  -> GET /api/leads?sort=desc
  -> select response.data[0]
  -> analyze the highest-intent Lead
```

This means a new Assistant conversation automatically analyzes the first
unfiltered Lead. In the current database that is typically a mock fixture.

### 1.3 Backend route and controller

Files:

```text
backend/src/routes/lead.routes.ts
backend/src/controllers/lead.controller.ts
```

Route:

```ts
leadRouter.get('/', listLeadsController)
```

The controller accepts only:

- keyword/q;
- industry;
- country;
- intent sort direction.

It passes no current-user identity and no qualification policy to the service.

### 1.4 Backend service

File:

```text
backend/src/services/lead.service.ts
```

`listLeads()` creates a Prisma `where` object containing optional keyword,
industry, and country filters.

It then calls:

```ts
prisma.lead.findMany({
  where,
  include: analysisInclude,
  orderBy: { intentScore: input.intentSort },
})
```

For `/leads?sort=desc`, `where` is empty.

Effective SQL behavior:

```text
SELECT all Leads
ORDER BY intentScore DESC
```

The current SearchTask truth boundary (`SearchTaskLead`) is not consulted.

### 1.5 Database source

Relevant model:

```text
backend/prisma/schema.prisma -> Lead
```

The displayed records are database rows, not LocalStorage records.

LocalStorage being empty has no effect on the Assistant customer list.

---

## 2. Exact source of observed records

### 2.1 Mock Buyer 1 / Mock Buyer 3

Created by:

```text
backend/prisma/seed.ts
```

Deterministic IDs:

```text
seed-lead-1
seed-lead-2
seed-lead-3
```

Seed behavior:

1. upserts the Demo User;
2. creates `seed-search-task`;
3. resolves the Mock Search Provider;
4. normalizes mock results;
5. persists three Leads;
6. adds one mock AI analysis.

Evidence:

```text
provider: mock
sourceUrl: example.com/.../mock-*
company domain: null
website: null
intentScore: 90 or 93
```

Classification: `TEST DATA`.

### 2.2 buyer_industrial_automation_* records

These are also `provider=mock` rows created by Mock Provider executions during
earlier development/testing.

They are not all deterministic seed rows. The database currently contains 11
mock Leads in total, while the current seed explicitly owns three.

Observed examples:

```text
buyer_industrial_automation_4
buyer_industrial_automation_3
buyer_industrial_automation_suppliers_usa_5
```

They use `example.com` source URLs and have no verified company domain.

Classification: `TEST DATA`.

### 2.3 Shorr Packaging records

The database contains five Lead rows from one LinkedIn company URL:

```text
https://www.linkedin.com/company/shorr-packaging
```

Examples include:

```text
Shorr Packaging Corp
Shorr Packaging Corp. Shorr Packaging Corp
Shorr Packaging Corp. Shorr Packaging Corp. is a Packaging
more. Shorr Packaging Corp. employs 420 people
Containers Manufacturing - Type: Privately Held - Headquarters: Aurora
```

These were generated by an earlier multi-candidate extraction implementation.
They have:

- `provider=agent-reach`;
- intent score 90;
- no company domain;
- no website;
- no SearchTaskLead ownership;
- duplicated source URL;
- sentence fragments mistaken as company names.

One malformed Shorr record has LeadResearch values:

```text
leadQuality: low
leadCategory: buyer
priority: A
salesRecommendation: nurture
```

This internally contradictory research state is not a verification signal.

Classification: `LEGACY, UNVERIFIED DATA`.

### 2.4 Demo User ownership

Current users:

| Email | Leads | SearchTasks |
| --- | ---: | ---: |
| `demo@salesradar.local` | 149 | 60 |

There are no other users in the current database.

`ensureDemoUser()` is used by SearchTask and several business services, but
`listLeads()` does not call it. The fact that every record currently belongs to
the Demo User is a database accident, not an enforced read boundary.

If another user's Lead existed, `/api/leads` would return it as well.

---

## 3. Current Lead classification

### 3.1 Classification rules used for this audit

#### Real verified Lead

Required:

- identifiable company;
- verified official domain/website;
- usable source evidence;
- ProductContext/customer relevance;
- user ownership;
- qualified current-task relationship.

#### Test data

Any of:

- `provider=mock`;
- deterministic `seed-lead-*` ID;
- mock-style identity;
- `example.com/.../mock-*` source.

#### Unverified Lead

Real Provider evidence exists, but one or more are missing:

- verified company;
- official domain;
- source-to-company relationship;
- ProductContext relevance;
- quality-gate pass.

#### Legacy data

Historical AgentReach record that does not participate in the current
SearchTaskLead result-ownership model, especially records produced by superseded
extraction behavior.

### 3.2 Database results

| Category | Count | Assistant-safe |
| --- | ---: | ---: |
| Real verified Lead | 0 | Yes, if user-owned |
| Test/mock data | 11 | No |
| Legacy data | 113 | No |
| Current unverified data | 25 | No |

Additional findings:

- 124 of 149 Leads have no SearchTaskLead relationship.
- 25 have current task ownership but remain unverified.
- 0 current Leads meet strict company/domain/evidence/relevance requirements.
- 0 Leads are currently associated with enough ProductProfile research evidence
  to prove the required relevance definition.
- No current Lead belongs to a failed SearchTask, but the list query does not
  prevent this if such rows appear later.

### 3.3 Why “real Provider” does not mean “verified Lead”

`provider=agent-reach` proves only that a real search source was used.

It does not prove:

- the page represents a customer;
- the company field is accurate;
- the domain is official;
- the content describes current buying intent;
- the company matches the selected product.

AgentReach data can therefore be real evidence and still be unsafe for the
Assistant.

---

## 4. Why these records appear first

The backend sorts solely by `intentScore DESC`.

Current top records:

| Record | Type | Score |
| --- | --- | ---: |
| `buyer_industrial_automation_4` | Mock | 93 |
| `Mock Buyer 3` | Seed mock | 93 |
| `Mock Buyer 1` | Seed mock | 93 |
| malformed Shorr fragments | Legacy | 90 |
| additional mock buyers | Mock | 89–90 |

The Assistant therefore behaves consistently with the current query: it
surfaces the highest numeric scores, even when the identities are fake or
unverified.

This also demonstrates that `intentScore` cannot serve as a trust score.

---

## 5. Production safety assessment

### 5.1 Current safety result

The current Assistant list is not production safe.

Reasons:

1. no authenticated user filter;
2. Demo User is shared by all current workflows;
3. test fixtures are mixed into the same table;
4. legacy and current data are mixed;
5. no verified/qualified state exists;
6. no official-domain requirement;
7. SearchTaskLead ownership is ignored;
8. static frontend mock fallback is silent;
9. default conversation auto-selects the highest score;
10. Lead detail and analysis lookups also use IDs without an explicit active-
    user filter in the Lead service.

### 5.2 Required Assistant display policy

The Assistant should display a Lead only when:

```text
lead.userId == authenticatedUser.id
AND dataClass == PRODUCTION
AND identityStatus == VERIFIED
AND qualificationStatus == QUALIFIED
AND company IS NOT NULL
AND normalizedDomain IS NOT NULL
AND valid evidence exists
AND ProductContext relevance passed
AND source SearchTask status == COMPLETED
AND SearchTaskLead ownership exists
```

Mock fixtures, unverified evidence, rejected evidence, failed-task artifacts,
and legacy rows must not be returned.

### 5.3 Assistant selection policy

The Assistant should not automatically analyze `response.data[0]`.

Safe behavior:

- require an explicitly selected qualified Lead; or
- present a clear empty state and ask the user to choose from qualified Leads.

Ranking can be applied only after the trust filter.

Suggested rank order:

```text
verified identity
  -> product relevance
  -> buying signal quality
  -> contact availability
  -> intent score
```

### 5.4 Mock fallback policy

Production behavior:

- never silently return `CHAT_SESSIONS`;
- show an explicit unavailable/empty state when the API fails;
- never use `DEFAULT_CHAT_MESSAGES` to imply a real customer;
- never mention fictional customer facts in a production conversation.

Demo behavior may keep fixtures only when explicitly enabled and visibly
labelled as Demo.

---

## 6. Recommended API and repository design

These are recommendations only; no code was changed in this audit.

### 6.1 Dedicated Assistant query

Preferred:

```http
GET /api/assistant/leads
```

The server, not the frontend, enforces:

- authenticated user ownership;
- verified identity;
- quality-gate pass;
- completed-task provenance;
- evidence and relevance requirements.

This avoids making frontend code responsible for security and trust.

Alternative:

```http
GET /api/leads?scope=assistant
```

This is acceptable only if `scope=assistant` maps to a fixed server policy and
cannot be weakened by arbitrary query flags.

### 6.2 Repository methods

Separate repository intent:

```text
listQualifiedAssistantLeads(userId)
listCurrentSearchResults(userId, searchTaskId)
listHistoricalQualifiedLeads(userId)
listEvidenceForReview(userId)
```

Do not reuse an unrestricted `listLeads()` for every product surface.

### 6.3 Response trust metadata

Each Assistant Lead response should include:

```json
{
  "dataOrigin": "agent-reach",
  "identityStatus": "VERIFIED",
  "qualificationStatus": "QUALIFIED",
  "company": "...",
  "normalizedDomain": "...",
  "evidenceSummary": "...",
  "matchReason": "...",
  "productProfileId": "..."
}
```

The frontend should not derive these states from nullable fields.

---

## 7. Database cleanup strategy

### 7.1 Safety principle

Do not begin with a broad destructive delete.

Recommended sequence:

1. take a database backup;
2. produce a classification inventory;
3. quarantine or archive unsafe rows;
4. verify all production queries exclude them;
5. delete only deterministic test fixtures after validation.

### 7.2 Test/mock cleanup

Deterministic cleanup candidates:

- `provider=mock`;
- IDs matching `seed-lead-*`;
- source URLs under `example.com` with mock paths;
- `seed-search-task`;
- mock analyses associated with those Leads.

In the current database this targets 11 Lead rows, but cleanup should use
explicit predicates and a pre-delete count.

### 7.3 Legacy cleanup

Quarantine AgentReach rows when:

- no SearchTaskLead relationship exists;
- identity came from a superseded extractor;
- company value is a sentence fragment or generic term;
- no verified official domain exists;
- multiple rows share one source URL without separate verified identity;
- content is blocked, empty, or generic.

Current estimate: 113 legacy AgentReach Leads.

Do not automatically delete potentially useful source evidence. In a future
SearchEvidence migration, retain the source URL/content as evidence and remove
its Lead promotion.

### 7.4 Current unverified data

The 25 SearchTask-owned but unverified rows should be hidden from Assistant.

Future treatment:

- migrate to `SearchEvidence`;
- run Company Identity Extraction;
- promote only those passing the Lead Quality Gate;
- keep failures as evidence/rejection records.

### 7.5 Shorr Packaging

The five Shorr rows should not be merged into a single trusted Lead
automatically.

Safe treatment:

1. archive the malformed candidates;
2. retain the LinkedIn source URL as evidence;
3. independently verify company name and official domain;
4. create one canonical company Lead only after the quality gate passes.

---

## 8. Environment separation

### 8.1 Separate databases

Use distinct databases or schemas for:

- development;
- automated tests;
- demo;
- production.

Test and demo seed operations must never target the production database.

### 8.2 Seed safety

Recommended safeguards:

- seed script refuses to run when `NODE_ENV=production`;
- production deployment does not execute `prisma db seed`;
- CI tests use an ephemeral database;
- seeded rows carry an explicit `dataClass=TEST` or reside only in demo storage.

### 8.3 Demo mode

Demo mode should be explicit:

```text
DEMO_MODE=true
```

Recommended properties:

- separate Demo User/tenant or separate database;
- visible “Demo data” label;
- no mixing with real user Leads;
- no demo fallback when production APIs fail;
- demo reset is isolated and repeatable.

The current `demo@salesradar.local` identity is being used as the application
identity, not merely as an optional demo tenant.

---

## 9. Recommended implementation order

### P0 — stop unsafe display

1. Enforce active-user ownership in Lead list/detail/analysis queries.
2. Add a server-side Assistant-qualified Lead query.
3. Exclude `provider=mock`, seed IDs, and unqualified/legacy records.
4. Remove silent static session fallback in production.
5. Stop automatic highest-score Lead selection.

### P0 — establish trust status

1. Implement SearchEvidence and Company Identity Extraction.
2. Add explicit identity and qualification status.
3. require verified official domain, evidence, and ProductContext relevance.
4. keep intent score separate from trust.

### P1 — clean and separate data

1. back up and inventory the database;
2. remove deterministic mock fixtures;
3. quarantine legacy Leads;
4. migrate useful source material to SearchEvidence;
5. split development/demo/test/production databases.

### P1 — Assistant conversation truth

1. load messages for the selected qualified Lead;
2. do not use fictional default customer facts;
3. show evidence and missing-information warnings;
4. keep outreach generation disabled for unverified evidence.

---

## 10. Acceptance criteria for a production-safe Assistant

The audit should be considered resolved only when:

1. a user cannot retrieve another user's Lead;
2. mock and seed data cannot appear outside explicit Demo mode;
3. legacy/unverified records are excluded server-side;
4. failed searches contribute zero Assistant Leads;
5. every displayed Lead has verified company/domain/evidence/relevance;
6. default conversation does not auto-select an arbitrary Lead;
7. API failures display an honest empty/error state;
8. intent score affects ranking only after qualification;
9. Assistant answers reference the selected Lead and its evidence;
10. tests cover tenant isolation, mock exclusion, legacy exclusion, and empty
    qualified result behavior.

## Final conclusion

The observed records do not come from LocalStorage. They come from the database
through an unrestricted Lead list endpoint.

The immediate cause is:

```text
Assistant -> GET /leads?sort=desc -> all Leads -> highest intent first
```

The deeper cause is:

```text
Demo/test/legacy/evidence/qualified data share one Lead table
without a server-enforced trust boundary.
```

The production-safe direction is to let the Assistant consume only an explicit,
user-scoped, verified, qualified Lead projection. Until that boundary exists,
the Assistant must not present the current database rows as trustworthy
customers.

