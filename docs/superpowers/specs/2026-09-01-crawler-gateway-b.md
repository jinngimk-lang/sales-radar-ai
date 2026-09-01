# Crawler Gateway B Design

## Goal

Make the production workspace usable without Railway by converging search and research onto a crawler-first gateway, retaining all normal public-web results except encyclopedia/reference-wiki sources, removing Revenue from the product surface, making recommendation pages show the selected webpage immediately without an operator token, and persisting Commercial Targets locally when the full backend is unavailable.

## User-visible requirements

1. Search and Market Radar must not fall back to Wikipedia or other encyclopedia-style sources.
2. Ordinary public pages — company sites, news, blogs, forums, jobs, procurement pages, B2B pages, reports, government pages and public social pages — remain visible. Commercial scoring may order results but must not silently discard them.
3. Backend search provider architecture uses `crawler` rather than `agent-reach`/Exa as the active provider. `mock` remains test-only.
4. Production serverless search remains usable without Railway: public candidate discovery is followed by crawler content acquisition when Crawl4AI is configured, and safe direct HTTP extraction otherwise.
5. The Recommendation/Market Radar browser area immediately shows the selected source webpage visual. It must not require `REVENUE_OPERATOR_TOKEN`, Browserbase, or an explicit “start Live” action.
6. The Revenue navigation item and active route are removed. `/app/revenue` redirects to `/app/market` for old bookmarks.
7. Commercial Targets work without the full backend by using browser-local persistence while preserving the current service API and target-to-market flow.
8. Existing safety guarantees remain: reject unsafe/private crawl targets, reject invalid URLs, do not fabricate leads, and keep evidence provenance explicit.

## Architecture

### Crawler provider

The full backend exposes a `CrawlerSearchProvider` selected by `SearchProviderFactory`. It talks to a crawler gateway configured by `CRAWLER_GATEWAY_URL` (compatible with a Crawl4AI/MCP-backed service) and returns the existing provider-neutral `SearchResult` contract. Search tasks are created with provider `crawler`; provider health no longer gates normal tasks on Exa/mcporter.

### Serverless crawler gateway

Vercel fallback remains the production safety net. It discovers public candidate URLs with the existing no-secret public index, removes only encyclopedia domains, orders candidates by commercial relevance without filtering ordinary pages, then enriches the top URLs through configured Crawl4AI. If Crawl4AI is not configured, it performs bounded safe direct HTTP extraction so the production path still behaves as a crawler rather than returning title-only evidence.

### Recommendation browser

The existing static visual preview becomes the primary browser surface. It appears automatically for the first/selected source. The Browserbase/operator-token panel is removed from the recommendation flow. Direct page embeds are used where supported; generic cross-origin pages use a rendered snapshot with a clear non-interactive label and direct-open action.

### Target persistence

`src/services/commercial-targets.ts` keeps the same async service API but persists to versioned `localStorage`. This avoids 503s while keeping Market Radar and Discover target restoration unchanged.

## Acceptance

- Frontend typecheck, tests and build pass.
- Backend typecheck, unit/core tests and build pass.
- Search tests prove Wikipedia/Baidu Baike/Britannica are removed while normal homepages and reports are retained.
- Recommendation contract proves no operator-token/Browserbase dependency and immediate webpage visual.
- Revenue contract proves nav removal and redirect.
- Target contract proves local persistence and no `/commercial-targets` fetch dependency.
- Preview deployment is healthy; production smoke verifies `/app/targets`, `/app/market`, `/app/discover`, and crawler search endpoints.
