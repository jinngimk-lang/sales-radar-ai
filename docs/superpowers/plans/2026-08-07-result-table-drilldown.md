# Result Table Drill-down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace card-first AI search results with a dense score-aware table that opens one existing intelligence card only after the user selects a row.

**Architecture:** Keep `ChatSession` and `EntityIntelligenceCard` unchanged as domain/detail sources. Add a small pure presentation helper for deterministic sorting and potential labels, then refactor `IntelligenceResultGrid` into a master-detail renderer. No backend or API changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, Node test runner / tsx source-contract tests.

## Global Constraints

- Do not invent new scoring data or purchase probabilities.
- Use only existing `assistantScores` values.
- Missing data must remain explicitly unknown.
- Table is full width until a row is selected.
- Desktop selection opens a right-side inspector; small screens place detail below.
- Existing contacts, evidence, source links and suggested actions remain inside `EntityIntelligenceCard`.

---

### Task 1: Result priority presentation helper

**Files:**
- Create: `src/features/command-center/resultPresentation.ts`
- Create: `src/features/command-center/result-presentation.test.ts`

**Interfaces:**
- Produces: `sortCommandSessions(sessions: ChatSession[]): ChatSession[]`
- Produces: `getPotentialBand(score?: number): { label: '高潜' | '中潜' | '低潜' | '未评分'; tone: 'strong' | 'medium' | 'low' | 'neutral' }`

- [ ] **Step 1: Write the failing helper tests**

Test scored sessions sort by overall descending, contact count breaks ties, missing scores come last, input is not mutated, and thresholds are 75/50.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test src/features/command-center/result-presentation.test.ts`
Expected: FAIL because `resultPresentation.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure helper**

Use copied arrays and finite-number guards. Do not derive or persist new domain data.

- [ ] **Step 4: Re-run focused test and verify GREEN**

Run: `npx tsx --test src/features/command-center/result-presentation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `test: define result table priority rules` followed by `feat: add result presentation helpers` if split commits are practical.

### Task 2: Table-first master-detail result renderer

**Files:**
- Modify: `src/features/command-center/IntelligenceResultGrid.tsx`
- Create: `src/features/command-center/intelligence-result-table.test.ts`
- Modify: `package.json` only if the repository test command enumerates tests explicitly.

**Interfaces:**
- Consumes: `sortCommandSessions`, `getPotentialBand`
- Consumes: existing `EntityIntelligenceCard`
- Produces: table-first result UI with one optional selected detail inspector.

- [ ] **Step 1: Write failing source/UI contract tests**

Verify the renderer contains a semantic table, selected-session state, `aria-selected`, compact score labels for overall/intent/identity/evidence/contact, a close-detail control, and exactly one selected `EntityIntelligenceCard` path rather than mapping a full card for every session.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npx tsx --test src/features/command-center/intelligence-result-table.test.ts`
Expected: FAIL against the current card grid.

- [ ] **Step 3: Implement table overview**

Create dense rows with object identity, potential band, score dots, contact count and source action. Use `sortedSessions` from Task 1.

- [ ] **Step 4: Implement selection and detail inspector**

Add `selectedSessionId` state. Full width before selection; desktop master-detail after selection; mobile detail below. Add keyboard row selection and close action.

- [ ] **Step 5: Run focused test and verify GREEN**

Run: `npx tsx --test src/features/command-center/intelligence-result-table.test.ts src/features/command-center/result-presentation.test.ts`
Expected: PASS.

- [ ] **Step 6: Run frontend verification**

Run: `npm run typecheck && npm test && npm run build`
Expected: all PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: make intelligence results table-first`.

### Task 3: Integration verification and deployment

**Files:**
- No production files unless verification exposes a real regression.

**Interfaces:**
- Consumes: final feature branch.
- Produces: green PR and deployed `main`.

- [ ] **Step 1: Open PR against `main`**

Describe table-first workflow, score restoration, and no backend changes.

- [ ] **Step 2: Run/observe full GitHub CI**

Expected: Frontend typecheck/test/build and Backend Prisma/typecheck/tests/build all PASS.

- [ ] **Step 3: Review changed-file scope and check for unrelated changes**

Expected: only spec/plan, result helper/tests, result grid, and test-command adjustment if required.

- [ ] **Step 4: Merge only after all required checks are green**

Use squash merge.

- [ ] **Step 5: Verify production deployment**

Confirm Vercel deployment status succeeds for the merge commit and provide the production AI home link for manual viewing.
