# Sales Radar AI Technology Radar

Last updated: 2026-08-25

This file is the auditable record for external GitHub projects, provider/runtime changes and product/engineering information that may improve Sales Radar AI. It is not a dependency wish list.

## Status vocabulary

- `WATCH` — relevant; keep observing.
- `EXPERIMENT` — run a reversible isolated evaluation against a concrete gap.
- `ADOPTED` — integrated because it solved a verified problem and passed checks.
- `DEFERRED` — useful but redundant, premature or more expensive than the healthy current path.
- `REJECTED` — license, maintenance, safety, architecture or value does not meet the adoption gate.

## Adoption record requirements

Every adopted or experimented item must record:

- project/product identity and upstream repository or official source;
- observed version/tag/date and maintenance evidence;
- license;
- exact Sales Radar weakness or requirement addressed;
- files/components/protocols/ideas used;
- local modifications and replaceable interface boundary;
- tests/CI/production verification;
- rollback path.

No code is copied from license-incompatible sources merely because a product pattern is useful.

## Current radar

| Candidate | Observed state | License | Status | Sales Radar decision |
| --- | --- | --- | --- | --- |
| `unclecode/crawl4ai` | `v0.9.2`, released 2026-07-15; `0.9.x` includes secure-by-default HTTP-server changes; open issue #2147 documents Docker/MCP boot failure when an unbounded `mcp>=1.18.0` resolves to MCP Python SDK `2.0.0` | Apache-2.0 | WATCH | Reuse the existing enrichment/adapter path. Do not add a duplicate crawler. If we self-host its HTTP/MCP server, review token/bind/request-boundary changes and pin `mcp<2` until the bridge is migrated and verified against the v2 API. |
| `modelcontextprotocol/python-sdk` | `v2.0.0`, released 2026-07-28; v2 is the default `pip install mcp`; v1.x is maintenance-only and upstream explicitly recommends `<2` for projects not yet migrated | MIT | WATCH | Do not introduce MCP v2 merely for freshness. Any future MCP provider/runtime integration must declare its supported protocol/SDK major, keep the adapter replaceable, and prove tool/resource semantics plus auth/telemetry behavior before production. |
| `exa-labs/exa-mcp-server` | Repository active through 2026-08-21; npm `3.4.1` published in Aug 2026. Sales Radar production is intentionally pinned to `3.2.1`. Upstream issue #421 (2026-08-19) shows the hosted Exa MCP endpoint still negotiates `2025-11-25` and rejects `MCP-Protocol-Version: 2026-07-28` on subsequent calls. Current upstream package still depends on MCP JS SDK `^1.12.1`. | MIT | WATCH | Keep the production `exa-mcp-server@3.2.1` + `mcporter@0.12.3` path while health checks remain green. Do not upgrade the server or force a newer MCP protocol header merely for freshness. Any upgrade must run the existing runtime/config/search-depth tests and verify initialize/tool-list/search semantics with the negotiated protocol version; rollback is the current Dockerfile pin. |
| `browser-use/browser-use` | `0.13.8`, released 2026-08-16; upstream issues #5469 (2026-08-14) and #5486 (2026-08-17) report failure paths being represented as successful actions | MIT | DEFERRED | Browserbase is the healthy production browser path. Browser Use cannot become an execution-truth source while action-result semantics can report success on failed clicks/tab switches. Reconsider only after a concrete Browserbase limitation and independent action-evidence verification. |
| `@livekit/agents` | `1.7.0` release family remains active; a LiveKit agents plugin `v1.7.0` release was published 2026-08-25 | Apache-2.0 | WATCH | Strong candidate for future realtime communication. Before adoption, require explicit transcript/recording retention, observability and PII-redaction controls; do not treat provider redaction as the only privacy boundary. |
| LiveKit PII redaction / Agent observability | Current docs observed 2026-08-25 | Service capability; SDK remains Apache-2.0 | WATCH | Useful safety capability for future realtime sessions. Enable only with explicit retention/privacy design and verify cloud/self-hosted applicability. |
| `chatwoot/chatwoot` | Aug 2026 product updates: centralized WhatsApp templates, assistant audience/schedule controls, calls dashboard, report-to-conversation drill-down | Core reference is MIT outside enterprise-specific areas; verify per file before any code reuse | WATCH | Use as interaction research for communication control plane and evidence drill-down. Prefer original Sales Radar UI and state models; do not copy protected trade dress or enterprise-only code. |
| `langfuse/langfuse` | `v4.17.0`, published 2026-08-24; actively maintained observability/evaluation platform | Core repository content is MIT except `ee/` and `.ee.*` paths under separate terms | WATCH | Good fit for future eval/trace/observability experiments, but Sales Radar already has internal Agent Evaluation, Agent Trace and Research Trace seams. Do not add a dependency until a measured observability/evaluation gap exists. Any experiment must stay behind an adapter and use only license-compatible core SDK/protocol paths. |

