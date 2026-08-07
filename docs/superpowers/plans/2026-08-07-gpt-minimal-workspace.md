# GPT-style Minimal Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI Home, Market Radar, Revenue, Settings, sidebar, and Browserbase controls feel like one concise GPT-style workspace without changing the underlying search, Agent, revenue, or browser behavior.

**Architecture:** Keep existing feature/data modules. Introduce a small shared workspace shell and simplify each page composition around it. Treat Browserbase as a toolbar capability rather than a full explanatory section. Use source-contract tests for information architecture plus the existing functional CI for behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite, Node test runner, GitHub Actions.

## Global Constraints
- Preserve existing API/data behavior and safety boundaries.
- Do not remove Agent, direct global search, Browserbase Live View, revenue ledger, or runtime capability checks.
- Remove redundant explanatory prose and marketing-style authenticated workspace cards.
- Keep accessibility labels and visible error/retry states.
- All changed pages must share the same width, spacing, border, radius, and low-shadow vocabulary.

---

### Task 1: Shared minimal workspace shell

**Files:**
- Create: `src/components/ui/WorkspaceHeader.tsx`
- Modify: `src/index.css`
- Test: `src/components/ui/workspace-minimal.contract.test.ts`

**Interfaces:**
- Produces: `WorkspaceHeader({ title, description?, actions? })`
- Produces CSS utilities: `.workspace-shell`, `.workspace-surface`, `.workspace-section-gap`

- [ ] **Step 1: Write failing contract tests**

```ts
assert.match(headerSource, /export function WorkspaceHeader/)
assert.match(cssSource, /\.workspace-shell/)
assert.match(cssSource, /max-w-\[1180px\]/)
assert.match(cssSource, /\.workspace-surface/)
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test src/components/ui/workspace-minimal.contract.test.ts`
Expected: FAIL because the shared shell/header does not exist yet.

- [ ] **Step 3: Implement the shared shell**

`WorkspaceHeader` renders a compact title, optional one-line description, and optional right-side actions. CSS uses centered 1180px content width, 24-32px vertical rhythm, white surfaces, neutral 1px border, 20-24px radius, and low shadow.

- [ ] **Step 4: Run focused test and verify pass**

Run: `node --test src/components/ui/workspace-minimal.contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/WorkspaceHeader.tsx src/components/ui/workspace-minimal.contract.test.ts src/index.css
git commit -m "refactor: add minimal workspace shell"
```

### Task 2: Simplify AI Home to GPT-style idle state

**Files:**
- Modify: `src/pages/AICommandCenterPage.tsx`
- Modify: `src/features/command-center/CommandComposer.tsx`
- Test: `src/features/command-center/home-minimal.contract.test.ts`

**Interfaces:**
- Preserve: `CommandComposer` submit/search/model behavior.
- New idle copy: title `今天要研究什么？`
- New compact starter chips: max 3, inline buttons.

- [ ] **Step 1: Write failing tests**

```ts
assert.match(page, /今天要研究什么/)
assert.doesNotMatch(page, /AGENT \+ DIRECT GLOBAL SEARCH/)
assert.doesNotMatch(page, /同一个输入框，既能问 Agent/)
assert.doesNotMatch(page, /<Capability/)
assert.doesNotMatch(composer, /示例 \{index \+ 1\}/)
assert.doesNotMatch(composer, /全网搜索可在没有 GPT API 时运行/)
```

- [ ] **Step 2: Run and verify red**

Run: `node --test src/features/command-center/home-minimal.contract.test.ts`
Expected: FAIL on legacy hero/capability/example copy.

- [ ] **Step 3: Implement minimal idle composition**

Use a centered `workspace-shell`. Keep a short prompt title, one composer, and three compact starter chips. Keep runtime badges in the top header. Do not change on-demand Agent/results logic.

- [ ] **Step 4: Run focused tests**

Run: `node --test src/features/command-center/home-minimal.contract.test.ts src/features/command-center/action-loop-contract.test.ts src/features/command-center/intelligence-result-table.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AICommandCenterPage.tsx src/features/command-center/CommandComposer.tsx src/features/command-center/home-minimal.contract.test.ts
git commit -m "refactor: simplify AI home workspace"
```

### Task 3: Simplify Market Radar and Browserbase toolbar

**Files:**
- Modify: `src/pages/MarketIntelligenceWorkspacePage.tsx`
- Modify: `src/features/market-intelligence/MarketScanTarget.tsx`
- Modify: `src/features/market-intelligence/MarketLiveBrowserPanel.tsx`
- Modify: `src/features/market-intelligence/market-browser-layout.test.ts`
- Test: `src/features/market-intelligence/market-minimal.contract.test.ts`

**Interfaces:**
- Preserve: `runMarketResearch`, target fields, source selection, iframe Live View, token sessionStorage, start/restart/lock/external-open actions.
- Remove Browserbase policy sentence and dark explanatory strip.

- [ ] **Step 1: Write failing tests**

