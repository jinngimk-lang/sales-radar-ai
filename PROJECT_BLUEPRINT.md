# Sales Radar AI Project Blueprint

Last updated: 2026-08-25
Owner intent: build Sales Radar AI into a two-sided, evidence-first opportunity marketplace and sales operating workspace, operated as a continuously maintained autonomous project within explicit safety boundaries.

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

Future communication automation must add a control plane before autonomous channel behavior is enabled:

```text
Channel / audience scope
  -> schedule / availability policy
  -> explicit user or policy-authorized action
  -> provider send/call event
  -> attributable receipt / reply / meeting event
  -> evidence-backed interaction timeline
```

Templates, agent availability, audience rules and scheduling may improve the operating experience, but they do not weaken send/reply evidence requirements.

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

Realtime-agent adoption has additional privacy and observability gates. Before storing transcripts, recordings or realtime interaction traces, define retention, PII handling/redaction, telemetry destination, user visibility and failure behavior. Provider-side redaction is a useful defense layer but is never the sole privacy boundary.

## 8. Open-source technology watch

Every meaningful product iteration should check for relevant actively maintained open-source projects and recent technical information before introducing a new subsystem. In addition, the project runs a recurring continuous radar so important upstream changes are not dependent on a single feature iteration.

The auditable record is `docs/technology-radar.md`.

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
- provider/model/runtime changes that can affect production
- privacy/PII handling for realtime communication

### Adoption rules

1. Verify repository identity, maintenance activity, release recency and license before use.
2. Apache-2.0 / MIT / BSD-compatible code is preferred.
3. Copyleft or source-available projects may be studied for product patterns but their code must not be copied into this Apache-2.0 repository unless legal compatibility is explicitly resolved.
4. Integrate only the smallest files/components/ideas that solve a concrete verified weakness.
5. Record adopted project, source commit/tag, license, files/ideas used, local modifications and tests.
6. Do not add a dependency only because it is popular.
7. New external runtimes remain behind interfaces/factories.
8. A healthy current runtime is a reason to defer redundant infrastructure until a concrete limitation appears.
9. Failed experiments are recorded and rolled back; tests/truth boundaries are not weakened to force adoption.

Technology-radar statuses:

```text
WATCH
EXPERIMENT
ADOPTED
DEFERRED
REJECTED
```

Current watch references:

- `unclecode/crawl4ai` — Apache-2.0; current observed release `v0.9.2`; already represented through an optional content-provider/enrichment path. Do not add a second crawler simply because the upstream released a new version.
- `livekit/agents` / `@livekit/agents` — Apache-2.0; current observed package `1.7.0`; strong candidate for realtime communication, subject to PII/retention/observability requirements.
- `browser-use/browser-use` — MIT; current observed package `0.13.8`; deferred while Browserbase remains the healthy production browser path.
- `chatwoot/chatwoot` — useful communication-inbox interaction reference. August 2026 updates reinforce template visibility, audience/schedule controls, call timelines and drill-down from metrics to source conversations. Prefer original Sales Radar components unless a small compatible component is demonstrably worth adapting.

## 9. Context recovery protocol

When conversation/context becomes long or a new coding agent starts work, recover project direction in this order:

1. `AGENTS.md`
2. `PROJECT_BLUEPRINT.md`
3. `docs/technology-radar.md`
4. `CONTEXT.md`
5. `.agent/PROJECT_MEMORY.md`
6. relevant `.agent/skills/*/SKILL.md`
7. relevant ADR/spec/plan
8. current code and open PR/issue/CI/deployment evidence

If implementation reveals a better validated direction, update this blueprint in the same change or immediately after the evidence is accepted. Do not let implementation drift become undocumented product strategy.

## 10. Change log discipline

For every major direction change, append a dated note containing:

- what changed;
- why the previous direction was insufficient;
- evidence supporting the change;
- affected routes/models/providers;
- what remains protected;
- rollback path.

For external technology adoption, `docs/technology-radar.md` must additionally record upstream version/date, license, exact problem solved, files/protocols/ideas used, verification and rollback.

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
- Autonomous owner governance and the continuous technology radar are now part of the project operating model.

Next delivery slices:

- tighter target-to-recommendation and target-to-search context handoff;
- real outbound transport/receipt ingestion before `SENT_VERIFIED` can exist;
- reply/meeting ingestion with attributable evidence;
- communication control plane for channel scope, audience rules, templates and schedule/availability policy;
- LiveKit realtime agent evaluation where runtime configuration is valid, including explicit PII/retention/observability design;
- recommendation learning from explicit feedback and verified outcomes;
- richer source ingestion, job-platform/public hiring signals and global social evidence;
- evaluation and ranking benchmarks;
- safe workflow automation with explicit policy authorization and verifiable outcomes.

## 12. Deployment discipline — 2026-08-25

Vercel is connected to Git pushes and builds every preview commit. Deliberately RED TDD commits caused noisy preview failure emails even when the failure was expected. For Vercel-connected feature branches, keep TDD locally/CI-isolated where practical and publish atomic implementation + contract commits so the branch does not linger in intentionally broken build states.

This deployment discipline must not weaken tests: GitHub CI remains the merge gate, and production is only considered complete after frontend CI, backend CI, Vercel production, both Railway services, production API semantics, and protected UI workflow invariants are revalidated.

## 13. Autonomous owner operating contract — 2026-08-25

The owner delegates normal, reversible, evidence-backed repository decisions to the project operating agent within the actual permissions available through connected tools. This includes research, issues, branches, file changes, pull requests, CI/reverification, validated merges, deployment coordination and repository documentation updates without repeated approval for each routine action.

The autonomous default does not include destructive or irreversible operations, secrets/credential changes, paid-plan changes, legal commitments, sensitive security disclosure, or repository-external publication. Those remain subject to the applicable safety and authorization gate.

### Autonomous maintenance loop

```text
Recover authoritative context
  -> inspect production and open-work evidence
  -> scan relevant GitHub projects + technical/provider changes
  -> classify maintenance/activity/license/value/risk
  -> WATCH / DEFER when there is no concrete gap
  -> EXPERIMENT when a reversible test can falsify the benefit
  -> ADOPT only the smallest change that solves a verified weakness
  -> run tests / CI / deployment verification
  -> update docs/technology-radar.md
  -> update PROJECT_BLUEPRINT.md when validated direction changes
```

### Notification discipline

Routine healthy checks, unchanged release states and non-actionable watch items remain silent. Notify the owner only for a meaningful production regression, blocked integration, quota/plan/credential intervention, destructive-risk decision, or material strategy change that cannot be safely completed under the existing delegation.

### Current radar decision record

The 2026-08-25 scan found relevant active upstream work but no reason to stack a second production crawler or browser runtime today. Crawl4AI stays on the existing adapter/enrichment path; Browser Use remains deferred while Browserbase is healthy; LiveKit Agents remains a high-value realtime candidate with privacy/observability gates; Chatwoot is used as communication-workflow research rather than copied product code.
