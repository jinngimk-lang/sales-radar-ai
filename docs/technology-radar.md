# Sales Radar AI Technology Radar

Last updated: 2026-08-26

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
| `unclecode/crawl4ai` | `v0.9.2`, released 2026-07-15; `0.9.x` includes secure-by-default HTTP-server changes. GitHub-reviewed advisory GHSA-2jq4-q6vv-4cp3 rates a download-path traversal / arbitrary-file-write issue critical (CVSS 9.6) for `<=0.8.9`; the fix begins at `0.9.0`. Open issue #2147 documents Docker/MCP boot failure when an unbounded `mcp>=1.18.0` resolves to MCP Python SDK `2.0.0`; open issue #2098 documents that `0.9.2` pins `unclecode-litellm==1.81.13`, which installs the same top-level `litellm` package as upstream LiteLLM and can produce install-order-dependent import breakage when both distributions coexist. PR #2107 proposes returning to upstream `litellm>=1.83.0,<1.92.0` but remains unmerged. Open issue #2135 documents a deterministic PDF-path semantic contradiction in `0.9.2`: full extracted markdown can coexist with `success=false` because anti-bot detection evaluates placeholder HTML; maintainers report the fix is in `develop` for the next release. Open issue #2129 reproduces another deterministic `0.9.2` behavior: pages whose `<body>` remains hidden can incur an extra ~30 second visibility wait even when `ignore_body_visibility=True` (the default); the issue is marked done/pending release and the stable `v0.9.2` line does not yet include the fix. | Apache-2.0 | WATCH | Reuse the existing enrichment/adapter path. Never introduce or roll back a self-hosted Crawl4AI runtime below `0.9.0`; if downloads are enabled, run the crawler as an unprivileged user with a dedicated isolated downloads directory and require API authentication on exposed Docker endpoints. If we self-host its HTTP/MCP server, review token/bind/request-boundary changes and pin `mcp<2` until the bridge is migrated and verified against the v2 API. Do not install Crawl4AI into an environment that also carries upstream LiteLLM without an isolated dependency check while #2098/#2107 remain unresolved; prefer process/container isolation or a verified upstream fix rather than downstream import-order workarounds. Any future PDF ingestion must validate usable extracted content and source identity separately from provider-level success/error flags, while still surfacing the provider contradiction for diagnosis; do not silently reinterpret a failed provider result as verified evidence. Any future self-hosted benchmark must also include hidden-body/cloaked-page latency fixtures and either prove the released upstream fix or explicitly configure and measure the visibility timeout; a nominal `success=true` does not prove acceptable crawl latency. |
| `modelcontextprotocol/python-sdk` | `v2.1.1`, released 2026-08-25; v2 is the current stable line and v1.x remains maintenance-only. `v2.1.0` added broader 4 MiB request limits across SSE/OAuth, changed handler-error wire semantics, and improved 2026-07-28 HTTP compatibility. Open issue #3382 reproduces on `2.0.0`, `2.1.0` and main: cancellation/teardown can close an OAuth auth-flow generator from another task, fail an owner-bound `anyio.Lock` release, leave the lock permanently held, and make all subsequent requests through that long-lived `OAuthClientProvider` hang until process restart. `v2.1.1` only redirects legacy FastMCP imports to the migration guide and does not claim to fix #3382. Open issue #3385 documents a cross-language result-semantics mismatch affecting both current v2 and the v1 maintenance line: an unannotated tool can serialize `NaN`/`Infinity` into a text content block as invalid RFC 8259 JSON while returning `is_error=false`; Python's lenient parser can accept the payload while standards-compliant clients such as Node `JSON.parse` reject it. | MIT | WATCH | Do not introduce MCP v2 merely for freshness. Any future MCP provider/runtime integration must declare its supported protocol/SDK major, keep the adapter replaceable, prove tool/resource semantics plus auth/telemetry behavior, include cancellation/reconnect tests for long-lived OAuth clients, and validate cross-language result payloads independently of `is_error`/provider-success flags. Reject or normalize non-finite numeric values before evidence/business-state processing instead of treating a success-shaped MCP result as verified data. |
| `exa-labs/exa-mcp-server` | Repository active through 2026-08-21; npm `3.4.1` published in Aug 2026. Sales Radar production is intentionally pinned to `3.2.1`. Upstream issue #421 (2026-08-19) shows the hosted Exa MCP endpoint still negotiates `2025-11-25` and rejects `MCP-Protocol-Version: 2026-07-28` on subsequent calls. Current upstream package still depends on MCP JS SDK `^1.12.1`. | MIT | WATCH | Keep the production `exa-mcp-server@3.2.1` + `mcporter@0.12.3` path while health checks remain green. Do not upgrade the server or force a newer MCP protocol header merely for freshness. Any upgrade must run the existing runtime/config/search-depth tests and verify initialize/tool-list/search semantics with the negotiated protocol version; rollback is the current Dockerfile pin. |
| `browser-use/browser-use` | `0.13.8`, released 2026-08-16; upstream issues #5469 (2026-08-14) and #5486 (2026-08-17) report failed element/tab actions being represented as successful actions. Open issue #5216 documents that default-on telemetry can include the full task, visited URLs, action history (including typed text), and final result in PostHog events despite being described as anonymized usage data; `ANONYMIZED_TELEMETRY=false` is the documented opt-out. | MIT | DEFERRED | Browserbase is the healthy production browser path. Browser Use cannot become an execution-truth source while action-result semantics can report success on failed clicks/tab switches. Any future isolated evaluation must also disable default telemetry or explicitly approve and test its data handling before using internal, authenticated, customer, contact, or other sensitive business context. Reconsider only after a concrete Browserbase limitation and independent action-evidence verification. |
| `microsoft/Webwright` | Public Microsoft Research repo; initial public release 2026-05-04, current plugin manifest `0.1.0`; Playwright-based browser tasks compile into rerunnable Python scripts with screenshots/action logs and visual self-verification | MIT | DEFERRED | Interesting evidence/replay pattern, but it is still a second browser runtime while Browserbase is healthy. Reconsider only for a concrete long-horizon/replayability gap; any experiment must keep browser execution behind the existing provider boundary and treat scripts/screenshots/action logs as diagnostic evidence, not proof of a business outcome. |
| `livekit/agents-js` / `@livekit/agents` | `1.7.0`, published 2026-08-20; release adds PII-redaction-aware telemetry, renames sensitive trace/log fields, stops telemetry/recording uploads when Cloud data recording is disabled, and moves rtc-node data streams to failure-propagating v2 semantics | Apache-2.0 | WATCH | Strong candidate for future realtime communication, not a current dependency. Any experiment must stay behind a replaceable runtime adapter, explicitly handle stream read/reconnect failures, and preserve Sales Radar receipt/outcome evidence instead of treating agent/session success as communication truth. |
| `pipecat-ai/pipecat` | `v1.7.0`, released 2026-08-01; actively maintained realtime voice/multimodal framework. Current release introduces multi-agent workers on a typed shared bus, while the core package is marked production/stable and requires Python `>=3.11`. | BSD-2-Clause | WATCH | Credible alternative realtime runtime to benchmark against LiveKit when a verified communication gap exists. Do not add it now: the current product has no validated need for a second realtime stack. Any future experiment must isolate transport/runtime behind an adapter, preserve provider receipts/replies as the only communication truth, and explicitly test interruption/cancellation/trace behavior. |
| LiveKit PII redaction / Agent observability | Official docs observed 2026-08-25: LiveKit Cloud only, off by default, applied during post-session recording upload; removes/redacts sensitive transcript/audio/telemetry fields when enabled | Service capability; SDK remains Apache-2.0 | WATCH | Useful defense layer, not the privacy boundary. Before adoption define transcript/audio retention, telemetry destination, user visibility, PII policy and failure behavior. Self-hosted or fully self-hosted deployments cannot assume this Cloud feature exists. |
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

