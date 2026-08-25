# Buyer/Seller Opportunity Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sales Radar AI feel like a stateful two-sided opportunity marketplace by surfacing Search as a primary workspace and making Market Radar carry a real buyer/supplier/partner/research goal through the request pipeline.

**Architecture:** Reuse the existing `/app/home`, `/app/market`, `/app/discover`, `/app/revenue` and `/app/account` routes. Extend the existing market target contract with the backend-supported commercial goal rather than adding a new persistence model. Keep communication/intent pages out of phase 1 until they can be backed by verified state.

**Tech Stack:** React 18, React Router 6, TypeScript, Vite, Express, Prisma, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-25-buyer-seller-opportunity-workspace-design.md`

## Global Constraints

- Preserve `Source -> Evidence -> Fact -> Assessment -> Recommendation` truth boundaries.
- Search success and Agent success remain independently verifiable.
- `SignalAssessmentPanel` must not navigate the current assessment CTA to `/app/discover`.
- Market Live View fullscreen and viewport-height behavior must remain unchanged.
- Revenue keeps `发现机会 -> 判断 -> Live 执行 -> 结算`; potential revenue is not confirmed revenue.
- Do not add fake communication or intent data.
- New UI uses original Sales Radar styling; do not copy BOSS branding or assets.

---

### Task 1: Make the project direction self-recovering

**Files:**
- Create: `PROJECT_BLUEPRINT.md`
- Modify: `AGENTS.md`
- Modify: `.agent/PROJECT_MEMORY.md`

**Interfaces:**
- Consumes: current repository truth hierarchy and agent read order.
- Produces: a stable context-recovery path for future agents.

- [ ] **Step 1: Add blueprint to agent read order**

Change the `AGENTS.md` read-before-changing-code list to:

```text
1. CONTEXT.md
2. PROJECT_BLUEPRINT.md
3. .agent/SKILL_REGISTRY.md
4. .agent/PROJECT_MEMORY.md
5. relevant skills
6. relevant ADRs/specs/plans
```

- [ ] **Step 2: Append the buyer/seller workspace direction to project memory**

Record that the active product direction is an evidence-first two-sided opportunity workspace, with commercial goals FIND_BUYERS / FIND_SUPPLIERS / FIND_PARTNERS / FIND_DISTRIBUTORS / RESEARCH_COMPETITORS / EXPLORE_MARKET.

- [ ] **Step 3: Review for contradictions**

Confirm no text says Opportunity equals customer, predicted intent equals event, or generated outreach equals sent.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .agent/PROJECT_MEMORY.md PROJECT_BLUEPRINT.md
git commit -m "docs: make opportunity workspace direction recoverable"
```

### Task 2: Surface proactive Search in the primary shell

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Test: `src/minimal-workspace.contract.test.ts`

**Interfaces:**
- Consumes: existing `/app/discover` route in `src/App.tsx`.
- Produces: a primary sidebar/mobile navigation link labelled `搜索`.

- [ ] **Step 1: Write the failing navigation contract**

Add assertions that `AppLayout.tsx` contains:

```ts
{ to: '/app/discover', label: '搜索' }
```

and that the core routes remain `/app/home`, `/app/market`, `/app/revenue`, `/app/account`.

- [ ] **Step 2: Run the contract test**

Run:

```bash
npm test -- --test-name-pattern="workspace"
```

Expected before implementation: FAIL because Search is not in `WORKSPACE_ITEMS`.

- [ ] **Step 3: Add Search to `WORKSPACE_ITEMS`**

Use the existing `Search` icon from `lucide-react` and place Search after Market Radar.

- [ ] **Step 4: Run the frontend contract test**

Run:

```bash
npm test -- --test-name-pattern="workspace"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppLayout.tsx src/minimal-workspace.contract.test.ts
git commit -m "feat: surface proactive search workspace"
```

### Task 3: Add commercial-goal semantics to the market target

**Files:**
- Modify: `src/features/market-intelligence/market-intelligence.contract.ts`
- Modify: `src/features/market-intelligence/MarketScanTarget.tsx`
- Modify: `src/pages/MarketIntelligenceWorkspacePage.tsx`
- Modify: `src/types/index.ts` or the existing market request type file if the type is declared elsewhere.
- Test: `src/features/radar/radar-workspace.test.ts`

**Interfaces:**
- Produces frontend type:

```ts
export type CommercialGoal =
  | 'FIND_BUYERS'
  | 'FIND_SUPPLIERS'
  | 'FIND_PARTNERS'
  | 'FIND_DISTRIBUTORS'
  | 'RESEARCH_COMPETITORS'
  | 'EXPLORE_MARKET'
```

- `MarketScanTarget` gains `goal: CommercialGoal`.
- `runMarketResearch` request gains `goal`.

- [ ] **Step 1: Write failing contract assertions**

Assert the market target contract contains `goal`, the UI contains labels `找买家`, `找供应商`, `找合作伙伴`, `找渠道`, `研究竞品`, and the page passes `goal: target.goal` to `runMarketResearch`.

- [ ] **Step 2: Run the focused tests**

```bash
npm test -- --test-name-pattern="market|radar"
```

Expected: FAIL before goal support exists.

