# Crawl4AI timeout and browser-pool reliability finding — 2026-08-27

Status: candidate `WATCH` update for `docs/technology-radar.md`.

## Upstream identity

- Project: `unclecode/crawl4ai`
- Current Sales Radar observed stable release: `v0.9.2` (2026-07-15)
- License: Apache-2.0
- Existing Sales Radar status: `WATCH`; current production does not depend on a newly self-hosted Crawl4AI runtime.

## New evidence

### Issue #2205 — post-navigation operations can hang indefinitely and cancellation can leak pages

Opened 2026-08-27 by a repository collaborator and marked in progress.

The report identifies two related `v0.9.2` reliability gaps:

1. `page_timeout` bounds navigation but not later JavaScript/page operations such as overlay removal, body-visibility checks, selector extraction, `page.content()`, iframe/shadow-DOM processing, or user `js_code`. A page whose main thread becomes busy after navigation can therefore leave `arun()` blocked indefinitely while holding a renderer process.
2. Cleanup after cancellation can be skipped because `asyncio.CancelledError` is a `BaseException`; cancellation during awaited page/context release can prevent `page.close()` from running, leaking the page/context and renderer process in long-lived crawler/server pools.

This directly affects any future long-lived self-hosted crawler benchmark: provider navigation success and a configured `page_timeout` are not sufficient evidence that the crawl has a bounded lifetime or that resources are reclaimed after cancellation.

### Issue #2204 — permanent Docker warm browser does not match real requests

Opened 2026-08-27 by the same repository collaborator and marked in progress.

The report reproduces on `unclecode/crawl4ai:0.9.2` that the Docker server's permanent warm browser is fingerprinted before the server injects its egress proxy, while real `/crawl` requests are fingerprinted after egress enforcement. Because `proxy_config` participates in the fingerprint, requests cannot match the permanent browser. The unused browser is also excluded from the normal pool janitor.

Reported impact is an always-idle Chromium/driver tree (about 270 MB RSS in the reproducer) plus an additional browser tree once actual crawling begins. This compounds the long-lived process/resource-pressure concerns already tracked for cgroup-v2 memory semantics.

## Sales Radar decision

Keep Crawl4AI at `WATCH`; do not add or upgrade a production crawler/runtime because of these reports.

Any future self-hosted Crawl4AI experiment should now require all of the following in addition to the existing security, dependency-isolation, PDF, latency and memory gates:

- a wall-clock crawl deadline that covers navigation **and all post-navigation operations**, enforced outside provider success flags;
- explicit cancellation/timeout fault injection proving page/context/browser resources are reclaimed;
- renderer/process-count and RSS checks across repeated timeout/cancellation churn;
- verification that any configured warm/permanent browser is actually serving requests after server-injected egress/proxy configuration, rather than existing as idle overhead;
- rollback remains the current non-self-hosted/adapter-only path.

These are runtime-health constraints only. They do not weaken Source → Evidence → Fact → Assessment → Recommendation → Explicit User Action → Verifiable Outcome, SearchEvidence, Lead Quality Gate, communication receipts, or Revenue truth boundaries.

## No architecture change

`PROJECT_BLUEPRINT.md` does not need to change: these findings reinforce the existing rule that Crawl4AI is a replaceable enrichment layer and provider/runtime health is not business truth.
