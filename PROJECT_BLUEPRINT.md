# Sales Radar AI Project Blueprint

Last updated: 2026-09-01
Owner intent: build Sales Radar AI into an evidence-first buyer/seller opportunity and sales operating workspace, continuously maintained within explicit safety and truth boundaries.

## 1. North star

Sales Radar AI helps a seller, buyer, partner-seeker, distributor-seeker, or market researcher define a commercial target, search the public web for attributable evidence, assess whether a real opportunity may exist, find verified public business contacts when available, prepare communication through explicit user-controlled actions, and track only verifiable outcomes.

The product is not a customer database and does not manufacture intent. More results are never obtained by weakening evidence quality.

## 2. Permanent truth hierarchy

```text
Source
  -> Raw data
  -> Evidence
  -> Fact
  -> Assessment
  -> Recommendation
  -> Explicit user action
  -> Verifiable outcome
```

Protected statements:

- Source != Evidence.
- Evidence != purchase intent.
- MarketSignal != Opportunity.
- Opportunity != Qualified Lead.
- CompanyProfile != Customer.
- Generated outreach != sent outreach.
- Opened external channel != sent message.
- Predicted revenue != confirmed revenue != paid revenue.

These truth boundaries remain even though the standalone Revenue workspace has been removed from the active product navigation.

## 3. Product direction: buyer/seller opportunity workspace

The product supports both sides of a commercial market:

- **FIND_BUYERS** — find likely buyers and buying-side public signals.
- **FIND_SUPPLIERS** — find suppliers and supply-side public signals.
- **FIND_PARTNERS** — find partnership opportunities.
- **FIND_DISTRIBUTORS** — find channel/distribution opportunities.
- **RESEARCH_COMPETITORS** — research competitors from attributable public evidence.
- **EXPLORE_MARKET** — gather market intelligence without forcing a lead outcome.

These modes must change the actual search intent sent to the crawler/MCP gateway, not only UI labels.

## 4. Core workspace information architecture

Primary navigation is:

1. **AI 工作台** — conversational command center and tool orchestration.
2. **目标** — persistent commercial targets and their state.
3. **推荐** — evidence-ranked signals/sources for the active target; reuses Market Radar.
4. **搜索** — proactive crawler/MCP public-web search with filters and result ranking.
5. **沟通** — communication preparation and attributable communication state.
6. **意向** — persisted/attributable outcomes; predictions remain predictions.
7. **设置** — providers, models, runtime and data-source state.

Current route mapping:

- `/app/home` -> AI 工作台
- `/app/targets` -> 目标
- `/app/market` -> 推荐 / 市场雷达
- `/app/discover` -> 搜索
- `/app/communication` -> 沟通
- `/app/intent` -> 意向
- `/app/account` -> 设置
- `/app/revenue` -> compatibility redirect to `/app/market`; Revenue UI is not rendered

## 5. Interaction principles

### A. Persistent target context

A selected Commercial Target carries product/service, buyer/supplier/partner/distributor goal, industry, region, entity role and signal focus across recommendation and search workflows. Manual edits remain authoritative and must not be presented as an exact persisted target once changed.

### B. Dense source/recommendation cards

A result should answer:

- Who/what is this public entity or page?
- Why is it relevant to the active target?
- What did the crawler actually observe?
- Which URL proves it?
- How fresh and trustworthy is the evidence?
- What is known vs inferred?
- What is the safest next action?

A public page is never automatically a customer or buyer.

### C. Recommendation shows information immediately

Market Radar / Recommendation does **not** automatically launch a remote cloud browser. The selected source immediately shows its webpage visual, honest snapshot, or evidence-backed source information. Browserbase, `REVENUE_OPERATOR_TOKEN`, and a “start Live” unlock are not part of the normal recommendation path.

A snapshot is labelled as non-interactive. A remote interactive browser may only be described as such if a genuine explicit remote-browser session exists in a future separately authorized workflow.

### D. Search behaves like an operating tool

