---
name: diagnosing-bugs
description: Disciplined diagnosis loop for broken, failing, incorrect, non-interactive, or slow behavior.
---

# Diagnosing Bugs

Read `CONTEXT.md`, relevant ADRs, and `.agent/SKILL_REGISTRY.md` first.

## Phase 1 — Build a feedback loop

Create one deterministic, fast, agent-runnable command that reaches the user's exact symptom and can fail for that symptom. Prefer, in order:

1. Failing test at the real public seam.
2. HTTP/curl reproduction.
3. Headless-browser reproduction.
4. Captured trace replay.
5. Minimal throwaway harness.

Do not form a root-cause theory before a red-capable loop exists.

## Phase 2 — Reproduce and minimise

Run the loop red more than once. Reduce inputs, callers, configuration, data, and steps until every remaining element is load-bearing.

## Phase 3 — Hypothesise

Write 3–5 ranked, falsifiable hypotheses. Each must predict what observation would support or reject it. Proceed with the ranking without blocking when the user has delegated decisions.

## Phase 4 — Instrument

Change one variable at a time. Prefer debugger inspection, then targeted logs. Tag temporary logs with a unique `[DEBUG-...]` prefix.

## Phase 5 — Fix and regression test

At the correct seam:

1. Turn the minimal reproduction into a failing regression test.
2. Confirm red.
3. Apply the smallest root-cause fix.
4. Confirm green.
5. Re-run the original full reproduction.

## Phase 6 — Cleanup and post-mortem

- Remove temporary instrumentation and prototypes.
- Run the complete relevant suite.
- State the confirmed root cause in the commit and PR.
- Record any architectural prevention opportunity after the fix.

Never replace a real failure with mock data, a decorative UI, or a misleading success state.
