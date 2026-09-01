# Sales System Provider Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-neutral, approval-gated sales-system orchestration layer for future Apollo and Zoho adapters while preserving evidence, dedupe and communication-receipt truth boundaries.

**Architecture:** Domain contracts live in `backend/src/contracts`; provider interfaces live under `backend/src/providers/sales-system`; orchestration and deterministic identity/receipt logic live in `backend/src/services`. This slice uses fake providers in tests and intentionally does not call live Apollo/Zoho from application runtime yet.

**Tech Stack:** TypeScript 5.8, Node test runner via `tsx --test`, existing backend service/provider layout.

**Spec:** `docs/specs/2026-09-01-sales-system-provider-orchestration.md`

## Global Constraints

- Sales Radar remains the evidence, judgment and orchestration layer.
- READ may run automatically; DRAFT may run automatically; WRITE, CREDIT and SEND require approval; DESTRUCTIVE is blocked by default.
- Provider-specific policy may be stricter, never weaker.
- No live credentials or provider API keys enter source control.
- No automatic send, sequence enrollment, CRM conversion or workflow activation.
- Verified communication state requires attributable external receipt evidence.
- Do not fuzzy-merge people or companies merely to increase apparent CRM coverage.

---

### Task 1: Provider action policy contract

**Files:**
- Create: `backend/src/contracts/sales-provider-action.contract.ts`
- Test: `backend/tests/provider-action-safety.test.ts`

**Interfaces:**
- Produces: `SalesProviderRisk`, `SalesProviderApproval`, `SalesProviderActionDescriptor`, `SalesProviderActionRequest`, `SalesProviderActionResult`, `defaultApprovalForRisk()` and `assertSalesProviderActionAllowed()`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertSalesProviderActionAllowed,
  defaultApprovalForRisk,
} from '../src/contracts/sales-provider-action.contract.js'