LiveKit `@livekit/agents@1.7.0` strengthens the runtime requirements rather than relaxing them. Its rtc-node data-stream update now propagates incoming-stream read errors to callers and terminates in-flight streams on a full reconnect instead of allowing a silently incomplete payload. A future Sales Radar adapter must preserve those failures as explicit runtime state; it must not convert partial or interrupted communication into a successful send, reply, meeting or other business outcome.

Pipecat `v1.7.0` is a credible comparison runtime rather than a reason to add infrastructure now. Its multi-agent worker model and broad realtime transport/provider support are relevant to future call/inbox orchestration, but adoption would introduce a separate Python realtime stack with its own cancellation, transport and observability behavior. A future benchmark should compare LiveKit and Pipecat on interruption recovery, provider receipt attribution, traceability, latency and PII/retention controls before either becomes a production dependency.

### Privacy and observability

Realtime sessions should expose enough trace to diagnose failures without storing unnecessary personal data. Any future LiveKit adoption should evaluate PII redaction, retention, transcript/audio storage, telemetry destination and failure behavior before production use.

LiveKit's current PII redaction is a **LiveKit Cloud** observability capability, is **off by default**, and is applied during post-session recording upload rather than as an in-call privacy filter. The `1.7.0` release also renames sensitive trace/log attributes to `lk.pii.*` forms and removes sensitive content attributes from observability exports when redaction is enabled. Any future third-party OTLP/trace integration must test field migrations rather than assume existing queries remain valid. Fully self-hosted deployments must implement their own equivalent retention/redaction boundary instead of relying on this Cloud feature.