Search combines query, target context, filters, ranking, source provenance and explicit failure states. Useful ordinary public pages remain eligible. Commercial scoring changes order and recommendations; it must not silently delete ordinary pages solely because their commercial score is low.

### E. Communication is a state machine, not a fake chat demo

At minimum:

```text
DRAFT
READY_TO_SEND
CHANNEL_OPENED
SENT_VERIFIED
REPLIED_VERIFIED
MEETING_VERIFIED
CLOSED
```

Do not render a conversation as sent unless a platform/API/user-confirmed receipt exists.

### F. Intent and outcomes are evidence views

Predicted intent remains a score/recommendation. Verified workflow outcomes require attributable records. Historical revenue entities may remain in the data model for compatibility/audit, but no Revenue UI is active in the primary workspace.

## 6. Search and backend architecture — 2026-09-01

### Active provider boundary

New search execution has one active business-facing provider:

```text
crawler / crawler-gateway
```

The full backend uses `CrawlerSearchProvider` selected by `SearchProviderFactory`. Historical `agent-reach` metadata may be read as a compatibility alias, but new tasks do not route through Agent Reach or Exa.

### Crawler/MCP gateway contract

```text
Commercial target / Discover query
  -> search intent
  -> SearchTask
  -> POST CRAWLER_GATEWAY_URL/search
  -> filter unsafe + encyclopedia/wiki URLs
  -> keep useful ordinary public pages
  -> optional POST /crawl for results lacking usable page text
  -> Source / SearchEvidence
  -> RadarAssessment / MarketSignal
  -> Opportunity integrity path
  -> Company/contact intelligence
  -> Recommendation
  -> explicit user action
```

Gateway `/search` accepts:

```json
{
  "keyword": "...",
  "platforms": ["Website"],
  "regions": ["Europe"],
  "maxResults": 20
}
```

and returns provider-neutral public-page records. The gateway may internally compose MCP search tools and Crawl4AI, but business code does not depend on a particular search API or search engine.

### Explicitly inactive search dependencies

The Vercel/serverless active search path must not invoke Exa or GDELT as hidden fallbacks. Railway has expired and is not a runtime dependency. Missing crawler configuration or crawler failure yields truthful unavailable/no-results behavior rather than switching to encyclopedia, mock or fabricated results.

### Source filtering

Explicit encyclopedia/wiki-style domains such as Wikipedia, Wikidata, Britannica and Baidu Baike are excluded before visible evidence. Ordinary company homepages, reports, news, forums, jobs, procurement pages, government pages, B2B pages and public social pages remain eligible.

Gateway deployments must enforce SSRF protection including DNS-resolved private/loopback/link-local/metadata targets and unsafe redirects. Application code additionally rejects invalid/non-public URL literals before enrichment.

## 7. Commercial Target persistence

`CommercialTarget` remains the long-running demand object. In the stateless Vercel workspace, the frontend service preserves the existing async API but stores versioned targets locally so `/app/targets`, Market Radar target restoration and target-aware Discover remain usable without the expired Railway backend/database runtime.

This local persistence is a product-availability mechanism, not proof of server persistence. If durable multi-device target state is restored later, it must preserve the same service contract and truth boundaries.

## 8. External technology governance

Relevant technologies remain behind replaceable interfaces. `docs/technology-radar.md` records upstream versions, licenses, vulnerabilities and operational risks.

Current architectural decisions:

- **Crawler/MCP gateway** — active provider boundary for public-web search.
- **Crawl4AI-compatible `/crawl`** — allowed page-acquisition component behind the gateway; self-hosting risks and version/security gates remain applicable.
- **Exa / Agent Reach** — no longer active serverless search routing; historical code/metadata must not silently reactivate it.
- **Browserbase** — not part of the normal Recommendation/Market Radar path. Any future remote-browser execution must be explicit and independently verified.
- **LiveKit Agents** — WATCH for future realtime communication, subject to privacy/observability/runtime gates.
- **Sales System Provider layer** — approved provider-neutral boundary for external prospecting, enrichment, CRM and outbound systems. Apollo-style prospect/enrichment/outbound providers and Zoho-style CRM/lifecycle providers must implement or map through the same central action, dedupe and receipt policies rather than becoming UI-specific silos.

