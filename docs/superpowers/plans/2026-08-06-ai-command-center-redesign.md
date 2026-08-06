# AI Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented workspace entry points with one GPT-style AI command center that runs the existing sales agent and renders source-backed people, company, contact, evidence, market, and action data.

**Architecture:** Keep the current backend and API contracts. Add a focused `AICommandCenterPage` with small presentation components, use `runSalesAgent` plus `getChatSessions` to hydrate `leadIds`, simplify the workspace navigation to four entries, and preserve old routes through redirects or secondary drill-down pages.

**Tech Stack:** React 18, TypeScript 5, React Router, Tailwind CSS, Node test runner, Vite, existing Sales Radar AI REST APIs.

## Global Constraints

- Display only API-returned public-source fields; never infer email, phone, identity, or private profile data.
- Every displayed contact field must retain source, observation time, extraction method, and verification status when present.
- Keep `/app/discover`, customer, opportunity, and research detail routes for drill-down compatibility.
- Keep market research, revenue evidence, and Browserbase Live View behavior intact.
- Do not add automatic sending, account creation, login automation, payments, trading, KYC, or wallet actions.
- Do not expose provider keys or operator tokens in frontend code.

---

### Task 1: Lock the new information architecture with failing tests

**Files:**
- Create: `src/pages/ai-command-center.test.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: existing source files as text.
- Produces: route/navigation/page contracts used by Tasks 2–4.

- [ ] **Step 1: Write the failing source-contract test**

```ts
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const app = await readFile(new URL('../App.tsx', import.meta.url), 'utf8')
const layout = await readFile(new URL('../components/layout/AppLayout.tsx', import.meta.url), 'utf8')
const page = await readFile(new URL('./AICommandCenterPage.tsx', import.meta.url), 'utf8')
const resultCard = await readFile(new URL('../features/command-center/EntityIntelligenceCard.tsx', import.meta.url), 'utf8')

test('workspace defaults to the GPT-style AI home and preserves compatibility routes', () => {
  assert.match(app, /AICommandCenterPage/)
  assert.match(app, /path="home"/)
  assert.match(app, /Navigate to="\/app\/home"/)
  assert.match(app, /path="market"/)
  assert.match(app, /path="discover"/)
  assert.match(app, /path="customer\/:id"/)
})

test('primary navigation contains only the four product workspaces', () => {
  for (const label of ['AI 首页', '市场雷达', '收益中心', '设置']) assert.match(layout, new RegExp(label))
  assert.doesNotMatch(layout, /销售机会中心|AI 销售助手/)
})

test('AI home renders one command composer, tool trace, and source-backed entity results', () => {
  assert.match(page, /runSalesAgent/)
  assert.match(page, /getChatSessions/)
  assert.match(page, /CommandComposer/)
  assert.match(page, /AgentConversation/)
  assert.match(page, /IntelligenceResultGrid/)
  assert.match(resultCard, /公开联系方式/)
  assert.match(resultCard, /来源证据/)
  assert.match(resultCard, /observedAt/)
  assert.match(resultCard, /verificationStatus/)
  assert.doesNotMatch(resultCard, /猜测邮箱|全部私人信息|自动发送/)
})
```

- [ ] **Step 2: Add the test to the frontend CI test command**

Append `src/pages/ai-command-center.test.ts` to the existing Node test invocation in `.github/workflows/ci.yml`.

- [ ] **Step 3: Run CI and confirm the new test fails**

Expected: frontend test job fails because `AICommandCenterPage.tsx` and command-center components do not exist.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ai-command-center.test.ts .github/workflows/ci.yml
git commit -m "test: define AI command center contracts"
```

### Task 2: Build the GPT-style AI command center

**Files:**
- Create: `src/pages/AICommandCenterPage.tsx`
- Create: `src/features/command-center/CommandComposer.tsx`
- Create: `src/features/command-center/AgentConversation.tsx`
- Create: `src/features/command-center/IntelligenceResultGrid.tsx`
- Create: `src/features/command-center/EntityIntelligenceCard.tsx`
- Create: `src/features/command-center/SourceEvidenceList.tsx`

**Interfaces:**
- Consumes: `runSalesAgent(input)`, `getChatSessions()`, `getRuntimeCapabilities()`, `ChatSession`, `ContactProfile`, `SalesAgentAction`.
- Produces: `AICommandCenterPage`, `CommandComposer`, `AgentConversation`, `IntelligenceResultGrid`, `EntityIntelligenceCard`, `SourceEvidenceList`.

- [ ] **Step 1: Implement `CommandComposer`**

Export:

```ts
export interface CommandComposerProps {
  value: string
  running: boolean
  model: string
  modelOptions: Array<{ id: string; label: string; description: string }>
  onValueChange(value: string): void
  onModelChange(model: string): void
  onSubmit(message?: string): void
}
```

Render one textarea, model selector, submit button, and three public-source task examples.

- [ ] **Step 2: Implement `AgentConversation`**

Export:

```ts
export interface CommandMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  actions?: SalesAgentAction[]
}
```

Render user/assistant bubbles, tool labels, completed/failed state, and a running indicator.

- [ ] **Step 3: Implement `SourceEvidenceList`**

Accept `Array<string | ContactFieldEvidence>`. For object evidence render field, value, source link, extraction method, observed time, and `OBSERVED` status. For string evidence render a plain evidence note without inventing metadata.

- [ ] **Step 4: Implement `EntityIntelligenceCard`**

Render identity, company, role, platform, source/profile links, public contacts, score grid, public content, communication profile, and evidence. Unknown fields display `未在公开来源中观察到`.

- [ ] **Step 5: Implement `IntelligenceResultGrid`**

Render a result summary and responsive card grid. Receive `sessions: ChatSession[]` and `loading: boolean`.

- [ ] **Step 6: Implement `AICommandCenterPage` data flow**

On submit:

```ts
const result = await runSalesAgent({ message, history, model })
const sessions = await getChatSessions()
const selected = result.leadIds.length
  ? sessions.filter((session) => result.leadIds.includes(session.id))
  : []
```

Append the assistant message with `result.actions`, retain previous results on failure, and display explicit OpenAI configuration errors.

- [ ] **Step 7: Run frontend typecheck/test/build**

Expected: component code compiles; Task 1 still fails only on routing/navigation until Task 3.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AICommandCenterPage.tsx src/features/command-center
git commit -m "feat: add GPT-style AI command center"
```

### Task 3: Replace the primary routes and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppLayout.tsx`

**Interfaces:**
- Consumes: `AICommandCenterPage` from Task 2.
- Produces: `/app/home`, `/app/market`, `/app/revenue`, `/app/account` primary routes and compatibility redirects.

- [ ] **Step 1: Update route loading and defaults**

- `/` redirects to `/app/home`.
- `/app` index redirects to `/app/home`.
- Add lazy `AICommandCenterPage` at `home`.
- Add `market` route for `MarketIntelligenceWorkspacePage`.
- Redirect `assistant` to `/app/home` and `dashboard` to `/app/market`.
- Keep `discover`, customer, opportunity, and research routes.

- [ ] **Step 2: Replace workspace navigation**

Use exactly:

```ts
[
  { to: '/app/home', label: 'AI 首页' },
  { to: '/app/market', label: '市场雷达' },
  { to: '/app/revenue', label: '收益中心' },
  { to: '/app/account', label: '设置' },
]
```

Remove the duplicated “开始市场扫描” banner and the decorative revenue workflow card.

- [ ] **Step 3: Run the Task 1 test**

Expected: route and navigation assertions pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/AppLayout.tsx
git commit -m "refactor: simplify workspace navigation"
```

### Task 4: Simplify market and revenue presentation

**Files:**
- Modify: `src/pages/MarketIntelligenceWorkspacePage.tsx`
- Modify: `src/pages/RevenueOperationsPage.tsx`
- Modify: `src/pages/revenue-console.test.ts`

**Interfaces:**
- Consumes: existing market/revenue feature components.
- Produces: cleaner market and revenue page composition without backend changes.

- [ ] **Step 1: Remove the decorative market workflow strip**

Delete `WORKFLOW`, `activeWorkflowStep`, `Check`, `ArrowRight`, and the four-column stepper. Keep target form, running status, browser workspace, timeline, and assessment.

- [ ] **Step 2: Reframe the market header**

Use title `市场雷达` and description focused on persistent source-backed signals.

- [ ] **Step 3: Reframe revenue composition**

Add a compact page header above `RevenueLiveOpsPanel` and retain the order: live execution, opportunities/metrics, ledger.

- [ ] **Step 4: Update revenue source-contract wording**

Assert `收益中心` remains navigable and Browserbase security assertions remain unchanged.

- [ ] **Step 5: Run frontend typecheck/test/build**

Expected: all frontend checks pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MarketIntelligenceWorkspacePage.tsx src/pages/RevenueOperationsPage.tsx src/pages/revenue-console.test.ts
git commit -m "refactor: focus market and revenue workspaces"
```

### Task 5: Documentation, full verification, PR, and deployment

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: production-ready merge and deployment evidence.

- [ ] **Step 1: Update README routes and data visibility rules**

Document the four primary pages and state that personal/contact fields are public-source observations with field-level evidence.

- [ ] **Step 2: Run full frontend verification**

```bash
npm run typecheck
npm test
npm run build
```

- [ ] **Step 3: Run full backend verification**

```bash
cd backend
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

- [ ] **Step 4: Review changed files and secret exposure**

Confirm no real API keys, operator tokens, private data exports, or unrelated backend modules changed.

- [ ] **Step 5: Open PR and wait for green CI**

Use a draft PR while CI runs, then mark ready.

- [ ] **Step 6: Squash merge with expected head SHA**

Merge only the verified head commit.

- [ ] **Step 7: Verify post-merge checks**

Confirm main-branch CI, Vercel, and Railway statuses are successful before reporting completion.