Langfuse is a watch candidate rather than an adopted dependency. The existing repository already contains governed evaluation and trace seams; external observability is justified only if a benchmark exposes a concrete gap such as cross-runtime trace correlation, evaluation dataset management, or production trace analysis that the current implementation cannot satisfy economically.

### Browser runtime discipline

A second browser runtime is not added while Browserbase satisfies the production need. Alternative runtimes remain behind interfaces and are introduced only through an isolated experiment with a measurable reason.

A browser action's provider-level `success` flag is never sufficient evidence of a business action. The August 2026 Browser Use issues reinforce the existing Sales Radar rule: execution truth requires independently attributable state/evidence, not an agent/runtime success assertion.

Browser-agent telemetry is also a privacy boundary, not an observability convenience. Browser Use issue #5216 shows that its default-on PostHog event can contain the task, visited URLs, action history including typed text, and final result. A future evaluation must therefore disable that telemetry by default for Sales Radar workloads or explicitly document and approve the data path before any internal, authenticated, customer, contact, or other sensitive business context is used.

Webwright's rerunnable-script + screenshot/action-log approach is worth retaining as a future reproducibility pattern because it can make long-horizon browser work easier to audit and replay. It does not change the current runtime decision: generated scripts, screenshots and visual self-checks remain execution diagnostics, not evidence that a message was sent, a meeting occurred, or any other business-state transition completed.

### Crawl/runtime dependency isolation

Crawl4AI remains an optional enrichment layer rather than a truth source or mandatory runtime. Its current `0.9.2` dependency graph has an additional isolation risk beyond the MCP v2 bridge issue: issue #2098 documents that `unclecode-litellm==1.81.13` installs a top-level `litellm` package that can silently collide with the upstream `litellm` distribution when both are present, producing install-order-dependent import failures. Upstream PR #2107 proposes restoring the official LiteLLM distribution with a post-compromise safe range, but that change is not merged yet.

Sales Radar therefore does not co-install Crawl4AI into a shared Python environment merely for convenience. If a future self-hosted Crawl4AI path is justified, prefer process/container isolation or a verified upstream release whose package metadata no longer shadows upstream LiteLLM, then prove imports and runtime behavior in a clean environment before promotion. This does not change current product truth semantics or create a new dependency.