### Sales System Provider action policy

External sales actions use one central risk contract:

```text
READ        -> automatic
DRAFT       -> automatic
WRITE       -> explicit approval required
CREDIT      -> explicit approval required
SEND        -> explicit approval required
DESTRUCTIVE -> blocked by default
```

Provider-specific policy may tighten these defaults but must never weaken them. A caller cannot downgrade an action declared by a provider (for example, sequence enrollment) from `SEND` to `READ`.

The default operating sequence is:

```text
Sales Radar target/evidence
  -> provider capability discovery
  -> exact live schema discovery when required
  -> search/read before paid enrichment
  -> deterministic dedupe before external creation
  -> approval gate for WRITE/CREDIT/SEND
  -> sender resolution before sequence enrollment
  -> exactly one selected provider execution
  -> attributable provider record/receipt
  -> verified communication/outcome state
```

Apollo is treated as the prospecting/enrichment/outbound side of this boundary; Zoho CRM is treated as the CRM system-of-record/lifecycle side. These are roles, not hard dependencies: adapters remain replaceable and the business layer does not directly depend on provider-specific tool names.

Cross-system linking is evidence-first. Preferred keys are same-provider external ID, verified normalized email, normalized profile URL, organization domain, then person full-name plus organization domain. Company domain alone is never enough to merge two people. Fuzzy identity similarity is not permission to mutate CRM state.

`SENT_VERIFIED`, `REPLIED_VERIFIED`, and `MEETING_VERIFIED` require an attributable provider receipt/message/thread/event identifier plus an observed timestamp. A generated draft, `accepted`, `queued`, opened provider UI, or sequence request alone is not a verified communication outcome.

Do not add a dependency because it is popular. Adopt only the smallest replaceable component that solves a verified weakness and passes tests/security/license review.

## 9. Context recovery protocol

When a new agent/window resumes this project, recover direction in this order:

1. `AGENTS.md`
2. `PROJECT_WORKFLOW.md`
3. `PROJECT_BLUEPRINT.md`
4. `CONTEXT.md`
5. `docs/technology-radar.md`
6. `.agent/PROJECT_MEMORY.md`
7. `.agent/SKILL_REGISTRY.md` and relevant skills
8. current Sep 1 spec/plan
9. open PR/CI/Vercel evidence and current code

Implementation must not drift away from this blueprint without updating it after evidence supports a better direction.

## 10. Deployment and delivery discipline

Vercel builds preview deployments from Git branches. GitHub CI remains the merge gate. Production is considered complete only after:

- frontend typecheck/tests/build pass;
- backend typecheck/tests/build and production image pass;
- Vercel preview/production deployment is healthy;
- crawler search contracts prove `/search` is used instead of Exa/GDELT;
- production/runtime configuration truthfully reports crawler availability;
- protected UI workflow invariants are verified.

Railway service checks are no longer part of deployment acceptance because Railway is expired and has been removed from the active runtime path.

Per `PROJECT_WORKFLOW.md`, this feature branch must remain separate from `main` until required owner-local verification and explicit approval for the default-branch update are satisfied.

## 11. Current phase — 2026-09-01: Crawler Gateway B recovery + sales-system orchestration

Current goals:

- remove Revenue from active navigation and redirect the legacy route;
- show recommendation source information/webpage visuals immediately without auto cloud-browser launch;
- make Commercial Targets usable locally in stateless mode;
- converge full-backend and Vercel search/research onto crawler/MCP `/search` plus optional `/crawl`;
- filter encyclopedia/wiki sources while retaining ordinary useful public pages;
- preserve evidence provenance and never manufacture buyer/customer/contact truth;
- make stateless production capability reporting and missing-backend UI truthful;
- establish a replaceable Apollo/Zoho-style Sales System Provider contract with approval, dedupe and communication-receipt gates before any live provider adapter is activated.

