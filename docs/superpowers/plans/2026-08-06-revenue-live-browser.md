# Revenue Live Browser Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an operator-gated Browserbase Agent Live View and sanitized real-time operations timeline to the Sales Radar AI revenue console.

**Architecture:** The backend uses native Node `fetch` to call the official Browserbase Agent, Session Debug, and Session Release endpoints. A protected orchestration service persists run metadata and events, reconciles provider state, and returns only safe Live View information. The React frontend stores the operator token in `sessionStorage`, polls the protected status endpoint, and embeds a real provider debugger URL only when one exists.

**Tech Stack:** React 18, TypeScript, Vite, Express 4, Node 20, PostgreSQL through Prisma raw SQL, Browserbase REST API, Node test runner.

## Global Constraints

- Do not show simulated browser video or claim to stream private ChatGPT reasoning/tool activity.
- Do not expose Browserbase API keys, `connectUrl`, `wsUrl`, `seleniumRemoteUrl`, or signing keys.
- Store the operator token only in `sessionStorage`; never commit or persist it.
- The UI cannot submit arbitrary prompts or arbitrary URLs.
- Browser tasks are server-generated and read-only: no login, form submission, messaging, purchases, payments, KYC, trading, downloads, security testing, CAPTCHA bypass, or access-control bypass.
- `REVENUE_LIVE_LOOP_ENABLED=false` by default.
- No new runtime dependency is required; use Node's native `fetch`.

---

### Task 1: Operator gate and safe task domain

**Files:**
- Create: `backend/src/config/revenue-live.config.ts`
- Create: `backend/src/services/revenue-live-domain.service.ts`
- Create: `backend/src/middleware/revenue-operator-auth.ts`
- Test: `backend/tests/revenue-live-domain.test.ts`
- Test: `backend/tests/revenue-operator-auth.test.ts`

**Interfaces:**
- Produces: `getRevenueLiveConfig(): RevenueLiveConfig`
- Produces: `verifyRevenueOperatorToken(candidate: string | undefined, configured: string | undefined): boolean`
- Produces: `requireRevenueOperator: RequestHandler`
- Produces: `validateRevenueResearchUrl(raw: string): URL`
- Produces: `buildRevenueResearchTask(input: { title: string; platform: string; sourceUrl: string }): string`
- Produces: `sanitizeProviderText(value: unknown, limit?: number): string | null`

- [ ] **Step 1: Write failing domain tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRevenueResearchTask,
  validateRevenueResearchUrl,
} from '../src/services/revenue-live-domain.service.js'

test('rejects local and private research URLs', () => {
  for (const url of [
    'http://localhost/admin',
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://169.254.169.254/latest/meta-data',
    'file:///etc/passwd',
  ]) {
    assert.throws(() => validateRevenueResearchUrl(url))
  }
})

test('builds a read-only task with hard safety boundaries', () => {
  const task = buildRevenueResearchTask({
    title: 'Example bounty',
    platform: 'Example',
    sourceUrl: 'https://example.com/bounty',
  })
  assert.match(task, /read-only/i)
  assert.match(task, /do not log in/i)
  assert.match(task, /do not submit/i)
  assert.match(task, /do not perform security testing/i)
})
```

- [ ] **Step 2: Run domain tests and confirm module-not-found failure**

Run: `cd backend && node --import tsx --test tests/revenue-live-domain.test.ts`

Expected: FAIL because `revenue-live-domain.service.ts` does not exist.

- [ ] **Step 3: Write failing operator-token tests**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyRevenueOperatorToken } from '../src/middleware/revenue-operator-auth.js'

test('requires both configured and candidate tokens', () => {
  assert.equal(verifyRevenueOperatorToken(undefined, 'secret'), false)
  assert.equal(verifyRevenueOperatorToken('secret', undefined), false)
})

test('accepts only the exact configured token', () => {
  assert.equal(verifyRevenueOperatorToken('secret', 'secret'), true)
  assert.equal(verifyRevenueOperatorToken('Secret', 'secret'), false)
})
```

- [ ] **Step 4: Implement configuration, URL guard, task template, sanitizer, and middleware**

