# Deep-Dive Outreach Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the broken advanced-result route, humanize evidence-led outreach, make Agent UI on-demand, and make critical interaction loops testable end-to-end at source-contract level.

**Architecture:** Keep the table-first command center as the master surface. Extend `EntityIntelligenceCard` with local deep-analysis state instead of navigating to Discover. Tighten both hosted-model and rule-based outreach paths. Keep Agent conversation/tool traces unmounted until the user invokes Agent functionality. Add focused interaction contracts that fail when a critical action has no visible result/return path or writes an unconsumed route parameter.

**Tech Stack:** React 18, TypeScript, React Router, Node/Express, Prisma, existing AI provider abstraction, Node test runner/source-contract tests.

## Global Constraints
- No new external dependencies.
- No scoring/search/contact-discovery behavior changes.
- Deep analysis must remain in the command-center inspector.
- Full profile navigation remains `/app/customer/:id`.
- Outreach may use only verified context and must not invent private facts or prior relationships.
- Agent UI must be absent/collapsed until a user request or Agent action invokes it.

---

### Task 1: In-place deep analysis interaction

**Files:**
- Modify: `src/features/command-center/EntityIntelligenceCard.tsx`
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
- Modify: `backend/src/providers/ai/rule-based-outreach.provider.ts`
- Test: `backend/tests/outreach-agent.test.ts`
- Create: `backend/tests/outreach-agent-human-tone.test.ts` only if source-level quality-gate coverage cannot live in the existing test.

**Interfaces:**
- `generateContent(context)` keeps the current `OutreachContent` schema.
- `assertSafeContent(content)` expands into a quality gate that rejects generic sales clichés, duplicated lead-ins, and pressure-heavy copy while preserving current safety rules.
- Hosted prompt requires one observation, one relevance bridge, and one low-pressure question.
- Rule-based fallback follows the same structure so no-GPT mode is not more robotic than hosted mode.

- [ ] Write failing tests with representative machine-like output (`I noticed recently`, `comprehensive solution`, duplicated paragraph) and concise human-like fallback expectations.
- [ ] Run focused backend tests; expect current fallback/prompt contract to fail the new human-tone assertions.
- [ ] Tighten prompt, quality gate, and rule-based templates without changing provider interfaces.
- [ ] Run focused tests; expect generic examples rejected and concise examples accepted.

### Task 3: On-demand Agent interaction

**Files:**
- Modify: `src/features/command-center/AgentConversation.tsx` only if needed for collapse semantics.
- Modify: command-center page/container that currently renders `AgentConversation`.
- Test: `src/features/command-center/action-loop-contract.test.ts`

**Interfaces:**
- Expanded Agent conversation/tool trace is rendered only when `messages.length > 0`, a request is running, or an explicit invocation state is active.
- Closing/collapsing Agent output removes it from the observation surface without deleting the underlying result data.
- Re-invocation after close uses the same existing Agent execution path and works without a refresh.

- [ ] Locate the command-center container and write a failing contract proving Agent UI is not persistent before invocation and can be closed/reopened.
- [ ] Implement the smallest invocation/collapse state around the existing Agent path; do not build a second assistant backend.
- [ ] Run focused frontend tests; expect pass.

### Task 4: Action-loop regression capability

**Files:**
- Create or extend: `src/features/command-center/action-loop-contract.test.ts`
- Modify: `package.json` only if the existing frontend test glob does not already include the new test.
- Modify: project agent/loop documentation only if an existing loop checklist file is present.

**Interfaces:**
- Contract checks: trigger, visible result/state change, return path, and second invocation.
- Route contract rejects query parameters written by a trigger when the destination does not consume them.

- [ ] Add contracts for row select → focused inspector → close → reselect, deep analysis → close → reopen, full profile route, outreach modal entry, Agent invoke → close → reinvoke.
- [ ] Run focused tests; fix only real missing behavior.
- [ ] Run full frontend typecheck/tests/build and backend Prisma/typecheck/tests/build.
- [ ] Open PR, review changed-file scope and secrets, merge only when all checks and deployment previews are green.