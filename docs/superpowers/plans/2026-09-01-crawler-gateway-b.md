# Crawler Gateway B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the production workspace without Railway by making crawler-backed public-web search the active runtime, removing encyclopedia-only sources, deleting Revenue from the product surface, showing recommendation webpages immediately, and persisting Commercial Targets locally.

**Architecture:** The full backend moves from the active `agent-reach` provider to a `crawler` provider that targets a Crawl4AI/MCP-compatible gateway. The Vercel fallback remains self-sufficient by discovering candidate URLs from the existing public index, crawling safe pages through configured Crawl4AI or bounded direct HTTP extraction, and filtering only encyclopedia domains. Frontend target state is stored locally and Market Radar uses the existing visual webpage preview directly instead of Browserbase/operator-token Live View.

**Tech Stack:** React 18, TypeScript, Vite, Node.js test runner/tsx, Express backend, Prisma contracts, Vercel Functions, Crawl4AI-compatible HTTP gateway.

**Spec:** `docs/superpowers/specs/2026-09-01-crawler-gateway-b.md`

## Global Constraints

- Filter only encyclopedia-style sources; do not silently discard ordinary websites, reports, news, forums, jobs, procurement or B2B pages.
- Never fabricate leads or substitute mock data for failed live search.
- Preserve SSRF protections for crawler targets.
- Do not require Railway, Browserbase, `REVENUE_OPERATOR_TOKEN`, Exa or mcporter for the production fallback path.
- Preserve the existing `CommercialTarget` service API so Market Radar and target-aware Discover continue to work.
- `/app/revenue` must remain a compatibility redirect only; it must not render Revenue UI.

---

### Task 1: Lock new behavior with failing contracts

**Files:**
- Modify: `api/crawl4ai-fallback.test.js`
- Modify: `api/market-research-fallback.test.js`
- Modify: `src/pages/commercial-targets.contract.test.ts`
- Modify: `src/features/market-intelligence/market-browser-layout.test.ts`
- Modify: `src/pages/revenue-console.test.ts`

**Interfaces:**
- Consumes: current fallback handlers and source files.
- Produces: contracts that require encyclopedia-only filtering, local target persistence, token-free recommendation preview, and Revenue removal.

- [ ] Replace the old “generic homepage/reference pages are filtered” assertion with a fixture containing Wikipedia, a company homepage, a market report and an RFQ page; assert only Wikipedia is removed and all ordinary pages remain.
- [ ] Add Market Radar fallback coverage that keeps ordinary official/report pages while excluding encyclopedia domains.
- [ ] Change Commercial Targets contract to require versioned `localStorage` persistence and to reject a `/commercial-targets` network dependency.
- [ ] Change market browser contract to require immediate visual preview and absence of `REVENUE_OPERATOR_TOKEN`, Browserbase and “启动 Live”.
- [ ] Change Revenue contract to require nav removal plus `/app/revenue` redirect.
- [ ] Push tests and verify GitHub Actions fails against the old implementation for the expected assertions.

### Task 2: Make the production serverless gateway crawler-first

**Files:**
- Modify: `api/crawl4ai-fallback.js`
- Modify: `api/market-research-fallback.js`
- Modify: `api/serverless-fallback.js`
- Modify: `api/backend-proxy.js`

**Interfaces:**
- Consumes: task ids encoded by the existing serverless fallback and optional `CRAWL4AI_BASE_URL`/`CRAWL4AI_API_TOKEN`.
- Produces: crawler-enriched search results and market research sources with encyclopedia-only filtering.

- [ ] Replace `LOW_VALUE_DOMAINS` with an encyclopedia-only set: Wikipedia, Wikidata, Britannica, Baidu Baike and equivalent explicit encyclopedia domains.
- [ ] Keep `commercialScore` only as ordering metadata; remove score-threshold filtering and generic-home/reference penalties that discard ordinary pages.
- [ ] Add bounded safe direct HTTP text extraction for top candidate URLs when Crawl4AI is not configured; keep private/local address checks and timeouts.
- [ ] Remove Wikipedia as a no-result fallback from `serverless-fallback.js`; the handler may return an empty list rather than encyclopedia filler.
- [ ] Remove Exa-first market research execution; use the crawler/public gateway path consistently.
- [ ] Update provider/capability strings to `crawler-gateway` so production diagnostics match the actual runtime.
- [ ] Run API tests via GitHub Actions and confirm crawler contracts pass.

### Task 3: Replace the full backend active search provider with crawler

