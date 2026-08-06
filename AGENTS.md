# Sales Radar AI Agent Instructions

## Agent skills

### Issue tracker

Engineering issues and specifications are tracked in GitHub for `jinngimk-lang/sales-radar-ai`. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository. Read `CONTEXT.md`, `.agent/SKILL_REGISTRY.md`, and relevant files under `.agent/` and `docs/adr/`. See `docs/agents/domain.md`.

### Engineering workflow

For reported defects use `.agent/skills/diagnosing-bugs/SKILL.md`, then `.agent/skills/tdd/SKILL.md`. Before merge use `.agent/skills/code-review/SKILL.md`. Use `.agent/skills/codebase-design/SKILL.md` when a public seam or module shape must change.

### Non-negotiable project boundaries

- Real sources and evidence only; never create decorative success data.
- Public business contact data only, with source and observation time.
- No bypass of authentication, platform restrictions, workspace ownership, or evidence gates.
- No secrets, tokens, cookies, private contact data, KYC data, or payment credentials in Git.
- Tests and production behavior must describe the same user-visible capability.