Use `createHash('sha256')` and `timingSafeEqual()` for token verification. Parse `Authorization: Bearer ...` in the middleware. Return `503 REVENUE_OPERATOR_NOT_CONFIGURED` when the configured token is absent and `401 REVENUE_OPERATOR_UNAUTHORIZED` when verification fails.

`validateRevenueResearchUrl()` must reject embedded credentials, non-HTTP protocols, local hostnames, and literal private/loopback/link-local/multicast/unspecified IPv4 and IPv6 addresses.

- [ ] **Step 5: Run both test files**

Run: `cd backend && node --import tsx --test tests/revenue-live-domain.test.ts tests/revenue-operator-auth.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/revenue-live.config.ts backend/src/services/revenue-live-domain.service.ts backend/src/middleware/revenue-operator-auth.ts backend/tests/revenue-live-domain.test.ts backend/tests/revenue-operator-auth.test.ts
git commit -m "feat: add secure revenue live operator boundary"
```

### Task 2: Browserbase REST provider adapter

**Files:**
- Create: `backend/src/providers/browserbase-agent.provider.ts`
- Test: `backend/tests/browserbase-agent-provider.test.ts`

**Interfaces:**
- Produces: `BrowserbaseAgentProvider`
- Produces types: `BrowserbaseRun`, `BrowserbaseRunMessage`, `BrowserbaseLiveView`
- Constructor: `new BrowserbaseAgentProvider({ apiKey, baseUrl, fetchImpl? })`
- Methods: `createRun(task)`, `retrieveRun(runId)`, `listMessages(runId, since?)`, `getLiveView(sessionId)`, `releaseSession(sessionId)`

- [ ] **Step 1: Write a failing HTTP-contract test**

```ts
const calls: Array<{ url: string; init?: RequestInit }> = []
const provider = new BrowserbaseAgentProvider({
  apiKey: 'bb_test',
  baseUrl: 'https://api.browserbase.test',
  fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ runId: 'run-1', status: 'PENDING', task: 't', createdAt: 'x', updatedAt: 'x' }), { status: 200 })
  },
})
await provider.createRun('read-only task')
assert.equal(calls[0]?.url, 'https://api.browserbase.test/v1/agents/runs')
assert.equal(new Headers(calls[0]?.init?.headers).get('X-BB-API-Key'), 'bb_test')
```

Also test:

- messages endpoint appends `since` only when present
- debug response returns only `debuggerFullscreenUrl`, `debuggerUrl`, and safe page metadata
- release uses `POST /v1/sessions/{id}` with `{ status: 'REQUEST_RELEASE' }`
- non-2xx responses throw sanitized `AppError` without response bodies or keys

- [ ] **Step 2: Run the test and confirm module-not-found failure**

Run: `cd backend && node --import tsx --test tests/browserbase-agent-provider.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the adapter with a 20-second AbortController timeout**

The create body is:

```ts
{
  task,
  browserSettings: {
    proxies: false,
    verified: false,
  },
  resultSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      payoutTerms: { type: 'string' },
      eligibility: { type: 'string' },
      deadline: { type: 'string' },
      competition: { type: 'string' },
      requiredDeliverables: { type: 'string' },
      sourceUrls: { type: 'array', items: { type: 'string' } },
      uncertainty: { type: 'string' },
    },
    required: ['summary', 'sourceUrls', 'uncertainty'],
  },
}
```

- [ ] **Step 4: Run provider tests**

Run: `cd backend && node --import tsx --test tests/browserbase-agent-provider.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/providers/browserbase-agent.provider.ts backend/tests/browserbase-agent-provider.test.ts
git commit -m "feat: add Browserbase agent provider"
```

### Task 3: Persist and reconcile live runs

**Files:**
- Create: `backend/src/services/revenue-live-persistence.service.ts`
- Create: `backend/src/services/revenue-live.service.ts`
- Modify: `backend/src/services/revenue-persistence.service.ts`
- Test: `backend/tests/revenue-live-service.test.ts`

**Interfaces:**
- Adds: `revenuePersistence.getOpportunityForLiveRun(userId: string, opportunityId?: string | null)`
- Produces: `RevenueLiveService`
- Methods: `getStatus(userId)`, `startRun(userId, opportunityId?)`, `stopRun(userId, runId)`, `runNextEligibleOpportunity(userId)`

- [ ] **Step 1: Write failing service tests with fake provider and fake persistence**

Cover:

- start uses an opportunity owned by the active workspace
- start rejects when an active run already exists
- task text comes only from the server template
- reconciliation copies provider `sessionId` and final status
- provider messages are sanitized and inserted once by message ID
- status returns a debugger URL but never provider connection material
- stop requests session release when a session ID exists

- [ ] **Step 2: Run service tests and confirm failure**

Run: `cd backend && node --import tsx --test tests/revenue-live-service.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement lazy SQL tables and focused persistence methods**

