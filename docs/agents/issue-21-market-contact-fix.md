# Issue 21 verification scope

This change is complete only when the pull-request CI verifies all of the following together:

- Agent Reach can orchestrate a 30-result target through bounded upstream batches.
- Hosted market-research quota failures fall back to the configured Exa path.
- Direct search optionally enriches every current-task lead with publicly observed contacts while isolating per-site failures.
- Current-task results, including contacts, are rendered directly in the AI command center.
- Market sources expose an explicitly read-only Browserbase Live View and retain a clearly labeled historical snapshot fallback.
- Empty source categories are disabled and active source filters expose accessible pressed state.
- Frontend typecheck, tests, and build pass.
- Backend Prisma validation, typecheck, tests, and build pass.

The PR must not merge while any required check is missing, action-required, cancelled, or failing.

Final verification rerun covers source head `67139e0a572e847c07c43ae58c9ab3a95297eaa2` plus this documentation-only trigger commit.
