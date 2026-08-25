# Functional Commercial Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Targets workspace persist and reuse the complete structured commercial target and remove weak/decorative interactions.

**Architecture:** Reuse the existing CommercialTarget API/schema. Expand create/edit UI to the fields already consumed by Search/Market, keep target status wording honest, and add direct Search/Market workflow actions carrying `targetId`.

**Tech Stack:** React, TypeScript, existing CommercialTarget service and market-intelligence metadata.

**Spec:** `docs/superpowers/specs/2026-08-25-functional-commercial-targets-design.md`

## Global Constraints

- Do not add background-run or recommendation claims without backend evidence.
- Every retained control must persist state or launch a real workflow.
- Search and Market consume the same `targetId`.
- `lastRunAt` is the only run-status evidence displayed.

---

### Task 1: Target form contract

**Files:**
- Modify: `src/pages/CommercialTargetsPage.tsx`
- Test: `scripts/test-commercial-targets-contract.mjs`

**Interfaces:**
- Consumes existing `CommercialTargetInput`, region/customer-type metadata, and market `SignalFocus` values.
- Produces complete create payload with name/product/goal/industry/region/customerType/signalFocus.

- [ ] **Step 1: Add failing source-contract checks** requiring the structured fields and complete create payload.
- [ ] **Step 2: Run the frontend test command and confirm RED.**
- [ ] **Step 3: Add compact structured inputs** using existing metadata rather than duplicating enum labels.
- [ ] **Step 4: Submit blank optional values as `null` and valid structured values as exact enum strings.**
- [ ] **Step 5: Run typecheck/test and require pass.**

### Task 2: Functional saved-target cards

**Files:**
- Modify: `src/pages/CommercialTargetsPage.tsx`
- Test: `scripts/test-commercial-targets-contract.mjs`

**Interfaces:**
- Produces inline edit, status update, Search link, and Market link for each target.

- [ ] **Step 1: Extend test to require `targetId` in both `/app/discover` and `/app/market` actions and to require edit persistence.**
- [ ] **Step 2: Run and confirm RED.**
- [ ] **Step 3: Add inline edit state populated from the persisted target and save via `updateCommercialTarget`.**
- [ ] **Step 4: Keep pause/enable as explicit operator status only; update copy so it does not imply scheduling.**
- [ ] **Step 5: Remove decorative/duplicate card elements that do not support an action or evidence interpretation.**
- [ ] **Step 6: Run frontend typecheck/test/build and require pass.**

### Task 3: Functional UI audit of the touched surfaces

**Files:**
- Modify: `src/pages/CommercialTargetsPage.tsx`
- Modify: `src/pages/CommunicationWorkspacePage.tsx` only if the communication plan has already landed on this branch.
- Test: existing and new contract scripts.

- [ ] **Step 1: Review every button/link/badge on the two touched pages and classify it as persisted state, real workflow action, evidence display, or remove.**
- [ ] **Step 2: Remove or rewrite any control/copy that fails that classification.**
- [ ] **Step 3: Run full frontend verification.**

### Task 4: PR verification

- [ ] **Step 1: Compare branch against main and confirm no unrelated visual redesign.**
- [ ] **Step 2: Ensure all new controls have loading/error states and keyboard-accessible native controls.**
- [ ] **Step 3: Let shared PR CI gate the combined communication/target change.**
- [ ] **Step 4: After merge, verify production Target page preserves Search/Market target-context semantics.**