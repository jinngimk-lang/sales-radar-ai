# Sales Radar Full Intelligence Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-safe intelligence loop that preserves the existing SearchTask and sales domain while adding real Crawl4AI content acquisition, source/freshness ranking, providerized social-source handling, a pluggable Agent Runtime with a LiveKit bridge, and explicit-user-action Revenue Live behavior.

**Architecture:** URL discovery remains owned by AgentReach/Exa. Crawl4AI is an optional content-acquisition adapter between provider results and SearchEvidence, never a search or opportunity provider. Agent runtimes are selected behind one interface; social-source classification and evidence ranking are read-only enrichment layers. Revenue Live background work may reconcile an existing run but may not create one.

**Tech Stack:** TypeScript, Express, Prisma, React, Vite, Node test runner, optional Crawl4AI Docker API >= 0.9.0, optional LiveKit Agent Runtime HTTP bridge.

## Global Constraints

- Preserve `Source -> Evidence -> Fact -> Assessment -> Recommendation`.
- Do not create mock customers, contacts, purchase claims, opportunities, or revenue.
- Do not change Lead Quality Gate, Opportunity Detection scoring, or Qualified Lead semantics.
- SearchTask remains AgentReach/Exa-owned; optional enrichment failures must not masquerade as success and must not erase provider evidence.
- Crawl targets must be public HTTP(S) URLs, bounded, timeout-limited, and free of credentials.
- Social content remains attributed to its original platform and cannot independently confirm procurement.
- LiveKit remains an Agent Runtime plugin and cannot own or mutate SearchTask.
- Revenue Live requires an explicit protected start request; background loops cannot select and start a new opportunity.

---

### Task 1: Restore the complete production baseline

**Files:**
- Modify: `backend/src/routes/health.routes.ts`
- Modify: `backend/tests/ai-provider-platform.test.ts`
- Modify: `.github/workflows/ci.yml`
- Test: `backend/tests/server-startup.test.ts`
- Test: `backend/tests/ai-provider-platform.test.ts`

**Interfaces:**
- Produces: `/api/health -> { status: 'ok' }` with no provider probe side effect.
- Preserves: `/api/health/capabilities` as the provider-capability surface.

- [ ] Write/retain regression assertions that liveness is provider-independent and Outreach fallback is useful, grounded, and non-fabricated rather than tied to the obsolete phrase `first step`.
- [ ] Run the two test files and confirm the current red failures.
- [ ] Make `/api/health` pure and update the obsolete Outreach assertions without weakening factual boundaries.
- [ ] Add both regression files to the CI backend test list.
- [ ] Run the focused tests green.

### Task 2: Add a source-quality and freshness explanation layer

**Files:**
- Create: `backend/src/contracts/evidence-ranking.contract.ts`
- Create: `backend/src/services/evidence-ranking.service.ts`
- Modify: `backend/src/services/radar-assessment-persistence.service.ts`
- Modify: `src/types/index.ts`
- Modify: `src/components/discover/RadarAssessmentCard.tsx`
- Test: `backend/tests/evidence-ranking.test.ts`
- Test: `backend/tests/radar-assessment-persistence.test.ts`

**Interfaces:**
- Produces: `rankEvidence(input): EvidenceRanking` with source tier, published/captured time, freshness status, score, and reasons.
- Adds only response fields under `assessment.evidence`; stored Decision and scores remain unchanged.

- [ ] Write tests for official sources, social-only sources, missing publication time, stale content, and impossible future dates.
- [ ] Confirm tests fail before the contract/service exists.
- [ ] Implement deterministic ranking from explicit metadata only.
- [ ] Return additive evidence fields from the Radar query.
- [ ] Display freshness/source quality as explanation, not customer certainty.
- [ ] Run backend and frontend focused tests green.

### Task 3: Integrate Crawl4AI as optional content acquisition

**Files:**
- Create: `backend/src/providers/content/content-acquisition-provider.interface.ts`
- Create: `backend/src/providers/content/crawl4ai-content.provider.ts`
- Create: `backend/src/services/content-acquisition.service.ts`
- Create: `backend/src/utils/public-crawl-target.ts`
- Modify: `backend/src/services/search-task.service.ts`
- Modify: `backend/.env.example`
- Modify: `backend/README.md`
- Test: `backend/tests/crawl4ai-content-provider.test.ts`
- Test: `backend/tests/search-task-content-acquisition.test.ts`

**Interfaces:**
- Consumes: real `SearchResult` URLs returned by AgentReach/Exa.
- Produces: `ContentAcquisitionResult` with `ENRICHED | SKIPPED | FAILED`, provider, version, capture time, content hash, title/body/publication metadata, and safe reason code.
- SearchTask dependency: optional `acquireContent(result)` hook; no configured adapter returns the original result unchanged.

- [ ] Write provider parser tests against the official `POST /crawl` response envelope and safe error cases.
- [ ] Write URL-policy tests blocking credentials, localhost, private literal IPs, and unsupported protocols.
- [ ] Write SearchTask integration tests proving enriched body enters SearchEvidence and adapter failure preserves original provider evidence.
- [ ] Implement the provider with bounded timeout, no hooks, no supplied browser launch arguments, optional bearer token, and sanitized errors.
- [ ] Merge enrichment metadata into `SearchEvidence.rawMetadata` without changing provider identity or Opportunity rules.
- [ ] Document `CRAWL4AI_BASE_URL`, `CRAWL4AI_API_TOKEN`, timeout, version floor, and Apache-2.0 attribution.
- [ ] Run focused tests green.