### Crawl security floor

GitHub-reviewed advisory GHSA-2jq4-q6vv-4cp3 documents a critical path-traversal flaw in Crawl4AI download handling for versions `<=0.8.9`: attacker-influenced download names could escape the configured downloads directory and write arbitrary bytes as the crawler user, with remote-code-execution impact. The fix ships in `0.9.0`, and the currently observed `0.9.2` release is above that floor.

This is a deployment boundary rather than an adoption trigger. Sales Radar must never introduce or roll back a self-hosted Crawl4AI runtime below `0.9.0`. If a future crawler runtime enables downloads, run it as an unprivileged user with a dedicated isolated downloads directory that cannot write sensitive application/runtime paths, and require authentication on exposed Docker API endpoints. The current adapter/runtime remains unchanged because production does not require a downgrade or a new self-hosted Crawl4AI service.

### Crawl result semantics

Crawl4AI issue #2135 exposes a separate truth-boundary hazard in the documented PDF pipeline: `PDFCrawlerStrategy` can successfully extract complete markdown while anti-bot detection evaluates a 33-byte placeholder HTML response and ultimately sets `success=false`. The maintainers report the fix is already in `develop` and planned for the next release, but `v0.9.2` remains the latest observed stable release.

Sales Radar should not paper over this contradiction by treating either the provider flag or the extracted payload as sufficient truth on its own. A future PDF-source adapter should preserve the provider error for traceability, independently validate source URL/content type and extracted content before creating SearchEvidence, and keep evidence validation separate from crawler execution status. Until a fixed stable release is verified, this remains a `WATCH` constraint rather than a reason to change the current runtime.

### Crawl latency semantics

Crawl4AI issue #2129 exposes a separate reliability/performance hazard in `v0.9.2`: `_crawl_web` can spend the full 30-second body-visibility wait on pages whose body remains hidden by patterns such as AngularJS `ng-cloak` or Vue `v-cloak`, even though `ignore_body_visibility=True` is the default and the crawl can still finish with `success=true`. The reporter reproduced roughly 30.4 seconds for a hidden-body fixture versus 0.3 seconds for an otherwise equivalent visible page, with the same extracted content after lowering the timeout ceiling. The issue is marked done/pending release, but no newer stable release than `v0.9.2` was found in this scan.

This does not justify replacing or upgrading the current Sales Radar crawler path. It does create a future self-hosted benchmark gate: include hidden/cloaked-body fixtures, record latency separately from provider success, and either verify the upstream fix in a released version or explicitly configure a bounded body-visibility timeout based on extraction-quality tests. A provider success flag is not sufficient evidence that crawl latency is operationally acceptable.

### MCP/runtime compatibility discipline

MCP SDK major versions are protocol/runtime boundaries, not routine dependency upgrades. The MCP Python SDK stable line has now moved to `v2.1.1` (2026-08-25). `v2.1.0` improved 2026-07-28 HTTP behavior and expanded request-size limits, but it also changes handler-error wire semantics: unexpected handler exceptions are no longer sent verbatim to clients, and intentional model-visible errors must use the SDK's typed error classes. Crawl4AI issue #2147 still demonstrates the broader migration risk: its Docker MCP bridge can fail at process boot when an unbounded dependency resolves to v2.

MCP Python SDK issue #3382 adds a separate long-lived-client reliability gate. Its minimal reproduction shows that cancellation or teardown of an OAuth flow from another task can leave the SDK's OAuth lock permanently held; subsequent requests through the same provider then hang until restart. The report is still open and labeled as affecting both v1 and v2; `v2.1.1` release notes only redirect legacy FastMCP imports and do not report a fix. A future Sales Radar MCP 2.x experiment must therefore include forced cancellation, timeout, reconnect and same-process recovery tests rather than validating only initialization and happy-path tool calls.

