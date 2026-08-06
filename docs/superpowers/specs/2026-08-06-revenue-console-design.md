# Revenue Console Design

## Goal

Add a dedicated revenue operations workspace to Sales Radar AI that records only evidence-backed opportunities and revenue, ranks work by risk-adjusted net value, and gives the operator a single page for deciding what to execute next.

## Product boundaries

- The console may track open-source bounties, authorized security bounties, AI training, user research, affiliate work, and zero-capital quantitative research.
- Potential rewards are never displayed as confirmed revenue.
- Confirmed and paid revenue require an evidence URL or a concrete evidence note.
- The system does not perform KYC, accept legal terms, transfer funds, submit secrets, create fake engagement, exceed a security program scope, or trade with leverage.
- Default currency is USD and the first version aggregates only records in the selected currency.

## Architecture

The frontend adds `/app/revenue` as an isolated workspace page. A focused client module calls a new `/api/revenue` backend router. The backend persists `RevenueOpportunity` and `RevenueLedgerEntry` records in PostgreSQL through Prisma and computes dashboard totals and risk-adjusted values in a pure domain service.

The page contains four layers: verified revenue totals, active opportunity ranking, a settlement ledger, and an operator boundary panel. Empty databases render a truthful monitoring state rather than demo earnings.

## Data model

### RevenueOpportunity

Stores platform, category, source URL, currency, payout range, success probability, estimated hours, capital required, risk score, lifecycle status, evidence summary, next action, and optional expiry.

### RevenueLedgerEntry

Stores an optional opportunity relation, amount, currency, state (`POTENTIAL`, `CONFIRMED`, `PENDING_PAYOUT`, `PAID`), evidence URL/note, recognition time, and payment time.

## Risk-adjusted priority

The backend calculates expected value from midpoint payout × success probability, then subtracts estimated labor cost, capital required, and a risk penalty. The default internal labor cost is USD 20/hour. The formula is a prioritization aid, not a profit guarantee.

## API

- `GET /api/revenue/dashboard?currency=USD`
- `POST /api/revenue/opportunities`
- `PATCH /api/revenue/opportunities/:id`
- `POST /api/revenue/ledger`

All routes use the existing demo-workspace user middleware until real authentication replaces it.

## Failure handling

Validation errors return structured 400 responses. Database failures pass through the existing error middleware. The frontend shows a non-fabricated unavailable state and never substitutes fake revenue.

## Testing

- Pure domain tests cover risk-adjusted ranking and ledger recognition rules.
- Frontend source tests verify the route and navigation entry.
- CI validates Prisma, typechecks both applications, runs focused tests, and builds both applications.
