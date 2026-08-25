# Sales Radar AI Project Blueprint

Last updated: 2026-08-25
Owner intent: build Sales Radar AI into a two-sided, evidence-first opportunity marketplace and sales operating workspace.

## 1. North star

Sales Radar AI helps a seller, buyer, partner-seeker, distributor-seeker, or market researcher define a commercial target, discover relevant public evidence, assess whether a real opportunity exists, find attributable public business contacts, communicate through explicit user-controlled actions, and track revenue evidence.

The product should feel as operational and stateful as a modern marketplace: the user always knows which commercial target they are working on, what the system recommends next, which records are new, which require judgment, which have moved into communication, and which outcomes are verified.

The product is not a customer database and does not manufacture intent.

## 2. Permanent truth hierarchy

```text
Source
  -> Raw data
  -> Evidence
  -> Fact
  -> Assessment
  -> Recommendation
  -> Explicit user action
  -> Verifiable outcome
```

Protected statements:

- Source != Evidence.
- Evidence != purchase intent.
- MarketSignal != Opportunity.
- Opportunity != Qualified Lead.
- CompanyProfile != Customer.
- Generated outreach != sent outreach.
- Opened external channel != sent message.
- Potential revenue != confirmed revenue != paid revenue.

Never increase visible counts by weakening these boundaries.

## 3. Product direction: buyer/seller opportunity workspace

The interaction model is inspired by successful two-sided marketplaces and recruiting products without copying brand trade dress, proprietary assets, or protected UI details.

### Marketplace translation

| Marketplace / recruiting pattern | Sales Radar AI equivalent |
| --- | --- |
| Position / demand management | Commercial target management |
| Candidate recommendation | Recommended opportunity / account feed |
| Talent search | Global evidence-backed search |
| Chat inbox | Sales communication workspace |
| Candidate intent | Verified buyer/seller/partner intent signals |
| Interaction history | Views, saves, research, contact, replies, meetings, outcomes |
| Candidate profile | Company / public-contact intelligence profile |
| Hiring funnel | Opportunity -> qualification -> communication -> outcome -> revenue evidence |

### User goal modes

The workspace must support both sides of a commercial market:

- **I sell / FIND_BUYERS**: find likely buyers and buying-side signals.
- **I buy / FIND_SUPPLIERS**: find suppliers and supply-side signals.
- **I partner / FIND_PARTNERS**: find partnership opportunities.
- **I distribute / FIND_DISTRIBUTORS**: find channel/distribution opportunities.
- **I research / RESEARCH_COMPETITORS or EXPLORE_MARKET**: gather market intelligence without forcing a sales lead outcome.

These modes must change the actual research/search intent sent upstream, not only UI labels.

## 4. Core workspace information architecture

Primary navigation target state:

1. **AI workbench** — conversational command center and tool orchestration.
2. **Targets** — persistent commercial targets and their state.
3. **Recommended** — evidence-ranked signals/opportunities for the active target.
4. **Search** — proactive global search with rich filters and result ranking.
5. **Communication** — drafts and externally verified communication states.
6. **Intent** — only verified or attributable intent/interaction signals.
7. **Revenue** — discover -> assess -> live execute -> settle.
8. **Settings** — providers, models, runtime, data-source state and operator gates.

The first implementation may reuse existing routes where that preserves stability:

- `/app/home` -> AI workbench
- `/app/market` -> Recommended / market radar
- `/app/discover` -> Search
- `/app/revenue` -> Revenue
- new routes should only be added when backed by truthful state.

## 5. Interaction principles extracted from the reference product

### A. Persistent target context

The user should not re-describe the same commercial goal on every page. A selected target should carry product/service, buyer/supplier/partner goal, industry, region, entity role and signal focus across recommendation and search workflows.

### B. Dense recommendation cards

A recommendation card should answer, at a glance:

- Who/what is this entity?
- Why is it relevant to the active target?
- What changed?
- Which source proves it?
- How fresh is the evidence?
- What is known vs inferred?
- What is the safest next action?

Quick actions must operate on real state: view evidence, continue assessment, save, research, prepare outreach, or enter Live execution when eligible.

### C. Search behaves like an operating tool

Search must combine a prominent query field with practical filters, sorting, result counts, and lightweight cards. Filters must affect the real query or result selection. Empty and provider-failure states must be explicit.

### D. Communication is a state machine, not a fake chat demo

Communication states should distinguish at minimum:

```text
DRAFT
READY_TO_SEND
CHANNEL_OPENED
SENT_VERIFIED
REPLIED_VERIFIED
MEETING_VERIFIED
CLOSED
```

Do not render a conversation as sent unless a platform/API/user-confirmed receipt exists.

### E. Intent and interaction are evidence views

Intent surfaces should be derived from attributable evidence such as replies, saved/contacted state, public buying signals, repeated verified interaction, meetings or explicit user confirmation. Predicted intent must remain a score or recommendation, never a factual event.