Issue #3385 adds a cross-language payload-integrity gate. For an unannotated tool result containing non-finite floats, the SDK can put bare `NaN`/`Infinity` tokens into a text content block and still report `is_error=false`. Python's default JSON parser accepts those extension values while standards-compliant clients such as Node reject them, so provider success and even same-language parsing are insufficient evidence that a result is portable or valid. Any future Sales Radar MCP adapter must validate result payloads at the adapter boundary, reject or normalize non-finite numeric values before SearchEvidence/fact/business-state processing, and include a cross-language JSON fixture in compatibility tests.

The same discipline now explicitly covers Exa. Sales Radar currently builds its production backend image with `mcporter@0.12.3` and `exa-mcp-server@3.2.1`. Upstream issue #421 shows the hosted Exa endpoint negotiating `2025-11-25` even when a client proposes `2026-07-28`, and then rejecting a request that incorrectly sends the newer protocol header. This is not a current production regression: the pinned local runtime is healthy and the existing tests exercise Exa runtime configuration. It is an upgrade boundary. Clients must honor the negotiated protocol version rather than assume the newest published spec.

Sales Radar therefore does not adopt MCP v2 or a newer Exa MCP package by default. Any future MCP-backed provider or orchestration runtime must pin a supported major/version, verify initialize/tool/resource behavior and auth/telemetry semantics in isolation, exercise cancellation/reconnect recovery where applicable, validate cross-language result payloads independently of provider success flags, and preserve an adapter-level rollback path. The current Crawl4AI enrichment path remains unchanged because there is no evidence that production depends on its affected Docker/MCP bridge.

## Scan record — 2026-08-26