Current delivery branch: `agent/runtime-truth-workspace-smoke-20260901`, tracked by PR #75.

## 12. Dated decision record

### 2026-09-01 — Add a provider-neutral sales-system orchestration boundary

**Changed:** Sales Radar now defines a central Sales System Provider contract for external prospecting, enrichment, CRM and outbound systems. The first provider roles are Apollo-style prospect/enrichment/sequence operations and Zoho-style CRM/lifecycle/workflow operations. Central policy classifies actions as `READ`, `DRAFT`, `WRITE`, `CREDIT`, `SEND`, or `DESTRUCTIVE`; write/credit/send require explicit approval and destructive actions are blocked by default. Deterministic cross-provider linking and attributable communication receipt rules are part of the boundary.

**Why:** Sales Radar needs richer prospecting and CRM execution without turning external SaaS tools into product silos or letting paid enrichment, record creation, sequence enrollment, workflow activation, drafts or generic API success become unverified customer truth. The provider boundary lets business logic stay replaceable while protecting cost and communication state.

**Evidence:** The connected Zoho CRM MCP exposes explicit discovery -> tool list -> exact schema -> execute interaction and separates drafts/configuration from activation/execution. Apollo's current developer/MCP guidance emphasizes search before enrichment, credit-aware enrichment, deduplication before contact creation, sender-mailbox resolution before sequence enrollment and treating sequence enrollment as real outbound execution. Repository tests enforce the central action gate, evidence-backed record linking, single-provider execution and receipt requirements.

**Protected:** Existing Source -> Evidence -> Fact -> Assessment -> Recommendation boundaries; Lead/Contact quality gates; explicit user action for CRM/external mutations; generated draft != sent; accepted/queued != sent; no silent provider failover after an external write/send begins.

**Rollback:** remove the provider orchestration contracts/services/skill and their tests. No live Apollo or Zoho credential or production adapter is introduced by this contract slice, so rollback does not require migrating provider-owned records.

### 2026-09-01 — Remove Revenue UI and API-search discovery from the active workspace

**Changed:** Revenue leaves primary navigation; `/app/revenue` redirects to Market Radar. Recommendation uses immediate source visuals/information instead of automatic Browserbase. Search and Market Radar use the crawler/MCP gateway as the active discovery boundary. Exa/GDELT are removed from active serverless search routing.

**Why:** Railway expired; a stateless recovery was necessary. The intermediate recovery still used search APIs for candidate discovery and crawler only for page enrichment, which did not match the desired crawler/MCP architecture and made provider truth ambiguous. Browserbase/Revenue also added workflow chrome that was not required for the core research task.

**Evidence:** Sep 1 TDD contracts explicitly fail when Discover or Market Radar reaches GDELT/Exa while `CRAWLER_GATEWAY_URL` is configured, and require crawler `/search` plus encyclopedia filtering and useful ordinary-page retention.

**Protected:** Source -> Evidence -> Fact -> Assessment -> Recommendation; no fabricated leads/contacts; communication receipts and outcomes remain attributable; unsafe/private crawl targets remain blocked at application/gateway boundaries.

**Rollback:** revert PR #73 branch changes. Do not roll back to expired Railway or silently reactivate Exa/GDELT serverless search; any alternative provider must be an explicit, tested architecture decision.

## 13. Autonomous owner operating contract

Normal reversible, evidence-backed repository work may proceed autonomously within connected permissions: research, branches, files, tests, PRs, CI/reverification, documentation and deployment coordination. Destructive/irreversible operations, secrets/credential changes, paid-plan changes, legal commitments and sensitive external publication remain separately gated.

Repository-specific owner-local verification and explicit default-branch approval requirements in `PROJECT_WORKFLOW.md` remain authoritative for this delivery.
