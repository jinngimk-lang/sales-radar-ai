# Deep-Dive Outreach Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the broken advanced-result route, humanize evidence-led outreach, and make critical interaction loops testable end-to-end at source-contract level.

**Architecture:** Keep the table-first command center as the master surface. Extend `EntityIntelligenceCard` with local deep-analysis state/callbacks instead of navigating to Discover. Tighten `OutreachAgentService` prompt and post-generation quality gate. Add focused interaction contract tests that fail when a critical action has no visible result/return path or writes an unconsumed route parameter.

**Tech Stack:** React 18, TypeScript, React Router, Node/Express, Prisma, existing AI provider abstraction, Node test runner/source-contract tests.

## Global Constraints
- No new external dependencies.
- No scoring/search/contact-discovery behavior changes.
- Deep analysis must remain in the command-center inspector.
- Full profile navigation remains `/app/customer/:id`.
- Outreach may use only verified context and must not invent private facts or prior relationships.

---

### Task 1: In-place deep analysis interaction

**Files:**
- Modify: `src/features/command-center/EntityIntelligenceCard.tsx`
- Modify: `src/features/command-center/IntelligenceResultGrid.tsx`
- Test: `src/features/command-center/intelligence-result-table.test.ts`
- Create: `src/features/command-center/action-loop-contract.test.ts`

**Interfaces:**
- `EntityIntelligenceCard({ session })` owns a `deepAnalysisOpen` boolean.
- `深度分析` toggles a local panel; no `/app/discover?leadId=` navigation remains.
- `打开完整档案` navigates only to `/app/customer/${session.id}`.

- [ ] Write failing source-contract tests asserting no `discover?leadId` link, presence of `深度分析`, visible close/return action, and persistent full-profile route.
- [ ] Run focused frontend tests; expect failure on current `进入高级结果` link.
- [ ] Implement the minimal local deep-analysis panel using existing scores, communication profile, contacts, evidence and next action.
- [ ] Run focused tests; expect pass.

### Task 2: Human outreach quality gate

**Files:**
- Modify: `backend/src/services/outreach-agent.service.ts`
- Test: existing outreach service test file discovered in backend tests, or create `backend/src/services/outreach-agent-human-tone.test.ts` if none exists.

**Interfaces:**
- `generateContent(context)` keeps the current `OutreachContent` schema.
- `assertSafeContent(content)` expands into a quality gate that rejects generic sales clichés, duplicated lead-ins, and overlong/pressure-heavy copy while preserving current safety rules.
- Prompt requires one observation, one relevance bridge, and one low-pressure question.

- [ ] Write failing tests with representative machine-like output (`I noticed recently`, `comprehensive solution`, duplicated paragraph) and a concise human-like example.
- [ ] Run focused backend test; expect machine-like examples to pass incorrectly before the fix.
- [ ] Tighten prompt and quality gate without changing provider interfaces.
- [ ] Run focused test; expect generic examples rejected and natural example accepted.

### Task 3: Action-loop regression capability

**Files:**
- Create or extend: `src/features/command-center/action-loop-contract.test.ts`
- Modify: `package.json` only if the existing frontend test glob does not already include the new test.
- Modify: project agent/loop documentation only if an existing loop checklist file is present.

**Interfaces:**
- Contract checks four properties for each critical action: trigger, visible result/state change, return path, second invocation.
- Route contract rejects query parameters written by a trigger when the destination does not consume them.

- [ ] Add contracts for row select → focused inspector → close → reselect, deep analysis → close → reopen, full profile route, outreach modal entry.
- [ ] Run focused tests; fix only real missing behavior.
- [ ] Run full frontend typecheck/tests/build and backend Prisma/typecheck/tests/build.
- [ ] Open PR, review changed-file scope and secrets, merge only when all checks and deployment previews are green.