- Current main head `dd1172cf131f862d00afbd6ac6f0d5f6af1f2840` is deployment-healthy: Vercel and both Railway commit statuses are successful. No production regression was observed.
- Draft PR #39 remains isolated feature work and was not merged or altered during this radar update.
- Added Crawl4AI issue #2129 as a latency/reliability gate after canonical GitHub verification. On `v0.9.2`, a hidden `<body>` can add the full ~30-second visibility wait even with the default `ignore_body_visibility=True`, while the crawl still reports `success=true`. The issue is marked done/pending release; no newer stable Crawl4AI release was found. Future self-hosted evaluation must benchmark hidden/cloaked-body pages and separate latency acceptance from provider success.
- Added MCP Python SDK issue #3385 as a result-integrity gate. Both v2 and the v1 maintenance line can emit success-shaped text content containing non-standard `NaN`/`Infinity` JSON tokens, which can parse in Python but fail in standards-compliant clients such as Node. Future MCP adapters must validate cross-language payloads and reject/normalize non-finite values before they can influence SearchEvidence, facts or business state. No production MCP package or runtime changed.
- Added GitHub-reviewed advisory GHSA-2jq4-q6vv-4cp3 as a Crawl4AI deployment floor: versions `<=0.8.9` are affected by a critical download-path traversal / arbitrary-file-write vulnerability with RCE impact; `0.9.0` is the patched floor and the currently observed `0.9.2` is above it. Future self-hosted deployments must not downgrade below `0.9.0`, and download-enabled runtimes should use an unprivileged user, isolated downloads directory and authenticated exposed Docker API.
- Refreshed `modelcontextprotocol/python-sdk` from observed `v2.0.0` to current stable `v2.1.1`, released 2026-08-25. The release line adds useful protocol/server hardening, but this is not an adoption trigger while existing MCP-backed production paths are pinned and healthy.
- Added open MCP Python SDK issue #3382 as a cancellation/reconnect reliability gate. The reported OAuth flow can poison its task-owned lock after cross-task cancellation and make a long-lived client hang on every subsequent request until process restart. Future MCP 2.x evaluation must explicitly test cancellation, timeout, reconnect and same-process recovery.
- Added Browser Use issue #5216 as an explicit privacy/telemetry boundary: default-on telemetry can carry task text, visited URLs, action history (including typed text), and final result to PostHog. Status remains `DEFERRED`; any future isolated evaluation must disable telemetry by default or explicitly approve and test the data path before sensitive business context is used.
- Added Crawl4AI issue #2135 as a `WATCH` constraint after verifying the deterministic `v0.9.2` PDF contradiction: full extracted markdown can coexist with `success=false` because anti-bot detection evaluates placeholder HTML. Maintainers state the fix is in `develop` for the next release. No runtime or dependency changed.
- Re-verified the Browser Use action-result evidence directly against GitHub: #5486 is the failed tab-switch-reported-success bug, while #5469 remains the failed click/dropdown-reported-success case. A search-index result temporarily mislabeled #5499, but the canonical GitHub issue record shows #5499 is an unrelated history-reuse enhancement; canonical issue data remains the audit source. Status stays `DEFERRED` while Browserbase is healthy.
- Refreshed recent LiveKit issue activity. AWS STT dependency incompatibility, Silero false-speech/self-interruption reports, and new proposals for provider-tool lifecycle and latency-budget events reinforce the existing realtime benchmark gates; they do not justify adding or replacing a runtime before Sales Radar has a verified realtime gap.
- Browser Use `0.13.8` also has a newly reported reasoning-model configuration bug (#5543) that can silently drop sampling parameters when an empty classifier entry matches every model. Because Browser Use is already `DEFERRED` and not a production dependency, this is supporting evidence rather than an adoption-status change.
- Crawl4AI remains at observed stable `v0.9.2`; no fixed stable PDF or body-visibility release was found in this scan.
- No candidate justified replacing Browserbase, the existing Crawl4AI adapter, Exa pins, or internal eval/trace seams.
- No Browserbase session was created for this review.

## Scan record — 2026-08-25

- Main head `cf724beef266c00d98dfbfbed92b1be4ce26e79d` remained production-healthy at this scan: Vercel and both Railway deployment statuses were successful; no production regression was observed.
- One draft feature PR (#39) remained open. Its CI is currently failing and it is non-mergeable, but it is still isolated feature work rather than a production regression; no production merge was attempted from that PR.
- Added the Crawl4AI/LiteLLM package-collision caveat after verifying issue #2098 and the still-open fix PR #2107. `crawl4ai==0.9.2` can collide with an independently installed upstream LiteLLM because `unclecode-litellm==1.81.13` writes the same top-level package name; the proposed upstream fix returns to `litellm>=1.83.0,<1.92.0`. No Sales Radar dependency or runtime changed because the current production path does not require this shared Python environment.
- Added `pipecat-ai/pipecat` as `WATCH` after verifying the public repository identity, active maintenance, `v1.7.0` release on 2026-08-01 and BSD-2-Clause license. It is a plausible future realtime benchmark peer to LiveKit, not a dependency to install before a measured gap exists.
- Added `microsoft/Webwright` as `DEFERRED` after verifying the Microsoft Research repository, MIT license and `0.1.0` plugin manifest. Its rerunnable-script and visual self-verification pattern is useful for future browser reproducibility, but a second production browser runtime is unjustified while Browserbase is healthy.
- Refreshed `livekit/agents-js` against official `@livekit/agents@1.7.0` release evidence (published 2026-08-20) and Apache-2.0 license. The release changes sensitive telemetry field names and makes data-stream read/reconnect failures explicit, so a future adapter must treat those as compatibility and outcome-truth boundaries.
- Refreshed LiveKit PII-redaction applicability: the current provider feature is Cloud-only, off by default and post-session. It remains a defense layer rather than a substitute for Sales Radar retention, consent/visibility and evidence policy.
- No LiveKit or Pipecat dependency/runtime was added because the current product has no verified gap requiring realtime execution yet; rollback remains “no runtime installed.”
- `chatwoot/chatwoot` remains interaction research rather than an integration. Its recent delivery/outcome and advanced agent controls are substantially enterprise-scoped and do not justify weakening the repository's own communication-evidence model.
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