Use parameterized Prisma tagged-template queries for all values. The only unsafe SQL is fixed table/index creation text with no interpolated external value.

- [ ] **Step 4: Implement orchestration and reconciliation**

Map provider states:

```ts
PENDING -> STARTING
RUNNING -> RUNNING
COMPLETED -> COMPLETED
FAILED -> FAILED
STOPPED -> STOPPED
TIMED_OUT -> TIMED_OUT
```

When provider retrieval temporarily fails, retain the previous run state and add a deduplicated warning event rather than deleting the run.

- [ ] **Step 5: Run service and existing revenue security tests**

Run: `cd backend && node --import tsx --test tests/revenue-live-service.test.ts tests/revenue-persistence-security.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/revenue-live-persistence.service.ts backend/src/services/revenue-live.service.ts backend/src/services/revenue-persistence.service.ts backend/tests/revenue-live-service.test.ts
git commit -m "feat: persist and reconcile revenue browser runs"
```

### Task 4: Protected live operations API

**Files:**
- Create: `backend/src/controllers/revenue-live.controller.ts`
- Modify: `backend/src/routes/revenue.routes.ts`
- Test: `backend/tests/revenue-live-api-contract.test.ts`

**Interfaces:**
- `GET /api/revenue/live/status`
- `POST /api/revenue/live/runs`
- `POST /api/revenue/live/runs/:id/stop`

- [ ] **Step 1: Write a failing source-contract test**

Assert that all live routes include `requireRevenueOperator`, that the controller reads `response.locals.userId`, and that the start endpoint accepts only an optional `opportunityId`.

- [ ] **Step 2: Run the contract test and confirm failure**

