# Sales Radar AI Agent Guide

This file is the repository entry point for Codex, GitHub Copilot, Claude Code and other coding agents.

## Mission

Sales Radar AI turns public market changes into evidence-backed sales opportunities. It helps a salesperson discover, understand and act; it does not create customer truth.

## Read before changing code

1. `CONTEXT.md` — current product and architecture context.
2. `.agent/SKILL_REGISTRY.md` — skill ownership and write boundaries.
3. `.agent/PROJECT_MEMORY.md` — stable product decisions.
4. Relevant `.agent/skills/*/SKILL.md` files for the requested domain.
5. `docs/adr/` for architectural decisions that affect the change.

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

## Engineering workflow

- Diagnose before fixing: `.agent/skills/diagnosing-bugs/SKILL.md`.
- Use test-first changes: `.agent/skills/tdd/SKILL.md`.
- Review public seams with `.agent/skills/codebase-design/SKILL.md`.
- Review before merge with `.agent/skills/code-review/SKILL.md`.
- Track work in GitHub: `docs/agents/issue-tracker.md`.

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
