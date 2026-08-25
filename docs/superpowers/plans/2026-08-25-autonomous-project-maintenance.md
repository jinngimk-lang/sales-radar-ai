# Autonomous Project Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the owner's standing delegation into repository-visible autonomous maintenance governance plus a continuously refreshed technology radar.

**Architecture:** Keep product truth and deployment gates unchanged. Add governance/documentation only; use the existing GitHub, web, Vercel and Railway paths rather than introducing a new runtime. A recurring condition-watch performs discovery and acts only when a candidate clears the adoption gate.

**Tech Stack:** Markdown governance, GitHub Actions/CI evidence, GitHub repository operations, Vercel/Railway production verification, scheduled condition watch.

**Spec:** `docs/superpowers/specs/2026-08-25-autonomous-project-maintenance-design.md`

## Global Constraints

- Source -> Evidence -> Fact -> Assessment -> Recommendation -> Explicit User Action -> Verifiable Outcome remains authoritative.
- Do not add dependencies because they are popular.
- Apache-2.0/MIT/BSD-compatible code is preferred; incompatible code is not copied without explicit compatibility resolution.
- Normal reversible repository actions may proceed autonomously; destructive, secret/credential, paid, legal, sensitive-disclosure and external-publication actions remain gated.
- `PROJECT_BLUEPRINT.md` must be updated whenever validated implementation changes product direction.
- Healthy/no-change radar checks remain silent.

---

### Task 1: Persist autonomous-owner governance

**Files:**
- Modify: `PROJECT_BLUEPRINT.md`
- Modify: `AGENTS.md`
- Modify: `.agent/PROJECT_MEMORY.md`

**Interfaces:**
- Consumes: existing context-recovery, truth hierarchy, deployment discipline.
- Produces: explicit autonomous decision scope and mandatory continuous-radar loop for future agents.

- [ ] Add the autonomous owner operating contract to the living blueprint.
- [ ] Add technology-radar recovery/read instructions to `AGENTS.md`.
- [ ] Record the stable delegation and continuous-maintenance rule in project memory.
- [ ] Verify the three documents agree on truth boundaries, escalation boundaries and blueprint-update discipline.

### Task 2: Add auditable technology radar

**Files:**
- Create: `docs/technology-radar.md`

**Interfaces:**
- Consumes: public GitHub/release/technical evidence.
- Produces: WATCH/EXPERIMENT/ADOPTED/DEFERRED/REJECTED records with license, value, rollback and verification notes.

- [ ] Seed the radar with the 2026-08-25 Crawl4AI, Browser Use, LiveKit Agents and Chatwoot findings.
- [ ] Record why no new runtime is being added today where the existing path is healthy.
- [ ] Record the privacy/observability requirement for future realtime-agent adoption.

### Task 3: Create continuous condition watch

**Files:**
- External automation only; no repository runtime dependency.

**Interfaces:**
- Consumes: repository governance plus current GitHub/web/project release information.
- Produces: silent no-op when no meaningful change exists; otherwise a verified repo change or an intervention alert.

- [ ] Create an hourly condition watch.
- [ ] Require it to read `AGENTS.md`, `PROJECT_BLUEPRINT.md` and `docs/technology-radar.md` before acting.
- [ ] Require license/activity/value checks before adoption.
- [ ] Allow safe branch/PR/merge/deploy work only after tests and CI are green.
- [ ] Require radar + blueprint updates for adopted or strategy-changing findings.
- [ ] Keep Browserbase sessions user-triggered; do not create them merely for monitoring.

### Task 4: Merge and verify governance change

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: `main` as the authoritative recovery point for future agents.

- [ ] Open a PR describing the governance change and initial radar evidence.
- [ ] Confirm docs-only change does not weaken CI/deployment gates.
- [ ] Merge after repository checks are green.
- [ ] Confirm `main` contains the blueprint, agent guide, memory, spec, plan and technology radar.

## Self-review

- Spec coverage: all autonomous-scope, radar, adoption, notification and blueprint-sync requirements are represented above.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type/interface consistency: this plan introduces no runtime API or schema changes.