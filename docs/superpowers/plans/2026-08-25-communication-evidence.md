# Communication Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an evidence-backed communication state and timeline so Sales Radar never presents generated outreach or manually clicked labels as verified sends, replies, or meetings.

**Architecture:** Add an immutable `CommunicationEvent` persistence model and a focused service that validates attribution and derives current communication state. Lead-scoped API endpoints expose events/summary. Communication and Customer Detail consume this API; business outcomes remain separate.

**Tech Stack:** TypeScript, Express, Prisma/PostgreSQL, React, existing Node test runner and frontend contract checks.

**Spec:** `docs/superpowers/specs/2026-08-25-communication-evidence-design.md`

## Global Constraints

- Generated content and opening a channel are non-events.
- User-created evidence is always `USER_EVIDENCE_VERIFIED`.
- `SENT`, `REPLIED`, and `MEETING` require attributable evidence.
- Do not store message bodies or transcripts in communication events.
- Keep `LeadOutcome` as the business-outcome model.

---

### Task 1: Communication event persistence and derivation

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/services/communication-event.service.ts`
- Test: `backend/tests/communication-event.service.test.ts`

**Interfaces:**
- Produces: `CommunicationEventService.createUserEvidence(leadId, input)`, `list(leadId)`, `summary(leadId)`.
- Produces summary state: `RESEARCH | READY | SENT | REPLIED | MEETING`.

- [ ] **Step 1: Write failing tests** covering note-only rejection, evidence URL/external ID acceptance, source forcing, state precedence, idempotency, and ownership.
- [ ] **Step 2: Run** `cd backend && npm test -- communication-event.service.test.ts` and confirm failure because the service/model do not exist.
- [ ] **Step 3: Add Prisma enums/model** exactly as defined by the spec, with indexes on `(userId, leadId, occurredAt)` and `(leadId, eventType, occurredAt)` and an optional unique key for attributable external IDs.
- [ ] **Step 4: Implement the service** with strict event/channel/reference validation, ownership checks, idempotency for external IDs, and derived summary precedence.
- [ ] **Step 5: Run** `cd backend && npm run prisma:generate && npm run prisma:validate && npm test && npm run typecheck` and require all pass.

### Task 2: Lead communication API

**Files:**
- Modify: `backend/src/controllers/lead.controller.ts`
- Modify: `backend/src/routes/lead.routes.ts`
- Test: `backend/tests/communication-event.controller.test.ts`

**Interfaces:**
- Consumes: `communicationEvents` service from Task 1.
- Produces: `GET/POST /leads/:id/communication-events`, `GET /leads/:id/communication-summary`.

- [ ] **Step 1: Write failing controller tests** proving validation errors are stable and callers cannot set verification source.
- [ ] **Step 2: Run the focused test** and confirm RED.
- [ ] **Step 3: Add controllers/routes** with no provider-verification override in request parsing.
- [ ] **Step 4: Run backend tests/typecheck/build** and require pass.

### Task 3: Frontend communication contracts and service

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/api.ts`
- Test: `scripts/test-communication-evidence-contract.mjs`
- Modify: `package.json` only if the repository's existing frontend test script requires explicit inclusion.

**Interfaces:**
- Produces: `CommunicationEvent`, `CommunicationSummary`, `getCommunicationEvents`, `getCommunicationSummary`, `recordCommunicationEvidence`.

- [ ] **Step 1: Add a failing source-contract test** for the new API methods/types and absence of direct communication outcome actions.
- [ ] **Step 2: Run the frontend test command** and confirm RED.
- [ ] **Step 3: Add typed API methods** using the existing `request` helper and exact backend envelopes.
- [ ] **Step 4: Run typecheck/test** and require pass for this layer.

### Task 4: Customer Detail evidence workflow

**Files:**
- Modify: `src/pages/CustomerDetailPage.tsx`
- Test: `scripts/test-communication-evidence-contract.mjs`

**Interfaces:**
- Consumes Task 3 API.
- Produces a `沟通事实` section with immutable timeline and evidence-entry actions.

- [ ] **Step 1: Extend the contract test** to fail while `OUTCOME_ACTIONS` still contains `CONTACTED`, `REPLIED`, or `MEETING` and while evidence form/timeline are absent.
- [ ] **Step 2: Run and confirm RED.**
- [ ] **Step 3: Implement minimal evidence UI**: load summary/events, show verification source/reference, require URL or external ID, and post `SENT`, `REPLIED`, or `MEETING` evidence.
- [ ] **Step 4: Remove direct communication-status outcome buttons** while keeping business outcomes (`WON`, `LOST`, and any existing non-communication outcome editing that remains useful).
- [ ] **Step 5: Run frontend typecheck/test/build** and require pass.

### Task 5: Communication workspace becomes evidence-backed inbox

**Files:**
- Modify: `src/pages/CommunicationWorkspacePage.tsx`
- Modify: `src/services/api.ts` if batch summary loading needs a helper.
- Test: `scripts/test-communication-evidence-contract.mjs`

**Interfaces:**
- Consumes real Lead sessions plus communication summaries.
- Produces cards/list rows that derive visible state exclusively from evidence/contact readiness.

- [ ] **Step 1: Extend contract test** to require evidence-derived labels and prohibit generated-message-based `已发送/已回复` state.
- [ ] **Step 2: Run and confirm RED.**
- [ ] **Step 3: Load summaries for displayed leads** with bounded parallelism or `Promise.allSettled`; summary failure must not fabricate a positive state.
- [ ] **Step 4: Render actionable inbox rows** with last verified event and open Customer Detail as the primary action.
- [ ] **Step 5: Run frontend typecheck/test/build** and require pass.

### Task 6: Verification, migration safety, and PR

**Files:**
- Modify: `docs/technology-radar.md` only if implementation materially changes LiveKit/provider adoption status; otherwise leave unchanged.
- Modify: `PROJECT_BLUEPRINT.md` to mark evidence-backed communication as implemented and name the next concrete step.

- [ ] **Step 1: Run full backend verification**: Prisma validate/generate, test, typecheck, build.
- [ ] **Step 2: Run full frontend verification**: typecheck, tests, build.
- [ ] **Step 3: Review diff for privacy and truth semantics**, specifically no message-body storage and no manual verified-state shortcut.
- [ ] **Step 4: Open draft PR**, wait for CI, inspect failures, fix until green.
- [ ] **Step 5: Squash merge only when branch CI and review gates are green.**
- [ ] **Step 6: Revalidate main deployment and production smoke without creating a Browserbase session solely for smoke.**