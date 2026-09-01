# Crawler Gateway B Design

## Goal

Make the production workspace usable without Railway by converging Discover and Market Radar onto one crawler/MCP search gateway, retaining useful ordinary public-web results except encyclopedia/wiki-style sources, removing Revenue from the product surface, making recommendation pages show source information/webpage visuals immediately without an operator token, and persisting Commercial Targets locally when the full backend is unavailable.

## User-visible requirements

1. Search and Market Radar must use crawler/MCP search as the active discovery path. They must not route new searches through Exa, GDELT or `agent-reach`.
2. Wikipedia, Wikidata, Britannica, Baidu Baike and equivalent explicit encyclopedia/wiki sources are removed before they enter visible evidence.
3. Ordinary public pages — company sites, news, blogs, forums, jobs, procurement pages, B2B pages, reports, government pages and public social pages — remain eligible. Commercial scoring may order results but must not silently discard them solely for low commercial score.
4. Backend search provider architecture uses `crawler` rather than `agent-reach`/Exa as the active provider. `mock` remains test-only.
5. Production serverless search remains independent of Railway. A configured `CRAWLER_GATEWAY_URL` exposes `/search`; results with insufficient page text may be deep-crawled through `/crawl` using the same gateway or an explicitly configured Crawl4AI endpoint.
6. When the crawler gateway is not configured or fails, the UI receives a truthful unavailable/no-results state. It must not silently fall back to Exa, GDELT, Wikipedia, mock leads or fabricated content.
7. The Recommendation/Market Radar browser area immediately shows the selected source webpage visual or evidence-backed source information. It must not auto-launch Browserbase, require `REVENUE_OPERATOR_TOKEN`, or require an explicit “start Live” action.
8. The Revenue navigation item and active route are removed. `/app/revenue` redirects to `/app/market` for old bookmarks.
9. Commercial Targets work without the full backend by using browser-local persistence while preserving the current service API and target-to-market flow.
10. Existing truth and safety guarantees remain: reject invalid/non-public URL literals at the application boundary, keep gateway-side SSRF protection mandatory, do not fabricate leads or contacts, and keep evidence provenance explicit.

## Architecture

### Crawler/MCP search gateway

The business-facing search provider is a replaceable `crawler` adapter configured by `CRAWLER_GATEWAY_URL` and optional `CRAWLER_GATEWAY_TOKEN`.

Gateway contract:

```text
POST /search
{
  keyword,
  platforms,
  regions,
  maxResults
}
-> {
  results: [{ url, title, content?, summary?, metadata?, ... }]
}
```

The gateway may internally compose an MCP `search_web`/equivalent discovery tool with Crawl4AI-style page acquisition, but Sales Radar business logic does not depend on a particular search API or engine. Search-engine/provider details remain provenance metadata rather than application routing choices.

If `/search` already returns usable content, that content is attributable crawler evidence. If it returns only a URL/title/summary, Sales Radar may call:

```text
POST /crawl
{ urls: [url] }
```

through the configured crawler gateway/Crawl4AI endpoint. The application never uses direct HTTP page fetching as the active serverless fallback.

### Filtering and ranking

- Explicit encyclopedia/wiki domains are excluded.
- Unsafe URL literals and local/private address literals are rejected before crawl enrichment.
- Gateway deployments must independently resolve and block DNS/private-network/metadata-service SSRF targets and unsafe redirects.
- Ordinary useful pages remain visible.
- Commercial intent contributes to ordering and recommendations, not a hidden score threshold that deletes ordinary pages.
- Missing crawler content keeps evidence at `UNKNOWN`; successful crawler content may become `VALID` evidence but still does not prove buying intent.

### Recommendation browser

The existing source visual becomes the primary recommendation surface and appears automatically for the first/selected source. The Browserbase/operator-token panel is removed from the normal recommendation flow. Direct embeds are used where supported; generic cross-origin pages use an honest non-interactive visual/snapshot or evidence-backed summary with a direct-open action.

### Target persistence

`src/services/commercial-targets.ts` keeps the same async service API but persists to versioned `localStorage` in the stateless workspace. This avoids backend 503s while keeping Market Radar and Discover target restoration unchanged.

## Acceptance

- Frontend typecheck, tests and build pass.
- Backend typecheck, unit/core tests, build and production runtime image pass.
- Tests prove configured Discover and Market Radar call crawler gateway `/search` and do not access Exa/GDELT.
- Search tests prove encyclopedia sources are removed while ordinary homepages, reports, forums and procurement/B2B pages are retained.
- Missing-content tests prove `/crawl` enrichment works and does not fabricate evidence on failure.
- Recommendation contract proves no operator-token/Browserbase dependency and immediate source visual/information.
- Revenue contract proves nav removal and `/app/revenue` redirect.
- Target contract proves local persistence and no `/commercial-targets` fetch dependency in stateless mode.
- Preview deployment is healthy; owner-local verification checks `/app/targets`, `/app/market`, `/app/discover`, Revenue absence/redirect, immediate recommendation visuals and a real crawler-gateway search flow before any default-branch update.