test('provider action safety defaults are fail-closed', () => {
  assert.equal(defaultApprovalForRisk('READ'), 'automatic')
  assert.equal(defaultApprovalForRisk('DRAFT'), 'automatic')
  assert.equal(defaultApprovalForRisk('WRITE'), 'required')
  assert.equal(defaultApprovalForRisk('CREDIT'), 'required')
  assert.equal(defaultApprovalForRisk('SEND'), 'required')
  assert.equal(defaultApprovalForRisk('DESTRUCTIVE'), 'blocked')

  assert.throws(() =>
    assertSalesProviderActionAllowed({ risk: 'SEND', approved: false }),
  )
  assert.throws(() =>
    assertSalesProviderActionAllowed({ risk: 'DESTRUCTIVE', approved: true }),
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test tests/provider-action-safety.test.ts`
Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export type SalesProviderRisk =
  | 'READ'
  | 'DRAFT'
  | 'WRITE'
  | 'CREDIT'
  | 'SEND'
  | 'DESTRUCTIVE'

export type SalesProviderApproval = 'automatic' | 'required' | 'blocked'

export function defaultApprovalForRisk(risk: SalesProviderRisk): SalesProviderApproval {
  if (risk === 'READ' || risk === 'DRAFT') return 'automatic'
  if (risk === 'DESTRUCTIVE') return 'blocked'
  return 'required'
}
```

Add typed action request/result descriptors and a guard that rejects blocked actions and approval-required actions without explicit approval.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test tests/provider-action-safety.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add sales provider action policy`

---

### Task 2: Sales system provider interface and deterministic record linking

**Files:**
- Create: `backend/src/providers/sales-system/sales-system-provider.interface.ts`
- Create: `backend/src/services/external-record-link.service.ts`
- Test: `backend/tests/external-record-link.test.ts`

**Interfaces:**
- Consumes: action request/result types from Task 1.
- Produces: `SalesSystemProvider`, `ExternalSalesRecord`, `ExternalRecordLookup`, `matchExternalRecord()`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { matchExternalRecord } from '../src/services/external-record-link.service.js'

test('external record linking prefers exact evidence-backed keys', () => {
  const person = {
    kind: 'person' as const,
    provider: 'apollo',
    externalId: 'p1',
    fullName: 'Ada Lovelace',
    email: 'ADA@example.com',
    companyDomain: 'https://www.example.com/',
  }

  assert.equal(
    matchExternalRecord(person, { kind: 'person', email: 'ada@example.com' }).confidence,
    'exact',
  )
  assert.equal(
    matchExternalRecord(person, { kind: 'person', companyDomain: 'example.com' }).matched,
    false,
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test tests/external-record-link.test.ts`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement exact provider ID, normalized verified email, normalized profile URL, organization-domain and person-name-plus-domain matching. Return `{ matched, confidence, reason }`; do not add fuzzy similarity.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test tests/external-record-link.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add external sales record linking`

---

### Task 3: Provider orchestrator

**Files:**
- Create: `backend/src/services/sales-provider-orchestrator.service.ts`
- Test: `backend/tests/sales-provider-orchestrator.test.ts`

**Interfaces:**
- Consumes: `SalesSystemProvider`, `SalesProviderActionRequest`, `assertSalesProviderActionAllowed()`.
- Produces: `SalesProviderOrchestrator` with `plan()` and `execute()`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { SalesProviderOrchestrator } from '../src/services/sales-provider-orchestrator.service.js'

test('orchestrator requires approval before a send and never silently fails over after selection', async () => {
  const calls: string[] = []
  const apollo = fakeProvider('apollo', ['sequence.enroll'], calls)
  const zoho = fakeProvider('zoho_crm', ['sequence.enroll'], calls)
  const orchestrator = new SalesProviderOrchestrator([apollo, zoho])

  await assert.rejects(() =>
    orchestrator.execute({ action: 'sequence.enroll', risk: 'SEND', approved: false, payload: {} }),
  )
  assert.deepEqual(calls, [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test tests/sales-provider-orchestrator.test.ts`
Expected: FAIL because the orchestrator does not exist.

- [ ] **Step 3: Write minimal implementation**

Select the first explicitly capable provider unless the request pins a provider. Apply the action policy before calling `provider.execute()`. Do not retry another provider after execution begins or fails.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test tests/sales-provider-orchestrator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: orchestrate sales system providers`

---

### Task 4: Verified communication receipt service

**Files:**
- Create: `backend/src/services/communication-receipt.service.ts`
- Test: `backend/tests/communication-receipt.test.ts`

**Interfaces:**
- Produces: `CommunicationReceiptInput`, `VerifiedCommunicationReceipt`, `verifyCommunicationReceipt()`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyCommunicationReceipt } from '../src/services/communication-receipt.service.js'

test('sent/replied/meeting states require attributable external receipts', () => {
  assert.throws(() =>
    verifyCommunicationReceipt({ provider: 'apollo', state: 'SENT_VERIFIED', observedAt: new Date().toISOString() }),
  )
  const receipt = verifyCommunicationReceipt({
    provider: 'apollo',
    state: 'SENT_VERIFIED',
    externalReceiptId: 'msg_123',
    observedAt: new Date().toISOString(),
  })
  assert.equal(receipt.state, 'SENT_VERIFIED')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx tsx --test tests/communication-receipt.test.ts`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Write minimal implementation**

Require `externalReceiptId` and valid `observedAt` for `SENT_VERIFIED`, `REPLIED_VERIFIED` and `MEETING_VERIFIED`. Keep draft/ready/channel-opened states separate and do not infer one state from another.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx tsx --test tests/communication-receipt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: verify communication provider receipts`

---

### Task 5: Agent operating skill and product blueprint

**Files:**
- Create: `.agent/skills/sales-mcp-orchestration/SKILL.md`
- Modify: `PROJECT_BLUEPRINT.md`

**Interfaces:**
- Consumes: approved spec and Tasks 1-4.
- Produces: durable operating rules for future agents and adapters.

- [ ] **Step 1: Write the skill**

The skill must encode this sequence:

```text
recover target/evidence
-> discover provider capability/tool
-> inspect exact schema when provider requires it
-> search/read before paid enrichment
-> dedupe before create
-> require approval for write/credit/send
-> resolve sender before sequence enrollment
-> execute one provider
-> preserve external receipt
-> promote communication/outcome state only from verified evidence
```

- [ ] **Step 2: Update the blueprint**

Add a dated decision that Sales Radar orchestrates Apollo-style prospect/enrichment/outbound providers and Zoho-style CRM/lifecycle providers through a replaceable sales-system interface with centralized risk and receipt gates.

- [ ] **Step 3: Verify repository guidance**

Run: `git diff --check` and inspect the new skill/spec/blueprint text for contradictions with `AGENTS.md` truth hierarchy.
Expected: no whitespace errors and no weakened truth boundaries.

- [ ] **Step 4: Commit**

Commit message: `docs: add sales MCP orchestration rules`

---

### Task 6: Full backend verification

**Files:**
- No new production files unless verification exposes a defect.

**Interfaces:**
- Verifies all prior tasks together.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd backend
npx tsx --test tests/provider-action-safety.test.ts tests/external-record-link.test.ts tests/sales-provider-orchestrator.test.ts tests/communication-receipt.test.ts
```

Expected: all PASS.

- [ ] **Step 2: Run full backend gate**

Run:

```bash
cd backend
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Inspect CI independently**

Confirm backend CI is green. Treat the existing public-search live smoke separately if it fails before frontend build; do not misattribute that external-search failure to provider orchestration.

- [ ] **Step 4: Update PR description**

Document user outcome, changed files, evidence/receipt implications, tests run, lack of live provider credentials, and remaining production verification.