## 6. Data and backend evolution

Prefer adapting existing entities before adding new ones.

Existing useful foundations:

- ProductProfile
- SearchTask
- SearchEvidence
- RadarAssessment
- MarketSignal
- Opportunity
- CompanyProfile
- ContactProfile
- LeadOutcome
- OutreachMessage
- Revenue evidence/state
- DataSource / IngestionRun / RawSourceDocument

Candidate future model if persistence cannot be represented cleanly with existing entities:

`CommercialTarget` / `OpportunityCampaign`

Suggested fields:

- id / userId
- name
- productProfileId or product snapshot
- goal: FIND_BUYERS | FIND_SUPPLIERS | FIND_PARTNERS | FIND_DISTRIBUTORS | RESEARCH_COMPETITORS | EXPLORE_MARKET
- industry / region / entity-role filters
- signalFocus
- status: DRAFT | ACTIVE | PAUSED | CLOSED
- createdAt / updatedAt

Do not add this model until a real UI flow requires persistence that ProductProfile + SearchTask cannot safely represent.

## 7. Crawl, social and agent integration

Crawl4AI, social-source provenance, LiveKit Agent Runtime and direct provider search are enrichment layers, not alternate truth systems.

Required flow:

```text
Commercial target
  -> Search intent
  -> SearchTask
  -> Provider results
  -> optional Crawl4AI enrichment
  -> social/source provenance preservation
  -> SearchEvidence
  -> RadarAssessment / MarketSignal
  -> Opportunity integrity path
  -> Company/contact intelligence
  -> Agent recommendation
  -> explicit user action
```

Agent failure must never invalidate a search chain that independently passed.

## 8. Open-source technology watch

Every meaningful product iteration should check for relevant actively maintained open-source projects and recent technical information before introducing a new subsystem.

### Watch categories

- sales intelligence / CRM
- marketplace and recommendation UX
- customer communication inboxes
- search, reranking and RAG
- public-web crawling and extraction
- browser automation
- social-source ingestion
- agent orchestration / MCP
- evaluation, tracing and observability

### Adoption rules

1. Verify repository identity, maintenance activity, release recency and license before use.
2. Apache-2.0 / MIT / BSD-compatible code is preferred.
3. Copyleft or source-available projects may be studied for product patterns but their code must not be copied into this Apache-2.0 repository unless legal compatibility is explicitly resolved.
4. Integrate only the smallest files/components/ideas that solve a concrete verified weakness.
5. Record adopted project, source commit/tag, license, files/ideas used, local modifications and tests.
6. Do not add a dependency only because it is popular.
7. New external runtimes remain behind interfaces/factories.

Current watch references:

- `unclecode/crawl4ai` — Apache-2.0; already represented through an optional content-provider adapter.
- `livekit/agents` / `livekit/agents-js` — framework code Apache-2.0; model licenses are separate and must be reviewed independently.
- `chatwoot/chatwoot` — core outside enterprise directory is MIT; useful as a communication-inbox interaction reference. Prefer original Sales Radar components unless a small compatible component is demonstrably worth adapting.

## 9. Context recovery protocol

When conversation/context becomes long or a new coding agent starts work, recover project direction in this order:

1. `AGENTS.md`
2. `PROJECT_BLUEPRINT.md`
3. `CONTEXT.md`
4. `.agent/PROJECT_MEMORY.md`
5. relevant `.agent/skills/*/SKILL.md`
6. relevant ADR/spec/plan
7. current code and open PR/issue evidence

If implementation reveals a better validated direction, update this blueprint in the same change or immediately after the evidence is accepted. Do not let implementation drift become undocumented product strategy.

## 10. Change log discipline

For every major direction change, append a dated note containing:

- what changed;
- why the previous direction was insufficient;
- evidence supporting the change;
- affected routes/models/providers;
- what remains protected;
- rollback path.

## 11. Current phase — 2026-08-25

Goal: translate the strongest marketplace/recruiting interaction patterns into an original Sales Radar buyer/seller opportunity workflow while preserving production truth boundaries.

Phase 1 deliverables:

- make Search a first-class navigation surface;
- make the market/recommendation workspace more target-driven and card-oriented;
- expose buyer/supplier/partner goal semantics in the active target;
- add a persistent target context without inventing backend facts;
- add regression tests for navigation and target semantics;
- keep current production search, market Live View and revenue workflow invariants intact.

Phase 2 deliverables:

- persisted commercial target management;
- communication workspace backed by real draft/send/reply state;
- verified intent and interaction views;
- tighter opportunity-to-communication handoff;
- LiveKit realtime agent surface where runtime configuration is valid.

Phase 3 deliverables:

- recommendation learning from explicit feedback and verified outcomes;
- richer source ingestion, job-platform/public hiring signals and global social evidence;
- evaluation and ranking benchmarks;
- safe workflow automation with explicit approvals.
