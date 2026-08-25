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

Primary navigation is now:

1. **AI 工作台** — conversational command center and tool orchestration.
2. **目标** — persistent commercial targets and their state.
3. **推荐** — evidence-ranked signals/opportunities for the active target; currently reuses Market Radar.
4. **搜索** — proactive global search with rich filters and result ranking.
5. **沟通** — communication preparation and, only when evidence exists, verified communication state.
6. **意向** — only persisted/attributable outcome states; predictions remain predictions.
7. **收益** — discover -> assess -> live execute -> settle.
8. **设置** — providers, models, runtime, data-source state and operator gates.

Current route mapping:

- `/app/home` -> AI 工作台
- `/app/targets` -> 目标
- `/app/market` -> 推荐 / 市场雷达
- `/app/discover` -> 搜索
- `/app/communication` -> 沟通
- `/app/intent` -> 意向
- `/app/revenue` -> 收益
- `/app/account` -> 设置

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

Do not render a conversation as sent unless a platform/API/user-confirmed receipt exists. The current `/app/communication` implementation is deliberately a preparation workspace backed by real lead/public-contact records; it does not manufacture send or reply events.

### E. Intent and interaction are evidence views

Intent surfaces should be derived from attributable evidence such as replies, saved/contacted state, public buying signals, repeated verified interaction, meetings or explicit user confirmation. Predicted intent must remain a score or recommendation, never a factual event.

The current `/app/intent` implementation reads persisted `LeadOutcome` records and only surfaces `REPLIED`, `MEETING`, `QUALIFIED`, `PROPOSAL`, `WON`, or `LOST` as verified workflow outcomes. Prediction scores are excluded.

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
- CommercialTarget

`CommercialTarget` is now the persisted long-running demand object required by the marketplace workflow.

Current fields:

- id / userId
- name / product
- goal: FIND_BUYERS | FIND_SUPPLIERS | FIND_PARTNERS | FIND_DISTRIBUTORS | RESEARCH_COMPETITORS | EXPLORE_MARKET
- industry / region / customerType
- signalFocus
- status: DRAFT | ACTIVE | PAUSED | CLOSED
- lastRunAt
- createdAt / updatedAt

`lastRunAt` is **server-owned run evidence**. Generic target create/update clients cannot write it. It is recorded only after a successful Market Research request whose submitted target context exactly matches the persisted target for the same user.

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

Implemented in the current delivery slice:

- Search is a first-class navigation surface.
- Market research supports buyer/supplier/partner/distributor/competitor/exploration goals that alter real upstream research intent.
- Commercial targets are persisted and can be restored exactly into Market Radar.
- Target `lastRunAt` is server-owned successful-run evidence, not client-editable metadata.
- Primary navigation follows `AI 工作台 -> 目标 -> 推荐 -> 搜索 -> 沟通 -> 意向 -> 收益 -> 设置`.
- Communication workspace is backed by real discovered leads/public contacts and does not invent sent/replied state.
- Intent workspace is backed by persisted `LeadOutcome` records and excludes predicted purchase probability.
- Existing Market Live fullscreen/viewport semantics and Revenue truth boundaries remain protected.

Next delivery slices:

- tighter target-to-recommendation and target-to-search context handoff;
- real outbound transport/receipt ingestion before `SENT_VERIFIED` can exist;
- reply/meeting ingestion with attributable evidence;
- LiveKit realtime agent surface where runtime configuration is valid;
- recommendation learning from explicit feedback and verified outcomes;
- richer source ingestion, job-platform/public hiring signals and global social evidence;
- evaluation and ranking benchmarks;
- safe workflow automation with explicit approvals.

## 12. Deployment discipline — 2026-08-25

Vercel is connected to Git pushes and builds every preview commit. Deliberately RED TDD commits caused noisy preview failure emails even when the failure was expected. For Vercel-connected feature branches, keep TDD locally/CI-isolated where practical and publish atomic implementation + contract commits so the branch does not linger in intentionally broken build states.

This deployment discipline must not weaken tests: GitHub CI remains the merge gate, and production is only considered complete after frontend CI, backend CI, Vercel production, both Railway services, production API semantics, and protected UI workflow invariants are revalidated.
