# Sales Radar AI Context

Sales Radar AI is an evidence-first intelligence and revenue-operations application.

## Product surfaces

- **AI command center**: Agent answers when an AI provider is available; direct global search must remain useful without a GPT API.
- **Market radar**: a target-driven research workflow that discovers real public sources, preserves evidence, and exposes an interactive browser only when a genuine remote browser session exists.
- **Revenue supervision**: visible progress, opportunity state, evidence, settlement state, and optional interactive cloud-browser execution.
- **Settings**: provider availability, model state, data-source state, and operator configuration.

## Domain language

- **Source**: external URL or provider record.
- **Evidence**: stored, attributable observation from a source.
- **Object**: company or public business profile discovered by search; not automatically a customer.
- **Contact**: publicly observed business contact field or person, with source and observation time.
- **Market signal**: evidence-backed change; not a purchase confirmation.
- **Opportunity**: risk-adjusted candidate requiring explicit evidence and state.
- **Live View**: a real Browserbase interactive session URL; a screenshot is a snapshot, not Live View.

## Critical invariants

1. Source → Evidence → Fact → Assessment → Recommendation.
2. Search targets must change the actual query sent upstream.
3. A classification control must filter or select real records, not only change appearance.
4. Direct search must return and display all persisted results up to explicit, documented limits, then run public-contact discovery where eligible.
5. Provider quota failures must fall back to another configured provider when possible and must never masquerade as successful research.
6. A snapshot is labelled as a snapshot and never described as an interactive browser.
7. Personal/private data, inferred emails, scraped login-only data, and unrelated user data are not exposed.

Detailed governance remains authoritative in `.agent/SKILL_REGISTRY.md`.