Run: `cd backend && node --import tsx --test tests/revenue-live-api-contract.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement controller and protected routes**

Responses:

```ts
GET status -> { data: RevenueLiveStatus }
POST runs -> 202 { data: RevenueLiveStatus }
POST stop -> { data: RevenueLiveStatus }
```

- [ ] **Step 4: Run API, service, auth, and domain tests**

Run: `cd backend && node --import tsx --test tests/revenue-live-api-contract.test.ts tests/revenue-live-service.test.ts tests/revenue-live-domain.test.ts tests/revenue-operator-auth.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/revenue-live.controller.ts backend/src/routes/revenue.routes.ts backend/tests/revenue-live-api-contract.test.ts
git commit -m "feat: expose protected revenue live operations API"
```

### Task 5: Real Live View panel in the revenue console

**Files:**
- Create: `src/features/revenue/revenue-live-api.ts`
- Create: `src/features/revenue/RevenueLiveOpsPanel.tsx`
- Modify: `src/pages/RevenueDashboardPage.tsx`
- Modify: `src/pages/revenue-console.test.ts`

**Interfaces:**
- Produces: `getRevenueLiveStatus(token)`, `startRevenueLiveRun(token, opportunityId?)`, `stopRevenueLiveRun(token, runId)`
- Produces: `RevenueLiveOpsPanel({ opportunities })`

- [ ] **Step 1: Extend the frontend test and make it fail**

Add assertions for:

```ts
assert.match(pageSource, /RevenueLiveOpsPanel/)
assert.match(livePanelSource, /云端浏览器实时画面/)
assert.match(livePanelSource, /sessionStorage/)
assert.match(livePanelSource, /debuggerFullscreenUrl/)
assert.doesNotMatch(livePanelSource, /mock video|模拟直播/i)
```

- [ ] **Step 2: Run frontend tests and confirm failure**

Run: `npm test`

Expected: FAIL because the panel does not exist.

- [ ] **Step 3: Implement the API client**

Send the token only in the `Authorization` header. Normalize all backend errors to readable Chinese messages without echoing response bodies.

- [ ] **Step 4: Implement the panel**

Required UI:

- operator token unlock form
- configuration and loop status
- running status chip and heartbeat
- iframe using only `liveView.debuggerFullscreenUrl`
- authenticated external Live View link as fallback
- current page title and redacted URL
- chronological event timeline
- start highest-priority eligible opportunity button
- stop active run button
- explicit honest empty/unconfigured states
- two-second polling while unlocked

- [ ] **Step 5: Insert the panel above the opportunity queue**

Pass `dashboard.opportunities` so the start action uses the first eligible item ID, not a user-supplied URL.

- [ ] **Step 6: Run frontend typecheck, tests, and build**

Run: `npm run typecheck && npm test && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/revenue/revenue-live-api.ts src/features/revenue/RevenueLiveOpsPanel.tsx src/pages/RevenueDashboardPage.tsx src/pages/revenue-console.test.ts
git commit -m "feat: show real cloud browser operations"
```

### Task 6: Optional server loop, deployment docs, and complete CI

**Files:**
- Create: `backend/src/workers/revenue-live-loop.worker.ts`
- Modify: `backend/src/server-lifecycle.ts`
- Modify: `.env.example`
- Modify: `backend/.env.example`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Test: `backend/tests/revenue-live-loop.test.ts`

**Interfaces:**
- Produces: `createRevenueLiveLoopWorker(dependencies)` with `start()` and `stop()`

- [ ] **Step 1: Write failing loop tests**

Cover:

- disabled configuration schedules nothing
- enabled configuration triggers one immediate safe iteration
- overlapping ticks are skipped
- failures are caught and do not crash the process
- `stop()` clears the interval

- [ ] **Step 2: Run loop tests and confirm failure**

Run: `cd backend && node --import tsx --test tests/revenue-live-loop.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the loop and wire it into server lifecycle**

Use the existing demo workspace user. Never start unless the provider is configured and `REVENUE_LIVE_LOOP_ENABLED=true`.

- [ ] **Step 4: Document required Railway variables and operator workflow**

Document that enabling Browserbase can incur provider usage charges and that no live session exists until the variables are configured.

- [ ] **Step 5: Add all new backend tests to CI**

Include:

- `browserbase-agent-provider.test.ts`
- `revenue-live-domain.test.ts`
- `revenue-operator-auth.test.ts`
- `revenue-live-service.test.ts`
- `revenue-live-api-contract.test.ts`
- `revenue-live-loop.test.ts`

- [ ] **Step 6: Run complete verification**

Frontend:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Backend:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:validate
npm run typecheck
npm test
npm run build
```

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/workers/revenue-live-loop.worker.ts backend/src/server-lifecycle.ts .env.example backend/.env.example README.md .github/workflows/ci.yml backend/tests/revenue-live-loop.test.ts
git commit -m "feat: add optional revenue browser loop"
```

### Task 7: Review, PR, merge, and production verification

**Files:**
- Review all branch changes.

- [ ] **Step 1: Compare branch to main and check for secret material**

Confirm no literal operator token, Browserbase API key, debugger URL, connect URL, or signing key is committed.

- [ ] **Step 2: Open a pull request**

Title: `feat: add live cloud browser operations`

The body must state that the live view remains locked until Railway variables are configured.

- [ ] **Step 3: Wait for complete GitHub Actions results and read any failing logs**

Do not merge with a failing frontend or backend job.

- [ ] **Step 4: Merge after green CI**

Use squash merge with the expected head SHA.

- [ ] **Step 5: Verify deployment status**

Confirm Vercel and Railway commit statuses are successful for the merge SHA.

- [ ] **Step 6: Verify honest production state**

Open `/app/revenue`. Before provider variables are configured, the panel must show locked/unconfigured state, not video. After configuration, unlock with the operator token and verify a real Browserbase run produces a provider Live View and updating events.
