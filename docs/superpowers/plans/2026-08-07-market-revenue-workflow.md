# Market + Revenue Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the market-to-sales judgment flow, make the Browserbase Live View usable as a primary research viewport, and turn Revenue Center into a clear site-connected workflow from discovery through settlement.

**Architecture:** Keep the change frontend-first and reuse existing real APIs. Market signal judgment stays inside `/app/market` instead of routing to legacy `/app/discover`; Browserbase remains operator-gated but gains a viewport-sized/fullscreen presentation; Revenue Center becomes a workflow shell around the existing revenue dashboard data and Live Ops panel, with links back to market/home and real empty states rather than fake data.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind, node:test source-contract tests, existing revenue and Browserbase APIs.

## Global Constraints

- Do not fabricate opportunities, contacts, revenue, or Agent availability.
- Potential revenue must remain visually and semantically distinct from confirmed/paid revenue.
- Keep `REVENUE_OPERATOR_TOKEN` in sessionStorage only and Browserbase credentials server-side.
- Do not enable recurring Browserbase live loops.
- Preserve current search, market research, revenue API, and Browserbase authentication behavior.
- Keep the GPT-style minimal workspace visual language.

---

### Task 1: Close the market judgment dead-end

**Files:**
- Create: `src/features/market-intelligence/signal-assessment-navigation.test.ts`
- Modify: `src/features/market-intelligence/SignalAssessmentPanel.tsx`
- Modify: `src/pages/MarketIntelligenceWorkspacePage.tsx`

**Interfaces:**
- `SignalAssessmentPanel` consumes `signal: MarketSignal | null` and an optional focus callback.
- Market page provides an in-page assessment target and never sends the CTA to `/app/discover`.

- [ ] Write a failing source-contract test asserting the assessment CTA does not contain `to="/app/discover"`, exposes an in-page target id, and uses a button/callback to focus the current judgment.
- [ ] Run frontend tests and confirm this new test fails because the current component still links to `/app/discover`.
- [ ] Replace the legacy Link with an in-page action. Keep the current fact/assessment/recommendation content and make the CTA focus/scroll the assessment area instead of navigating away.
- [ ] Run the targeted and full frontend test suite.

### Task 2: Give Browserbase a real research viewport

**Files:**
- Modify: `src/features/market-intelligence/MarketLiveBrowserPanel.tsx`
- Modify: `src/features/market-intelligence/MarketBrowserWorkspace.tsx`
- Modify: `src/features/market-intelligence/market-browser-layout.test.ts`
- Modify: `src/features/market-intelligence/market-intelligence.meta.ts`

**Interfaces:**
- `MarketLiveBrowserPanel` continues to accept `{ query, sourceUrl }` and retain operator-token gating.
- Live View gains local fullscreen state and a viewport-height iframe; the static snapshot remains an explicitly labeled fallback.

- [ ] Extend the layout test to require a viewport-sized iframe (`min-h`/`vh`) and a fullscreen toggle while preserving the operator token and interactive iframe contract.
- [ ] Run the targeted test and verify red against the current fixed `h-[360px]` iframe.
- [ ] Change the shared market workspace from a rigid 760px crop to a viewport-aware minimum/height.
- [ ] Add `Maximize2/Minimize2` fullscreen control in `MarketLiveBrowserPanel`; in normal mode use a large viewport-height iframe, and in fullscreen use a fixed overlay with the Live View filling the available height.
- [ ] Keep the fallback snapshot below only as fallback evidence and keep its non-interactive label explicit.
- [ ] Run targeted and full frontend tests.

### Task 3: Turn Revenue Center into a connected workflow

**Files:**
- Modify: `src/pages/RevenueOperationsPage.tsx`
- Modify: `src/pages/revenue-console.test.ts`
- Reuse: `src/features/revenue/RevenueLiveOpsPanel.tsx`
- Reuse: `src/features/revenue/revenue-api.ts`

**Interfaces:**
- Revenue Center reads only `getRevenueDashboard('USD')` for opportunity/ledger truth.
- Workflow links use `/app/market` for discovery and `/app/home` for research/Agent work.
- Live Ops stays hidden/collapsed until the user chooses the execution stage.

- [ ] Update the revenue contract test to require the page copy `把发现推进到收入`, links to `/app/market` and `/app/home`, a four-stage workflow (`发现机会`, `判断`, `Live 执行`, `结算`), and real KPI/empty-state copy. Require Live Ops to be user-revealed rather than permanently dominating the page.
- [ ] Run the targeted test and verify red against the current sparse summary + always-visible Live panel.
- [ ] Replace the five tiny count strip with a concise workflow header and three real summary metrics: actionable opportunities, active/waiting execution, confirmed/paid revenue amount from the existing dashboard summary.
- [ ] Add an interactive workflow row: discovery links to Market Radar, judgment links to AI Home, Live Execution toggles the existing `RevenueLiveOpsPanel`, settlement scrolls/focuses the existing embedded dashboard/ledger area.
- [ ] Add an informative empty state when no opportunities exist: explain that Revenue Center does not invent opportunities and provide a primary CTA back to Market Radar.
- [ ] Keep the existing embedded `RevenueDashboardPage` for detailed queue/ledger evidence, but visually subordinate it under the workflow.
- [ ] Run targeted and full frontend tests.

### Task 4: Integration and production verification

**Files:**
- No new production files unless tests reveal a concrete regression.

- [ ] Run frontend typecheck, all frontend tests, and production build.
- [ ] Run backend Prisma validation/generation, typecheck, core tests, and build even though backend code is unchanged.
- [ ] Review the branch diff for legacy `/app/discover` linkage, token leakage, fake revenue data, and Browserbase auth regressions.
- [ ] Merge only the verified head into `main`.
- [ ] Re-run main CI and verify Vercel/Railway deployment status.
- [ ] Verify production `/app/market` and `/app/revenue` load and the deployed frontend bundle contains the new workflow copy while the market assessment CTA no longer routes to `/app/discover`.
- [ ] Extend ongoing health monitoring semantics to flag a regression if the market CTA returns to the legacy page or Revenue Center loses its discover→execute→settle workflow.