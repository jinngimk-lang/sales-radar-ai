# Autonomous Project Maintenance Design

Date: 2026-08-25
Status: Approved by standing owner delegation

## Goal

Operate Sales Radar AI as a continuously maintained evidence-first product: recover project context before acting, make normal reversible repository decisions autonomously, scan relevant open-source and technical developments, adopt only changes that solve a concrete verified weakness, verify them independently, and keep `PROJECT_BLUEPRINT.md` synchronized with validated strategy changes.

## Decision model

The default operating loop is:

```text
Recover context
  -> Check production / open work evidence
  -> Scan relevant GitHub projects and technical information
  -> Classify candidate value and risk
  -> Experiment or integrate the smallest useful change
  -> Test / CI / production verification
  -> Record outcome in technology radar
  -> Update PROJECT_BLUEPRINT.md when direction changes
```

Normal, reversible, evidence-backed repository actions can proceed without asking the owner again. Destructive or irreversible operations, secrets or credential changes, paid-plan changes, legal commitments, sensitive security disclosure, or external publication remain outside the autonomous default and require the applicable safety/authorization gate.

## Continuous technology radar

The radar covers:

- sales intelligence, CRM and marketplace workflow patterns;
- recommendation, ranking, search, reranking and RAG;
- public-web crawling, source extraction and provenance;
- social/public-source ingestion;
- browser automation and cloud-browser runtimes;
- communication inboxes, realtime agents and channel orchestration;
- MCP, agent orchestration and evaluation;
- tracing, observability, PII handling and runtime reliability;
- provider API/model/runtime changes that can affect production.

Each candidate is recorded as one of:

- `WATCH` — relevant, but no verified product gap requires adoption;
- `EXPERIMENT` — worth an isolated reversible test;
- `ADOPTED` — integrated because it solved a concrete verified weakness;
- `DEFERRED` — useful idea, but current architecture already has a healthy path or adoption cost is too high;
- `REJECTED` — incompatible license, weak maintenance, unsafe behavior, redundant architecture, or no measurable value.

For every candidate, record repository/product identity, version or source date, maintenance evidence, license, problem solved, integration boundary, rollback path and verification evidence.

## Adoption gate

A new dependency, copied file, adapted component, protocol or runtime is allowed only when all of the following are true:

1. There is a concrete current weakness or delivery requirement.
2. The candidate is active enough for the intended role and its release/source can be identified.
3. License compatibility is understood; Apache-2.0/MIT/BSD-compatible code is preferred.
4. The smallest useful integration is chosen; popularity alone is not a reason.
5. External runtimes remain behind replaceable interfaces/factories.
6. Truth boundaries are unchanged: Source -> Evidence -> Fact -> Assessment -> Recommendation -> Explicit User Action -> Verifiable Outcome.
7. Tests or contract checks demonstrate value and guard the affected boundary.
8. Rollback is clear before production deployment.

Source-available, copyleft or otherwise incompatible projects may inform product/UX patterns, but code is not copied into this Apache-2.0 repository unless compatibility is explicitly resolved.

## Autonomous integration discipline

When a radar item qualifies for adoption, the agent should:

1. Recover `AGENTS.md`, `PROJECT_BLUEPRINT.md`, `CONTEXT.md`, `.agent/PROJECT_MEMORY.md`, relevant skills and active PR/CI state.
2. Prefer an isolated branch and atomic commits.
3. Use test-first changes for behavior modifications where practical.
4. Preserve provider replaceability, provenance and user-scoped data ownership.
5. Run proportional checks, then the complete frontend/backend merge gate before merging.
6. Revalidate Vercel production, both Railway deployments, production API semantics and protected UI invariants after deployment.
7. Update `docs/technology-radar.md` with the actual result.
8. Update `PROJECT_BLUEPRINT.md` in the same change whenever the validated direction changes.

If an experiment fails, record the failure and rollback instead of weakening tests or truth boundaries to make adoption appear successful.

## Notification discipline

Routine healthy checks and non-actionable watch items should remain silent. Notify the owner only for meaningful production regressions, blocked integrations, quota/plan/credential intervention, destructive-risk decisions, or a material strategy change that cannot be made safely inside existing authorization.

## Initial 2026-08-25 radar conclusions

- Crawl4AI `v0.9.2` remains the current release observed on GitHub. The existing Sales Radar integration path should be reused; no duplicate crawler runtime should be added merely because a new release exists. If the project ever self-hosts the Crawl4AI HTTP server, review the secure-by-default server changes introduced in the `0.9.x` line before deployment.
- `browser-use` `0.13.8` is MIT and active, but Browserbase is currently the healthy production browser path. Browser Use stays `DEFERRED` as an alternate runtime until it solves a concrete Browserbase limitation or a validated workflow requires local/browser-agent behavior.
- `@livekit/agents` `1.7.0` is Apache-2.0 and current. Realtime communication remains a strong future candidate, but adoption should include observability and explicit PII/redaction/retention controls before storing agent transcripts or recordings.
- Chatwoot's August 2026 releases reinforce useful communication-control patterns: channel/template visibility, assistant audience/schedule controls, call timelines and drill-down from metrics to conversations. These are product-pattern inputs, not code-copy instructions.

## Success criteria

This governance is successful when project evolution is faster without becoming less truthful: useful external developments are found early, unnecessary dependencies are rejected early, integrations are small and reversible, production remains independently verified, and the living blueprint always matches the direction actually being built.