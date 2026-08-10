# GitHub Copilot instructions for Sales Radar AI

- Read `AGENTS.md`, `CONTEXT.md` and `.agent/SKILL_REGISTRY.md` before proposing repository changes.
- Preserve the evidence hierarchy: Source -> Evidence -> Fact -> Assessment -> Recommendation.
- Never turn a MarketSignal or Opportunity into a Customer, Qualified Lead, purchase fact or confirmed revenue without the existing quality gate and explicit user action.
- Never invent companies, contacts, emails, phone numbers, source URLs, provider results or commercial events.
- Keep provider-specific logic behind the existing provider interfaces and factories.
- Respect workspace/user ownership in every query and mutation. Cross-user lookup should fail safely.
- Do not log or commit API keys, cookies, prompts containing private data, operator tokens or payment credentials.
- Prefer focused TypeScript modules and existing repository patterns over framework rewrites.
- Add or update tests for behavioral changes. Run frontend and backend typecheck, tests and builds before marking work complete.
- Document runtime-dependent capabilities as configuration requirements, not as verified production behavior.