**Files:**
- Create: `backend/src/providers/search/crawler-search.provider.ts`
- Create: `backend/src/providers/search/crawler-search.provider.test.ts`
- Modify: `backend/src/providers/search/search-provider.interface.ts`
- Modify: `backend/src/providers/search/provider.factory.ts`
- Modify: `backend/src/services/search-task.service.ts`
- Modify: `backend/src/services/provider-health.service.ts` only if needed to expose crawler health without Exa/mcporter.
- Modify: backend test scripts if the new provider test is not already picked up.

**Interfaces:**
- `CrawlerSearchProvider.search(input: SearchProviderInput): Promise<SearchResult[]>`
- Config: `CRAWLER_GATEWAY_URL`, optional `CRAWLER_GATEWAY_TOKEN`, bounded timeout.
- Gateway request: `POST /search` with `{ keyword, platforms, regions, maxResults }`.
- Gateway response: `{ results: Array<{ url, title, content, company?, customerName?, country?, region?, industry?, metadata? }> }` normalized into `SearchResult`.

- [ ] Add failing provider tests for request shape, encyclopedia rejection, ordinary homepage retention and timeout/error handling.
- [ ] Implement `CrawlerSearchProvider` with URL validation, encyclopedia filtering and provider-neutral normalization.
- [ ] Change `SearchProviderName` to `'mock' | 'crawler'`; retain mock only for tests.
- [ ] Change `SearchProviderFactory` default/active provider to crawler and remove active agent-reach/browser branches.
- [ ] Create search tasks with `provider: 'crawler'` and avoid Exa/mcporter health gating.
- [ ] Run backend typecheck/tests/build and confirm all pass.

### Task 4: Make Commercial Targets local-first and remove 503s

**Files:**
- Modify: `src/services/commercial-targets.ts`
- Modify: `src/pages/CommercialTargetsPage.tsx` only for copy/errors if needed.

**Interfaces:**
- Existing exported functions remain: `listCommercialTargets`, `getCommercialTarget`, `createCommercialTarget`, `updateCommercialTarget`, `commercialTargetToMarketTarget`.
- Storage key: `sales-radar:commercial-targets:v1`.

- [ ] Implement guarded browser storage helpers that parse/validate arrays and recover to an empty list on corrupt data.
- [ ] Generate stable local ids using `crypto.randomUUID()` with a timestamp/random fallback.
- [ ] Preserve created/updated timestamps, `userId`, status defaults and async return types.
- [ ] Ensure get/update throw a user-facing error for a missing target.
- [ ] Run frontend typecheck/tests/build.

### Task 5: Show recommendation webpages immediately without operator tokens

**Files:**
- Modify: `src/features/market-intelligence/MarketBrowserWorkspace.tsx`
- Delete or leave unused: `src/features/market-intelligence/MarketLiveBrowserPanel.tsx`
- Delete or leave unused: `src/features/market-intelligence/market-live-browser-api.ts`

**Interfaces:**
- `MarketBrowserWorkspace` still receives `session`, `signal`, `selectedSourceId`, `status`, `onSelectSource`.
- The first available source remains the default selection.

- [ ] Remove `MarketLiveBrowserPanel` from the browser content path.
- [ ] Make `LiveWebPreview` the immediate primary `网页画面` content for the selected source.
- [ ] Keep source switching, address entry, refresh, fullscreen/direct-open where already supported by the preview surface, and automatic fallback to the research summary if the visual cannot load.
- [ ] Update copy so generic page snapshots are accurately labeled non-interactive rather than pretending to be an interactive browser.
- [ ] Run market browser contract and full frontend suite.

### Task 6: Remove Revenue from navigation and routing

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `/app/revenue` -> `<Navigate to="/app/market" replace />`.

- [ ] Remove `WalletCards` import and Revenue nav item.
- [ ] Remove lazy `RevenueOperationsPage` import.
- [ ] Replace Revenue route with compatibility redirect.
- [ ] Run frontend contracts, typecheck and build.

### Task 7: Review, CI, preview smoke and production deploy

**Files:**
- No product-code changes unless review finds a defect.

**Interfaces:**
- GitHub PR from `agent/crawler-gateway-b-20260901` to `main`.
- Vercel preview and production project `sales-radar-ai`.

- [ ] Open/update PR with root cause, behavioral changes and rollback notes.
- [ ] Inspect changed-file patches for secrets, dead Railway/Browserbase coupling and accidental broad filtering.
- [ ] Wait for Frontend and Backend GitHub Actions to complete successfully.
- [ ] Verify preview `/app/targets`, `/app/market`, `/app/discover`, `/api/provider-health/search`, and a real search-task flow.
- [ ] Merge only after CI and preview smoke are green.
- [ ] Verify the Vercel production deployment for the merge commit.
- [ ] Production smoke: targets page has no 503, Revenue is absent, `/app/revenue` redirects, Market Radar shows source visuals without a token, and search results contain no encyclopedia domains.
