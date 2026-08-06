---
name: code-review
description: Review a branch or PR on two separate axes: repository standards and originating specification.
---

# Code Review

Use the merge-base with `main` as the fixed point unless another point is explicit.

## Standards axis

Review the diff against:

- `CONTEXT.md`
- `.agent/SKILL_REGISTRY.md`
- Relevant ADRs and project docs
- Existing TypeScript, React, Express, Prisma, and test conventions

Also check for: mysterious names, duplication, data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change, speculative generality, message chains, and pass-through middle layers.

Treat smell findings as judgement calls; project governance is authoritative.

## Spec axis

Compare the diff to the user request, issue, design document, and screenshots. Report:

- Missing or partial requested behavior
- Behavior added without justification
- Implemented behavior that does not actually satisfy the user-visible requirement

## Required output

Keep the axes separate under `Standards` and `Spec`. Include file and behavior references, severity, and a concrete fix. Do not merge until blocking findings are resolved and the full relevant suite is green.
