# Issue 21 verification scope

This change is complete only when the pull-request CI verifies all of the following together:

- Agent Reach can orchestrate a 30-result target through bounded upstream batches.
- Hosted market-research quota failures fall back to the configured Exa path.
- Direct search optionally enriches every current-task lead with publicly observed contacts while isolating per-site failures.
- Current-task results, including contacts, are rendered directly in the AI command center through a strongly typed mapping.
- Market sources expose an operator-authorized, read-only Browserbase Live View and retain a clearly labeled non-interactive snapshot fallback.
- Both market Live View routes require the existing revenue operator middleware.
- Empty source categories are disabled and active source filters expose accessible pressed state.
- The production runtime-loading hotfix from main remains present in the pull-request merge result.
- Frontend typecheck, tests, and build pass.
- Backend Prisma validation, typecheck, tests, and build pass.

The PR must not merge while any required check is missing, action-required, cancelled, or failing.

Final integrated verification covers feature head `3458244e0a25f9d8ba7af8ff67a97063013348bf` plus this documentation-only trigger commit against the current main branch.
