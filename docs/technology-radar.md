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
| `unclecode/crawl4ai` | `v0.9.2`, released 2026-07-15; `0.9.x` includes secure-by-default HTTP-server changes | Apache-2.0 | WATCH | Reuse the existing enrichment/adapter path. Do not add a duplicate crawler. If we self-host its HTTP server, review token/bind/request-boundary changes before deployment. |
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

## Scan record — 2026-08-25

- Main head was healthy at scan time; the latest observed production smoke for main succeeded.
- Autonomous-maintenance governance PR #34 merged after its CI completed successfully.
- No candidate justified replacing the current Browserbase, Crawl4AI adapter, or internal eval/trace seams.
- Added `langfuse/langfuse` as `WATCH`, not as a dependency, after verifying `v4.17.0` (2026-08-24) and its core/enterprise license boundary.
- Kept `browser-use/browser-use` `DEFERRED` because upstream action-result reliability reports conflict with Sales Radar's evidence-first execution semantics.
- No Browserbase session was created for this review.

## Continuous review loop

The autonomous project-maintenance watch should refresh this file when a finding is materially new, changes adoption status, changes a version/security assumption, or results in an integration. Routine no-change checks do not create commits.
