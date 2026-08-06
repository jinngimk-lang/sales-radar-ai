---
name: setup-matt-pocock-skills
description: Configure this repository for the installed Matt Pocock engineering skills.
disable-model-invocation: true
---

# Setup Matt Pocock Skills

This repository is preconfigured as follows:

- Issue tracker: GitHub Issues in `jinngimk-lang/sales-radar-ai`.
- Domain layout: single-context, rooted at `CONTEXT.md`, with ADRs under `docs/adr/`.
- Skill location: `.agent/skills/`.
- Existing Sales Radar governance in `.agent/SKILL_REGISTRY.md` always overrides a generic engineering skill.

Before engineering work:

1. Read `CONTEXT.md` and relevant ADRs.
2. Read `.agent/SKILL_REGISTRY.md` for truth, privacy, evidence, and write boundaries.
3. Select the smallest applicable engineering skill.
4. Keep GitHub work in an isolated branch and PR.

Configuration details live in `docs/agents/issue-tracker.md` and `docs/agents/domain.md`.
