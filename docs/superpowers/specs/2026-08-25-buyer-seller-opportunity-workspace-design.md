# Buyer/Seller Opportunity Workspace Design

Date: 2026-08-25
Status: approved by owner directive to proceed without follow-up questions

## Problem

Sales Radar AI already has strong evidence, search, market-intelligence, agent and revenue foundations, but the user experience is still organized around separate technical workspaces. The reference recruiting product demonstrates a stronger operating model: a user defines a standing demand, receives recommendations, proactively searches, communicates, observes intent/interaction, and manages outcomes without repeatedly rebuilding context.

Sales Radar needs the same operational continuity for commercial markets without copying the reference product's brand identity or making unverified intent appear factual.

## Design principle

Treat a commercial market like a two-sided marketplace. The active user can be a seller, buyer, partner seeker, distributor seeker or researcher. The product should keep one active commercial target in context and let the user move through:

```text
Target -> Recommended -> Search -> Assess -> Research -> Communicate -> Outcome -> Revenue evidence
```

The system remains evidence-first:

```text
Source -> Evidence -> Fact -> Assessment -> Recommendation -> Explicit action -> Verifiable outcome
```

## Reference interaction mapping

The supplied screenshots show six reusable patterns:

1. **Demand/position management** — a persistent object with status and operational counts.
2. **Recommended candidate feed** — dense cards with relevance, activity and a low-friction next action.
3. **Search workspace** — prominent query plus rich filters, result sorting and compact cards.
4. **Communication inbox** — list/detail split with entity context visible while conversing.
5. **Intent workspace** — a separate place for stronger inbound/reciprocal signals.
6. **Interaction workspace** — passive activity and state changes separated from direct communication.

Sales Radar translation:

- position -> commercial target;
- candidate -> company/public contact/opportunity;
- recommendation -> evidence-ranked market signal/opportunity;
- greeting/chat -> prepare outreach / open verified channel / record verified reply;
- candidate intent -> verified buyer/supplier/partner intent evidence;
- interaction -> saved, researched, contacted, replied, meeting, outcome events.

## Architecture

### 1. Navigation

Keep current stable routes and surface the existing Search route as a first-class workspace.

Phase 1 navigation:

- `/app/home` — AI workbench
- `/app/market` — Recommended / market radar
- `/app/discover` — Search
- `/app/revenue` — Revenue
- `/app/account` — Settings

A compact workflow cue in the shell should make the path visible without adding fake pages.

Phase 2 may add Target, Communication, Intent and Interaction routes only after they are backed by truthful persistent state.

### 2. Active commercial target

Extend the current market target with a true business goal:

```ts
type RadarCustomerGoal =
  | 'FIND_BUYERS'
  | 'FIND_SUPPLIERS'
  | 'FIND_PARTNERS'
  | 'FIND_DISTRIBUTORS'
  | 'RESEARCH_COMPETITORS'
  | 'EXPLORE_MARKET'
```

The goal must be submitted to market research/search APIs and influence upstream query construction or assessment semantics. It must not be a visual-only toggle.

The current backend already has a `RadarCustomerGoal` enum, so phase 1 should extend the existing market-research request/contract rather than introduce a new model.

### 3. Recommendation workspace

The Market Radar page remains the primary recommendation surface. Phase 1 improves it with:

- clear buyer/supplier/partner/research goal selection;
- target context that resembles an active marketplace demand;
- evidence-aware recommended signal cards/timeline already present;
- clear next actions that stay on `/app/market` for assessment;
- visible handoff to Search for proactive exploration.

Do not create a new recommendation datastore in phase 1.

### 4. Search workspace

The existing Discover page is already close to the desired proactive search pattern. Make it first-class in navigation and preserve:

- prominent search box;
- industry/region/customer-type filters;
- real result counts;
- radar/opportunity/contact categories;
- sorting and audience filtering;
- public-contact discovery only where eligible.

Phase 1 should not redesign all Discover internals at once. Navigation and target-language consistency are the first useful slice.

### 5. Communication, intent and interaction

Do not implement fake BOSS-style chat with demo data.

Before these routes are added, backend state must distinguish:

```text
DRAFT
READY_TO_SEND
CHANNEL_OPENED
SENT_VERIFIED
REPLIED_VERIFIED
MEETING_VERIFIED
CLOSED
```

`OutreachMessage`, `LeadOutcome`, explicit operator actions and provider receipts can become the source of truth. Until then, existing AI conversation and Revenue Live surfaces remain separate.

### 6. UI originality

Borrow interaction principles, not trade dress:

- keep Sales Radar dark navy/brand shell;
- keep current typography, spacing primitives and card language;
- do not copy BOSS logo, icons, colors, exact card geometry, wording or paid-feature patterns;
- use original buyer/seller terminology and evidence badges.

## Data flow

Phase 1 market flow:

```text
User sets product/service + commercial goal + industry + region + signal focus
  -> POST market research request
  -> provider query reflects goal
  -> SearchEvidence / MarketSignal / RadarAssessment
  -> Market workspace renders evidence and recommendation
  -> user continues assessment on same page
  -> optional proactive Search route
```

Search and Agent remain independently verifiable.

## Error handling

- Provider unavailable: explicit research/search failure state.
- Empty results: state that no verifiable sources were found; do not create placeholders.
- Agent unavailable: report runtime state without negating search success.
- Missing target: disable scan rather than submitting incomplete intent.
- Unsupported goal at backend: typed validation error; frontend must not silently fall back to FIND_BUYERS.

## Tests

Phase 1 tests must verify:

1. Sidebar exposes Search as a primary route.
2. Market target contains commercial-goal controls.
3. Changing the goal changes the request passed to `runMarketResearch`.
4. Existing `继续判断当前信号` stays on `/app/market` and no `/app/discover` regression is introduced into `SignalAssessmentPanel`.
5. Market Live View fullscreen/viewport tests remain unchanged and green.
6. Revenue workflow tests remain green.
7. Frontend typecheck/build and backend typecheck/tests/build pass through CI.

## Open-source research constraints

Technology watch is required before introducing a new subsystem. Current useful references:

- Crawl4AI: external content acquisition, Apache-2.0, already behind a provider interface.
- LiveKit Agents / agents-js: realtime agent runtime, framework Apache-2.0; model license reviewed separately.
- Chatwoot: MIT outside enterprise directory; useful reference for future inbox list/detail separation.
- Copyleft/source-available CRM projects may inform ideas only unless compatibility is explicitly resolved.

Do not vendor external code during phase 1 unless a concrete component is needed and its license plus attribution are documented.

## Rollback

Phase 1 is intentionally reversible:

- navigation additions can be reverted without schema changes;
- market goal UI/contract can be reverted to the previous target contract;
- no persistent migration is required;
- protected Evidence/Opportunity/Revenue models are not changed.