### Task 4: Providerize social-source evidence without inventing signals

**Files:**
- Create: `backend/src/providers/search-result/social-source.provider.ts`
- Create: `backend/src/contracts/source-provenance.contract.ts`
- Modify: `backend/src/services/content-acquisition.service.ts`
- Modify: `backend/src/services/search-task.service.ts`
- Test: `backend/tests/social-source-provider.test.ts`
- Test: `backend/tests/search-task-content-acquisition.test.ts`

**Interfaces:**
- Produces: explicit source category, platform, tier, publisher/account verification status, and corroboration requirement for each real SearchResult.
- Does not fetch private/login-only content and does not create MarketSignal or Opportunity.

- [ ] Write tests for official company social URLs, employee/public-user posts, Reddit/community sources, LinkedIn, X, YouTube, and unknown sites.
- [ ] Confirm no company/account ownership is inferred from URL or title.
- [ ] Implement deterministic provenance classification and attach it to SearchEvidence metadata.
- [ ] Ensure Tier 3 evidence is marked as requiring corroboration while remaining visible in Radar.
- [ ] Run focused tests green.

### Task 5: Add the Agent Runtime plugin layer and LiveKit bridge

**Files:**
- Create: `backend/src/providers/agent-runtime/agent-runtime-provider.interface.ts`
- Create: `backend/src/providers/agent-runtime/openai-sales-agent-runtime.provider.ts`
- Create: `backend/src/providers/agent-runtime/livekit-agent-runtime.provider.ts`
- Create: `backend/src/providers/agent-runtime/agent-runtime.factory.ts`
- Modify: `backend/src/controllers/assistant.controller.ts`
- Modify: `backend/src/routes/health.routes.ts`
- Modify: `backend/.env.example`
- Modify: `backend/README.md`
- Test: `backend/tests/agent-runtime-platform.test.ts`
- Test: `backend/tests/openai-sales-agent.test.ts`

**Interfaces:**
- Consumes/produces the existing `SalesAgentRunInput` and `SalesAgentRunResult`, preserving `/api/assistant/agent`.
- Supports `AGENT_RUNTIME_PROVIDER=openai|livekit`; LiveKit uses a configured bridge URL and server-side token.
- The bridge receives the sales task envelope but cannot access or mutate SearchTask except through the same approved tool API contract.

- [ ] Write selection, no-credential, timeout, sanitized-error, and API-contract tests.
- [ ] Confirm the controller currently depends directly on the OpenAI runtime.
- [ ] Implement adapters and factory without importing LiveKit into SearchTask or provider modules.
- [ ] Add additive capability reporting without exposing tokens.
- [ ] Run focused tests green.

### Task 6: Enforce explicit-user-action Revenue Live behavior

**Files:**
- Modify: `backend/src/server-lifecycle.ts`
- Modify: `backend/src/services/revenue-live.service.ts`
- Modify: `backend/src/workers/revenue-live-loop.worker.ts`
- Test: `backend/tests/revenue-live-loop.test.ts`
- Test: `backend/tests/revenue-live-service.test.ts`
- Test: `backend/tests/revenue-live-api-contract.test.ts`

**Interfaces:**
- Protected `POST /api/revenue/live/runs` remains the only start seam.
- Background loop may call `reconcileActiveRun(userId)` but receives an honest no-run status when the user has not started one.

- [ ] Add a red test proving an enabled background loop cannot create/select a new RevenueOpportunity run.
- [ ] Add a red test proving an operator-authenticated POST still starts an eligible real-source opportunity.
- [ ] Replace automatic `runNextEligibleOpportunity` production scheduling with active-run reconciliation.
- [ ] Preserve operator authentication, URL validation, ledger evidence rules, and API shapes.
- [ ] Run focused tests green.

### Task 7: Add deployment contracts, evaluation coverage, and full verification

**Files:**
- Create: `docs/adr/0001-content-acquisition-and-agent-runtime-plugins.md`
- Create: `docs/INTELLIGENCE_RUNTIME_DEPLOYMENT.md`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Test: `backend/tests/intelligence-loop-evaluation.test.ts`

**Interfaces:**
- Documents the complete loop and operational states `declared -> configured -> probed -> active`.
- Evaluation proves Crawl4AI content reaches SearchEvidence, provenance and freshness remain visible, social evidence does not fabricate opportunities, Agent Runtime remains decoupled, and Revenue Live requires user action.

- [ ] Write end-to-end contract tests with mocked third-party boundaries and real internal services.
- [ ] Add configuration/deployment docs for an independently deployed Crawl4AI >= 0.9.0 sidecar and optional LiveKit bridge.
- [ ] Run Prisma validate, backend TypeScript, full backend tests, backend build, frontend TypeScript, frontend tests, frontend build, lint where configured, and `git diff --check`.
- [ ] Review the complete diff against `.agent/SKILL_REGISTRY.md`, the Master Skill, and this plan.
- [ ] Commit the complete verified delivery and push the feature branch for GitHub review.