- [ ] **Step 3: Extend target contract**

Set the default goal to `FIND_BUYERS`. Keep `signalFocus` independent from goal.

- [ ] **Step 4: Add goal control**

Use one compact select in `MarketScanTarget` with the six exact values above. Do not add a visual-only toggle.

- [ ] **Step 5: Pass goal to the research request**

Update `MarketIntelligenceWorkspacePage.runMarketScan()` to include:

```ts
goal: target.goal,
```

- [ ] **Step 6: Run focused tests**

```bash
npm test -- --test-name-pattern="market|radar"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/market-intelligence src/pages/MarketIntelligenceWorkspacePage.tsx src/types
 git commit -m "feat: add commercial goals to market radar"
```

### Task 4: Carry commercial goal through the frontend API contract

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/types/index.ts` if required by the shared request type.
- Test: `src/features/market-intelligence/market-browser-layout.test.ts` only if its source contract imports the request type; otherwise add a focused static contract test next to market-intelligence tests.

**Interfaces:**
- `runMarketResearch(input)` serializes `goal` unchanged.
- No fallback silently rewrites an unsupported goal.

- [ ] **Step 1: Add a failing source contract assertion**

Check that the request body includes `goal: input.goal`.

- [ ] **Step 2: Update request type and body**

Keep the six-value union aligned with the backend enum.

- [ ] **Step 3: Run frontend tests and typecheck**

```bash
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/services/api.ts src/types src/features/market-intelligence
git commit -m "feat: send commercial goal with market research"
```

### Task 5: Validate commercial goal at the backend market-research boundary

**Files:**
- Modify: the market research controller/request parser that currently receives `product`, `industry`, `region`, `customerType`, `signalFocus`.
- Modify: the hosted research / intent service that constructs the upstream research query.
- Test: the existing market research controller/service test file.

**Interfaces:**
- Consumes exact enum values:

```text
FIND_BUYERS
FIND_SUPPLIERS
FIND_PARTNERS
FIND_DISTRIBUTORS
RESEARCH_COMPETITORS
EXPLORE_MARKET
```

- Produces an upstream query/intent where the chosen goal changes the requested entity role or research objective.

- [ ] **Step 1: Write failing backend tests**

Add at least two falsifiable cases:

```ts
FIND_BUYERS -> upstream intent asks for buyers / buying-side entities
FIND_SUPPLIERS -> upstream intent asks for suppliers / supply-side entities
```

Also assert an unknown goal is rejected with a typed 400 error.

- [ ] **Step 2: Run focused backend tests**

```bash
cd backend
npm test -- --test-name-pattern="market research"
```

Expected: FAIL before the controller/service accepts the field.

- [ ] **Step 3: Implement request validation**

Prefer the existing `RadarCustomerGoal` enum or an equivalent shared literal validator. Do not accept arbitrary strings.

- [ ] **Step 4: Make the goal affect the real query**

For example, the query builder must vary by goal rather than appending a UI label after results are returned.

- [ ] **Step 5: Run focused backend tests**

```bash
npm test -- --test-name-pattern="market research"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src backend/test backend/tests
git commit -m "feat: apply commercial goal to market research intent"
```

### Task 6: Add explicit Market -> Search handoff without breaking in-page assessment

**Files:**
- Modify: `src/pages/MarketIntelligenceWorkspacePage.tsx`
- Modify: a small market-intelligence component if needed for the handoff button.
- Test: `src/features/radar/radar-workspace.test.ts`

**Interfaces:**
- Adds a secondary `主动搜索` action that navigates to `/app/discover`.
- Keeps `SignalAssessmentPanel` current signal action in-page.

- [ ] **Step 1: Write regression assertions**

Assert:

- market page contains `主动搜索` and `/app/discover` only for the explicit search handoff;
- `SignalAssessmentPanel` contains `继续判断当前信号`;
- `SignalAssessmentPanel` does not contain `to="/app/discover"`.

- [ ] **Step 2: Add the explicit handoff**

Use a small secondary action near the workspace header/target controls, not inside the current-signal assessment CTA.

- [ ] **Step 3: Run focused frontend tests**

```bash
npm test -- --test-name-pattern="market|radar"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/MarketIntelligenceWorkspacePage.tsx src/features/market-intelligence src/features/radar/radar-workspace.test.ts
git commit -m "feat: connect recommendations to proactive search"
```

### Task 7: Full regression and delivery gate

**Files:**
- No new production files unless a failing regression requires a minimal fix.

**Interfaces:**
- Produces evidence for PR merge readiness.

- [ ] **Step 1: Run full frontend verification**

```bash
npm run typecheck
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run full backend verification**

```bash
cd backend
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 3: Re-check protected UI semantics**

Confirm source/bundle still contains:

```text
继续判断当前信号
全屏查看
退出全屏
68vh or equivalent viewport-height Live iframe
发现机会 -> 判断 -> Live 执行 -> 结算
潜在收益不会计入已确认收入
```

- [ ] **Step 4: Create a draft PR**

PR body must list outcome, changed files, evidence implications, tests, runtime configuration and production verification requirements.

- [ ] **Step 5: Review CI**

Do not merge on red CI. If CI fails, reproduce/classify and make the smallest fix.
