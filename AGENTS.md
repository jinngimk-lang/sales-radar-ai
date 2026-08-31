# Sales Radar AI Agent Guide

This file is the repository entry point for Codex, GitHub Copilot, Claude Code and other coding agents.

## Mission

Sales Radar AI turns public market changes into evidence-backed sales opportunities. It helps a salesperson discover, understand and act; it does not create customer truth.

## Delivery gate

This repository uses `PROJECT_WORKFLOW.md` as the delivery and handoff protocol. Normal product work must remain on a clean independent branch until the Owner has locally verified the result and explicitly approved upstream synchronization. Repository-level autonomous authority does not override that delivery gate, and force-pushing the default branch is forbidden.

## Read before changing code

1. `PROJECT_WORKFLOW.md` — Owner-verified delivery gate, branch safety, handoff and context-recovery rules.
2. `CONTEXT.md` — current product and architecture context.
3. `PROJECT_BLUEPRINT.md` — living product direction, buyer/seller workspace plan, autonomous-owner contract, technology-watch policy and context-recovery protocol.
4. `docs/technology-radar.md` — current external project/provider/runtime watch decisions and adoption status.
5. `.agent/SKILL_REGISTRY.md` — skill ownership and write boundaries.
6. `.agent/PROJECT_MEMORY.md` — stable product decisions.
7. Relevant `.agent/skills/*/SKILL.md` files for the requested domain.
8. `docs/adr/`, relevant specs and plans for architectural decisions that affect the change.

When context becomes long or implementation direction changes, re-read `PROJECT_BLUEPRINT.md` and update it when a validated new direction is accepted. Do not let implementation drift become undocumented product strategy.

Before introducing a new external subsystem, runtime, dependency, copied file, adapted component or provider integration, check `docs/technology-radar.md` and refresh the relevant upstream evidence. If a finding materially changes adoption status or product direction, update the radar and blueprint in the same delivery slice.

Do not scan unrelated historical documents when the current code and the files above answer the task.

## Truth hierarchy

```text
Source
  -> Raw data
  -> Evidence
  -> Fact
  -> Assessment
  -> Recommendation
```

The entities are not interchangeable:

- Source is not Evidence.
- Evidence is not a company Fact until validated.
- MarketSignal is not Opportunity.
- Opportunity is not Qualified Lead or Customer.
- CompanyProfile is not Customer.
- A draft or opened external channel is not a sent message.
- Potential revenue is not confirmed or paid revenue.

## Protected boundaries

Never bypass or weaken these to increase visible result counts:

- SearchEvidence provenance and validation.
- RadarAssessment decision and version history.
- OpportunityEvidence integrity and workspace ownership.
- Qualification Version and Lead Quality Gate.
- Contact evidence requirements.
- Revenue operator authorization and explicit user action.

Never invent companies, people, emails, phone numbers, purchase events, partnerships, budgets, meetings, payments or provider success.

## Architecture

```text
Product Intelligence
  -> Search Intent
  -> SearchTask
  -> Provider adapters
  -> SearchEvidence
  -> RadarAssessment / MarketSignal
  -> Opportunity integrity path
  -> Company Intelligence
  -> Sales Agent
  -> explicit Live Execution
  -> Revenue evidence
```

Providers must remain replaceable. Business services call interfaces or factories, not a specific external model, crawler or agent runtime.

## Autonomous owner operating mode

The owner has delegated normal, reversible, evidence-backed repository decisions to the operating agent. Within the permissions actually available to the connected tools, the agent may independently research, create branches/issues/PRs, modify files, run or inspect CI, coordinate deployments and update repository governance without asking again for each routine decision.

That autonomous authority is exercised inside the delivery gate in `PROJECT_WORKFLOW.md`: implementation may proceed independently on a work branch, but the upstream default branch is not changed until the Owner locally verifies and explicitly approves the delivery.

The autonomous default does **not** cover destructive or irreversible operations, secrets/credential changes, paid-plan changes, legal commitments, sensitive security disclosure or external publication. Those remain subject to the applicable safety and authorization gate.

For ongoing maintenance, use this loop:

```text
Recover context
  -> inspect production/open work evidence
  -> scan relevant GitHub + technical developments
  -> classify value/license/risk
  -> integrate only the smallest change that solves a verified weakness
  -> test / CI / production verification
  -> update technology radar
  -> update PROJECT_BLUEPRINT.md if direction changed
```

A healthy existing path is a reason to defer a redundant runtime, not a reason to add it pre-emptively.

## Engineering workflow

- Diagnose before fixing: `.agent/skills/diagnosing-bugs/SKILL.md`.
- Use test-first changes: `.agent/skills/tdd/SKILL.md`.
- Review public seams with `.agent/skills/codebase-design/SKILL.md`.
- Review before merge with `.agent/skills/code-review/SKILL.md`.
- Track work in GitHub: `docs/agents/issue-tracker.md`.
- Check relevant actively maintained GitHub projects and recent provider/runtime information before adding a subsystem or when a current subsystem shows a verified weakness.
- Record meaningful external candidates and adoption/rejection evidence in `docs/technology-radar.md`.

Keep changes small and scoped. Preserve unrelated user changes in a dirty worktree. Do not commit secrets or generated local environments.

## Verification commands

```bash
# Frontend
npm run typecheck
npm test
npm run build

# Backend
cd backend
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

Run checks proportional to the change, then run the full set before merge. Never claim a check passed without fresh command output.

## Agent-authored pull requests

An agent-authored PR must state:

- the user outcome;
- changed files and boundaries;
- source/evidence implications;
- tests actually run;
- runtime configuration needed;
- anything that still requires human or production verification.

Runtime agents should not infer endpoints from this file. Use `docs/AGENT_INTEGRATION.md` and `docs/openapi/agent-api.yaml`.
