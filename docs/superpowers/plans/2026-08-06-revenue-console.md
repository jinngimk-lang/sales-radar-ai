# Revenue Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, evidence-based revenue operations console to Sales Radar AI.

**Architecture:** Add a pure revenue domain service and Prisma persistence behind a focused Express router. Add a lazy-loaded React workspace page and a small API client, leaving current sales workflows unchanged.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express, Prisma 6, PostgreSQL, Node test runner.

## Global Constraints

- Potential rewards must not be counted as confirmed or paid revenue.
- Confirmed and paid entries require evidence text or an evidence URL.
- Default to USD, zero capital, no leverage, and authorized/legal work only.
- Do not expose credentials or add browser-side secrets.

---

### Task 1: Revenue domain tests and scoring

**Files:**
- Create: `backend/tests/revenue-domain.test.ts`
- Create: `backend/src/services/revenue-domain.service.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `calculateRiskAdjustedValue(input)` and `summarizeRevenueLedger(entries, currency)`.

- [ ] Write tests showing high nominal payout can rank below a smaller high-probability task.
- [ ] Run the PR CI and verify the test fails because the module does not exist.
- [ ] Implement the pure scoring and ledger summary functions.
- [ ] Run CI and verify the focused backend test passes.

### Task 2: Persistent backend API

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260806113000_add_revenue_console/migration.sql`
- Create: `backend/src/services/revenue-persistence.service.ts`
- Create: `backend/src/controllers/revenue.controller.ts`
- Create: `backend/src/routes/revenue.routes.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: revenue domain scoring functions.
- Produces: `GET /api/revenue/dashboard`, `POST /api/revenue/opportunities`, `PATCH /api/revenue/opportunities/:id`, and `POST /api/revenue/ledger`.

- [ ] Add Prisma enums, models, user relations, indexes, and migration SQL.
- [ ] Implement validation and persistence methods scoped to the workspace user.
- [ ] Register the router behind `attachDemoWorkspaceUser`.
- [ ] Validate Prisma, typecheck, and build the backend.

### Task 3: Frontend revenue workspace

**Files:**
- Create: `src/features/revenue/revenue-api.ts`
- Create: `src/pages/RevenueDashboardPage.tsx`
- Create: `src/pages/revenue-console.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `GET /api/revenue/dashboard?currency=USD`.
- Produces: `/app/revenue` workspace route and sidebar/mobile navigation item.

- [ ] Write a source test for the route, navigation label, and truthful revenue language.
- [ ] Run PR CI and verify it fails before the page and route exist.
- [ ] Implement typed API contracts and the responsive dashboard page.
- [ ] Add lazy route and navigation entry.
- [ ] Run frontend tests, typecheck, and build.

### Task 4: Release and production verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: deployed `/app/revenue` and healthy backend revenue API.

- [ ] Document the route and revenue recognition rules.
- [ ] Verify all PR checks pass.
- [ ] Merge the branch to `main`.
- [ ] Verify the Vercel page and backend health after deployment.