## Product implications accepted from the current scan

### Realtime communication

When Sales Radar adds a realtime agent/inbox runtime, the minimum safe design includes:

```text
Channel / audience scope
  -> schedule / availability policy
  -> explicit user or policy-authorized action
  -> provider send/call event
  -> attributable receipt / reply / meeting event
  -> evidence-backed interaction timeline
```

Generated content and opened channels remain non-events until a provider or explicit user-confirmed receipt exists.

### Privacy and observability

Realtime sessions should expose enough trace to diagnose failures without storing unnecessary personal data. Any future LiveKit adoption should evaluate PII redaction, retention, transcript/audio storage, telemetry destination and failure behavior before production use.

Langfuse is a watch candidate rather than an adopted dependency. The existing repository already contains governed evaluation and trace seams; external observability is justified only if a benchmark exposes a concrete gap such as cross-runtime trace correlation, evaluation dataset management, or production trace analysis that the current implementation cannot satisfy economically.

### Browser runtime discipline

A second browser runtime is not added while Browserbase satisfies the production need. Alternative runtimes remain behind interfaces and are introduced only through an isolated experiment with a measurable reason.

A browser action's provider-level `success` flag is never sufficient evidence of a business action. The August 2026 Browser Use issues reinforce the existing Sales Radar rule: execution truth requires independently attributable state/evidence, not an agent/runtime success assertion.

### MCP/runtime compatibility discipline

MCP SDK major versions are protocol/runtime boundaries, not routine dependency upgrades. The MCP Python SDK `v2.0.0` release makes 2.x the default install, moves v1.x to maintenance mode, and explicitly tells non-migrated projects to keep a `<2` ceiling. Crawl4AI issue #2147 demonstrates the concrete failure mode: its Docker MCP bridge can fail at process boot when an unbounded dependency resolves to v2.

The same discipline now explicitly covers Exa. Sales Radar currently builds its production backend image with `mcporter@0.12.3` and `exa-mcp-server@3.2.1`. Upstream issue #421 shows the hosted Exa endpoint negotiating `2025-11-25` even when a client proposes `2026-07-28`, and then rejecting a request that incorrectly sends the newer protocol header. This is not a current production regression: the pinned local runtime is healthy and the existing tests exercise Exa runtime configuration. It is an upgrade boundary. Clients must honor the negotiated protocol version rather than assume the newest published spec.

Sales Radar therefore does not adopt MCP v2 or a newer Exa MCP package by default. Any future MCP-backed provider or orchestration runtime must pin a supported major/version, verify initialize/tool/resource behavior and auth/telemetry semantics in isolation, and preserve an adapter-level rollback path. The current Crawl4AI enrichment path remains unchanged because there is no evidence that production depends on its affected Docker/MCP bridge.

## Scan record — 2026-08-25

- Main head `d0c00a4c87434d7ebed466bf3ac77da1b954b393` remained production-healthy at this scan: Vercel and both observed Railway deployment statuses were successful.
- One draft feature PR (#39) was open. Its backend job was green; the frontend test job was red because `src/services/communication-evidence.ts` had not yet been added. This is feature-branch incompleteness, not a production regression, and no production merge was attempted from that PR.
- Added `exa-labs/exa-mcp-server` as `WATCH` after verifying the repository identity, MIT license, active maintenance, current npm `3.4.1`, the production Docker pin at `3.2.1`, and upstream protocol-negotiation issue #421.
- No Exa runtime upgrade was made because the existing pinned path is healthy; rollback for any future experiment is the current `exa-mcp-server@3.2.1` / `mcporter@0.12.3` Dockerfile pin.
- No candidate justified replacing the current Browserbase, Crawl4AI adapter, or internal eval/trace seams.
- `modelcontextprotocol/python-sdk` remains `WATCH` after verifying `v2.0.0` (2026-07-28), v1 maintenance status and the upstream `<2` migration guidance.
- Crawl4AI issue #2147 remains relevant: fresh Docker/MCP installs can fail to boot when `mcp>=1.18.0` resolves to `2.0.0`; this does not affect the current Sales Radar path unless we adopt that self-hosted MCP bridge.
- `langfuse/langfuse` remains `WATCH`, not a dependency.
- `browser-use/browser-use` remains `DEFERRED` because upstream action-result reliability reports conflict with Sales Radar's evidence-first execution semantics.
- No Browserbase session was created for this review.

## Continuous review loop

The autonomous project-maintenance watch should refresh this file when a finding is materially new, changes adoption status, changes a version/security assumption, or results in an integration. Routine no-change checks do not create commits.
