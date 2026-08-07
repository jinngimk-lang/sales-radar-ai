# Issue 21 verification scope

This change is complete only when the pull-request CI verifies all of the following together:

- Agent Reach can orchestrate a 30-result target through bounded upstream batches.
- Hosted market-research quota failures fall back to the configured Exa path.
- Direct search optionally enriches every current-task lead with publicly observed contacts while isolating per-site failures.
- Current-task results, including contacts, are rendered directly in the AI command center through a strongly typed mapping.
- Market sources expose an operator-authorized, read-only Browserbase Live View and retain a clearly labeled non-interactive snapshot fallback.
- Both market Live View routes require the existing revenue operator middleware.
- Empty source categories are disabled and active source filters expose accessible pressed state.
- Frontend typecheck, tests, and build pass.
- Backend Prisma validation, typecheck, tests, and build pass.

The PR must not merge while any required check is missing, action-required, cancelled, or failing.

Final verification covers feature head `e8111bdae54863b7e401db9bfdd3a510f1c29427` plus this documentation-only trigger commit.
