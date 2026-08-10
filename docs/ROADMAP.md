# Sales Radar AI Roadmap

This roadmap distinguishes repository implementation from production runtime verification. It is directional and does not promise dates.

## Now: public preview foundation

- Stable SearchTask -> SearchEvidence -> RadarAssessment pipeline.
- Evidence-linked Opportunity integrity boundary.
- Company research, research trace and Sales Agent workspace.
- Optional Crawl4AI content-enrichment adapter.
- Optional LiveKit-compatible Agent Runtime bridge.
- Protected, user-triggered Revenue Live workflow.
- Apache-2.0 governance and agent integration contract.

## Next: runtime validation and observability

- Deploy and validate Crawl4AI against official company/news sources.
- Deploy and validate a LiveKit-compatible runtime with identical tool permissions.
- Add provider health, freshness and evidence-quality observability without exposing secrets.
- Publish repeatable staging acceptance tests for real-source search and crawl flows.

## Later: provider ecosystem

- Add official website, RSS, careers and industry-news ingestion adapters.
- Add social providers as Tier 3 clues that require corroboration.
- Improve extraction, deduplication, reranking and multilingual search intent.
- Add Contact Intelligence using only publicly verified identities and fields.
- Add CRM connectors behind user action and existing quality gates.
- Explore an MCP/SDK adapter over the documented Agent API.

## Non-goals

- Fabricating customers, market events or source evidence.
- Automatically promoting an Opportunity into a Qualified Lead.
- Guessing contacts, emails or purchase intent.
- Automatically sending outreach or changing CRM/revenue truth.
- Claiming provider coverage that has not been deployed and verified.
