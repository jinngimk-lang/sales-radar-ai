# Sales Radar AI Context

Sales Radar AI is an evidence-first commercial intelligence and sales operating workspace.

## Product surfaces

- **AI command center**: Agent answers when an AI provider is available; direct global search remains a separate operating tool.
- **Targets**: persistent commercial targets that carry buyer/supplier/partner/distributor/research intent into recommendation and search workflows.
- **Market radar / Recommendation**: target-driven research that discovers real public sources and immediately shows the selected source information/webpage visual. It does not auto-launch Browserbase or require an operator token.
- **Discover / Search**: proactive public-web discovery through the crawler/MCP gateway, followed by crawler content acquisition when needed.
- **Communication**: preparation and evidence-backed communication state; generated drafts are not sent events.
- **Intent**: attributable persisted outcomes, not predicted purchase intent presented as fact.
- **Settings**: runtime/provider capability and data-source state.

The Revenue workspace is no longer an active product surface. `/app/revenue` exists only as a compatibility redirect to `/app/market`.

## Search runtime

The active search/research provider is `crawler` / `crawler-gateway`.

```text
Commercial target or Discover query
  -> crawler/MCP gateway /search
  -> filter unsafe and encyclopedia-style URLs
  -> retain ordinary useful public pages
  -> crawler /crawl when search output lacks usable page text
  -> attributable Source/Evidence
  -> assessment/recommendation
```

`Exa`, `GDELT`, `agent-reach`, Railway and Browserbase are not active search dependencies for the serverless production path. Historical metadata may remain readable for compatibility, but new search execution must not route through those providers.

## Domain language

- **Source**: external URL or crawler/provider record.
- **Evidence**: attributable observation captured from a source.
- **Object**: company or public business profile discovered by search; not automatically a customer.
- **Contact**: publicly observed business contact field or person, with source and observation time.
- **Market signal**: evidence-backed change; not a purchase confirmation.
- **Opportunity**: risk-adjusted candidate requiring explicit evidence and state.
- **Webpage visual**: direct embed or honest snapshot/summary of a source. It is not described as an interactive remote browser unless a genuine remote browser session explicitly exists.

## Critical invariants

1. Source -> Evidence -> Fact -> Assessment -> Recommendation.
2. Search targets must change the actual query sent to the crawler/MCP gateway.
3. A classification control must filter or select real records, not only change appearance.
4. Search must preserve useful ordinary public pages; encyclopedia/wiki-style sources are filtered, while commercial relevance changes ordering rather than silently deleting low-scoring pages.
5. Provider/runtime failures must be explicit and must never masquerade as successful research or be filled with mock/encyclopedia data.
6. A snapshot is labelled as a snapshot and never described as an interactive browser.
7. Personal/private data, inferred emails, scraped login-only data, and unrelated user data are not exposed.
8. No source is promoted into a buyer, customer, procurement fact, contact, opportunity, sent message, reply, meeting or revenue outcome without the applicable evidence and quality gates.

Detailed governance remains authoritative in `.agent/SKILL_REGISTRY.md`.
