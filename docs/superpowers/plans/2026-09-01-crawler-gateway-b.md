# Crawler Gateway B Implementation Plan

**Goal:** Restore the production workspace after Railway expiry with crawler/MCP-native search, encyclopedia filtering, local Commercial Targets, immediate recommendation source visuals/information, and no active Revenue workspace.

**Spec:** `docs/superpowers/specs/2026-09-01-crawler-gateway-b.md`

## Global constraints

- New Discover and Market Radar searches use `CRAWLER_GATEWAY_URL/search`, not Exa, GDELT or Agent Reach.
- Results without usable page text may use `/crawl` through the crawler gateway / configured Crawl4AI endpoint.
- Do not use direct HTTP page fetching as an active serverless fallback.
- Filter explicit encyclopedia/wiki sources; retain useful ordinary public pages.
- Commercial intent changes ordering, not eligibility by hidden threshold.
- Never fabricate leads, contacts, buyer intent, communication events or outcomes.
- Preserve application URL checks and require gateway-side DNS/private-network/metadata/redirect SSRF protection.
- `/app/revenue` is a compatibility redirect only.
- Do not update `main` before `PROJECT_WORKFLOW.md` owner-local verification and explicit approval.

## Task 1 — Lock the new behavior with RED contracts

- [x] Require local Commercial Target persistence in stateless mode.
- [x] Require immediate recommendation webpage visual/information without Browserbase/operator token.
- [x] Require Revenue nav removal and legacy route redirect.
- [x] Require encyclopedia filtering while preserving ordinary public pages.
- [x] Add crawler-gateway discovery contracts proving Discover and Market Radar must not reach GDELT/Exa.
- [x] Verify RED: CI #466 failed exactly on the two new crawler discovery contracts because the previous implementation still called `api.gdeltproject.org`.

## Task 2 — Make Vercel/serverless search crawler-MCP native

- [x] Add shared `api/crawler-gateway-client.js`.
- [x] Implement `POST CRAWLER_GATEWAY_URL/search` with provider-neutral result normalization.
- [x] Filter encyclopedia and unsafe/non-public URL literals before visible evidence/enrichment.
- [x] Treat usable `/search` page text as crawler evidence.
- [x] Use `/crawl` only when a search result lacks usable page text.
- [x] Remove active GDELT discovery from Discover, Market Radar and `serverless-fallback.js`.
- [x] Remove inactive `exa-fallback.js` and its tests.
- [x] Remove GDELT-specific search contract/tests.
- [x] Return truthful no-results/unavailable behavior when crawler gateway is missing or fails.

## Task 3 — Full backend crawler provider

- [x] Add `CrawlerSearchProvider`.
- [x] Set SearchProviderFactory default/active provider to `crawler`.
- [x] Keep historical `agent-reach` metadata as a compatibility alias only.
- [x] Add crawler provider and provider-health backend tests.
- [x] Remove Exa/mcporter gating from normal new-task search execution.

## Task 4 — Commercial Targets local-first

- [x] Preserve the existing async Commercial Target service API.
- [x] Store stateless targets in versioned `localStorage`.
- [x] Preserve stable ids/timestamps/status and target-to-market flow.
- [x] Remove the stateless `/commercial-targets` network dependency that caused 503s.

## Task 5 — Recommendation source display

- [x] Remove `MarketLiveBrowserPanel` from the normal recommendation path.
- [x] Make the existing source webpage visual / `LiveWebPreview` the immediate primary content.
- [x] Remove `REVENUE_OPERATOR_TOKEN`, Browserbase unlock and “启动 Live” dependency from recommendation.
- [x] Keep source switching and honest non-interactive snapshot/summary fallback.

## Task 6 — Remove Revenue UI

- [x] Remove Revenue from primary navigation.
- [x] Remove active Revenue page route/import.
- [x] Redirect `/app/revenue` to `/app/market` for old bookmarks.

## Task 7 — Governance and documentation

- [x] Update `CONTEXT.md` to crawler/MCP architecture.
- [x] Update `PROJECT_BLUEPRINT.md` to Sep 1 direction and remove Railway/Revenue/Browserbase-primary assumptions.
- [x] Tighten the Sep 1 spec to crawler/MCP-native discovery.
- [x] Update PR #73 description with RED evidence and current architecture.

## Task 8 — Verification and delivery

- [x] Frontend typecheck/tests/build on fresh current-head CI.
- [ ] Backend production Docker image on fresh current-head CI.
- [x] Vercel Preview for current branch head reaches READY.
- [ ] Inspect current-head CI final conclusion and any build/runtime warnings.
- [ ] Preview browser verification: `/app/targets`, `/app/market`, `/app/discover`.
- [ ] Verify Revenue is absent and `/app/revenue` redirects.
- [ ] Verify Market Radar shows selected source information/visual without token or remote-browser start.
- [ ] Verify a real crawler-gateway search flow when `CRAWLER_GATEWAY_URL` is configured in the verification environment.
- [ ] Owner-local verification per `PROJECT_WORKFLOW.md`.
- [ ] Explicit owner approval to update `main`.
- [ ] Only after the above gates: sync PR #73 to `main` and verify production deployment/runtime semantics.