```ts
assert.doesNotMatch(livePanel, /Browserbase 只读研究会话/)
assert.match(livePanel, /解锁 Live/)
assert.match(livePanel, /title="交互式云浏览器"/)
assert.match(page, /WorkspaceHeader/)
assert.doesNotMatch(target, /设置市场侦察目标/)
```

- [ ] **Step 2: Verify red**

Run: `node --test src/features/market-intelligence/market-minimal.contract.test.ts`
Expected: FAIL on legacy policy/header copy.

- [ ] **Step 3: Implement compact market controls and Live toolbar**

Market header becomes `市场雷达` + one short sentence. Target form loses its own explanatory header. Live panel becomes a white/light toolbar embedded in the browser workspace; token input appears only while locked; Live iframe behavior remains unchanged.

- [ ] **Step 4: Run focused market tests**

Run: `node --test src/features/market-intelligence/market-minimal.contract.test.ts src/features/market-intelligence/market-browser-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MarketIntelligenceWorkspacePage.tsx src/features/market-intelligence/MarketScanTarget.tsx src/features/market-intelligence/MarketLiveBrowserPanel.tsx src/features/market-intelligence/market-browser-layout.test.ts src/features/market-intelligence/market-minimal.contract.test.ts
git commit -m "refactor: simplify market radar workspace"
```

### Task 4: Simplify Revenue supervision

**Files:**
- Modify: `src/pages/RevenueOperationsPage.tsx`
- Modify: `src/features/revenue/RevenueLiveOpsPanel.tsx`
- Test: `src/features/revenue/revenue-minimal.contract.test.ts`

**Interfaces:**
- Preserve all revenue live controls, opportunity selection, timeline, queue, ledger, and evidence.
- Replace oversized supervision header/pipeline cards with compact header + slim summary.

- [ ] **Step 1: Write failing tests**

```ts
assert.match(page, /WorkspaceHeader/)
assert.doesNotMatch(page, /Revenue Supervision/)
assert.doesNotMatch(page, /Supervision Pipeline/)
assert.doesNotMatch(live, /自动任务保持只读，人工接管画面可以点击/)
```

- [ ] **Step 2: Verify red**

Run: `node --test src/features/revenue/revenue-minimal.contract.test.ts`
Expected: FAIL on current verbose layout.

- [ ] **Step 3: Implement compact revenue summary**

Use the shared workspace header. Keep five stage counts as a slim row/chips rather than five cards. Simplify RevenueLiveOpsPanel explanatory copy while preserving states, controls, errors, and audit timeline.

- [ ] **Step 4: Run focused tests**

Run: `node --test src/features/revenue/revenue-minimal.contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RevenueOperationsPage.tsx src/features/revenue/RevenueLiveOpsPanel.tsx src/features/revenue/revenue-minimal.contract.test.ts
git commit -m "refactor: simplify revenue workspace"
```

### Task 5: Simplify Settings and sidebar navigation

**Files:**
- Modify: `src/pages/AccountPage.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Test: `src/components/layout/navigation-minimal.contract.test.ts`
- Test: `src/pages/account-minimal.contract.test.ts`

**Interfaces:**
- Preserve runtime capability fetch/normalization/retry.
- Keep four navigation routes and active state.

- [ ] **Step 1: Write failing tests**

```ts
assert.doesNotMatch(layout, /item\.desc/)
assert.doesNotMatch(layout, /真实来源模式/)
assert.doesNotMatch(account, /Sales Radar 工作区/)
assert.doesNotMatch(account, /数据可见性/)
assert.match(account, /WorkspaceHeader/)
```

- [ ] **Step 2: Verify red**

Run: `node --test src/components/layout/navigation-minimal.contract.test.ts src/pages/account-minimal.contract.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement compact sidebar and settings list**

Sidebar keeps brand, four icon+label links, and a tiny status indicator only. Settings becomes a simple runtime capability list/table with retry, without duplicate workspace links or explanatory visibility cards.

- [ ] **Step 4: Run focused tests**

Run: `node --test src/components/layout/navigation-minimal.contract.test.ts src/pages/account-minimal.contract.test.ts src/pages/account-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AccountPage.tsx src/components/layout/AppLayout.tsx src/components/layout/navigation-minimal.contract.test.ts src/pages/account-minimal.contract.test.ts
git commit -m "refactor: unify settings and navigation"
```

### Task 6: Full verification and integration

**Files:**
- Review all changed files.

- [ ] **Step 1: Run frontend typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 2: Run frontend tests**

Run: `npm test`
Expected: 0 failures.

- [ ] **Step 3: Run frontend production build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Run backend CI suite**

Run the same Backend job commands from `.github/workflows/ci.yml` including Prisma generation/validation, typecheck, core tests, and build.
Expected: 0 failures.

- [ ] **Step 5: Review diff**

Confirm no API contracts, secrets, search depth, Agent behavior, Browserbase auth, revenue business logic, or safety gates were unintentionally changed.

- [ ] **Step 6: Open PR, wait for full CI, squash merge, then verify main CI and Vercel/Railway commit statuses**

Expected: PR and post-merge main checks all success before reporting completion.