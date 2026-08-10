# Contributing to Sales Radar AI

Thank you for helping build an evidence-first sales intelligence system. Contributions from developers, sales practitioners, data-quality researchers and AI agents are welcome.

## Good first contributions

- improve source provenance, freshness or evidence explanations;
- add tests for search, Radar or company-research edge cases;
- improve accessibility, internationalization or empty/error states;
- add a provider adapter behind an existing interface;
- improve documentation and deployment diagnostics;
- propose safe CRM or sales-action integrations that require user confirmation.

## Before you start

1. Search existing Issues and Discussions.
2. Open an issue for a new public seam, provider or architecture change.
3. Read [`AGENTS.md`](AGENTS.md), [`CONTEXT.md`](CONTEXT.md) and [`.agent/SKILL_REGISTRY.md`](.agent/SKILL_REGISTRY.md).
4. Keep one pull request focused on one independently verifiable outcome.

## Local setup

```bash
git clone https://github.com/jinngimk-lang/sales-radar-ai.git
cd sales-radar-ai
npm ci

cd backend
npm ci
cp .env.example .env
npm run prisma:generate
```

Use a local PostgreSQL database. Do not use production credentials or real private customer data in development or tests.

## Trust rules

Every contribution must preserve:

```text
Source -> Evidence -> Fact -> Assessment -> Recommendation
```

Do not:

- generate mock companies or news to hide an empty state;
- infer a contact, email, phone number or relationship;
- represent expansion, hiring or technology use as purchase intent;
- bypass workspace ownership, OpportunityEvidence integrity or Lead Quality Gate;
- make an external side effect without explicit user action;
- log or commit secrets, cookies, private prompts or customer exports.

## Verification

Run the full suite before requesting review:

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

Provider-dependent changes should include mock transport tests and a clearly separated manual runtime verification. Never put a real API key in a test fixture.

## Pull requests

Describe:

- the user problem and outcome;
- the data and trust boundaries affected;
- files and public interfaces changed;
- tests actually run and their results;
- environment variables or migrations required;
- runtime behavior that still needs human verification.

Agent-authored contributions are welcome. The human or organization opening the pull request remains responsible for reviewing the diff, licensing the contribution and confirming the reported verification.

## License

Unless explicitly stated otherwise, contributions submitted to this repository are licensed under Apache-2.0 under the terms of the project [`LICENSE`](LICENSE).
