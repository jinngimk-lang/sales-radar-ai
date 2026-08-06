import assert from 'node:assert/strict'
import test from 'node:test'
import { RevenueLiveService } from '../src/services/revenue-live.service.js'

function createHarness() {
  const opportunities = new Map([
    [
      'opportunity-1',
      {
        id: 'opportunity-1',
        title: 'Example bounty',
        platform: 'Example',
        sourceUrl: 'https://example.com/bounty',
      },
    ],
  ])
  let activeRun: Record<string, unknown> | null = null
  const events: Array<Record<string, unknown>> = []
  const released: string[] = []
  const providerTasks: string[] = []

  const persistence = {
    async getOpportunityForLiveRun(_userId: string, opportunityId?: string | null) {
      return opportunities.get(opportunityId ?? 'opportunity-1') ?? null
    },
    async getActiveRun() {
      return activeRun
    },
    async createRun(input: Record<string, unknown>) {
      activeRun = {
        id: 'local-run-1',
        status: 'STARTING',
        providerSessionId: null,
        messageCursor: null,
        ...input,
      }
      return activeRun
    },
    async updateRun(_userId: string, _id: string, patch: Record<string, unknown>) {
      activeRun = { ...activeRun, ...patch }
      return activeRun
    },
    async addEvents(_userId: string, _runId: string, incoming: Array<Record<string, unknown>>) {
      for (const event of incoming) {
        if (!events.some((stored) => stored.providerMessageId === event.providerMessageId)) {
          events.push(event)
        }
      }
    },
    async getRunEvents() {
      return events
    },
  }

  const provider = {
    async createRun(task: string) {
      providerTasks.push(task)
      return {
        runId: 'provider-run-1',
        status: 'PENDING' as const,
        task,
        createdAt: '2026-08-06T00:00:00Z',
        updatedAt: '2026-08-06T00:00:00Z',
      }
    },
    async retrieveRun() {
      return {
        runId: 'provider-run-1',
        status: 'RUNNING' as const,
        task: providerTasks[0] ?? '',
        sessionId: 'session-1',
        createdAt: '2026-08-06T00:00:00Z',
        updatedAt: '2026-08-06T00:00:02Z',
      }
    },
    async listMessages() {
      return {
        data: [
          {
            id: 'message-1',
            createdAt: '2026-08-06T00:00:01Z',
            message: {
              role: 'assistant' as const,
              content: 'Visited https://example.com/bounty?token=secret',
            },
          },
        ],
        nextSince: 'message-1',
      }
    },
    async getLiveView() {
      return {
        debuggerFullscreenUrl: 'https://browserbase.example/live',
        debuggerUrl: 'https://browserbase.example/debug',
        pages: [
          {
            id: 'page-1',
            debuggerFullscreenUrl: 'https://browserbase.example/page/live',
            debuggerUrl: 'https://browserbase.example/page/debug',
            faviconUrl: null,
            title: 'Example bounty',
            url: 'https://example.com/bounty',
          },
        ],
      }
    },
    async releaseSession(sessionId: string) {
      released.push(sessionId)
    },
  }

  return {
    service: new RevenueLiveService({
      provider,
      persistence,
      configured: true,
      loopEnabled: false,
    }),
    providerTasks,
    events,
    released,
    setActiveRun(value: Record<string, unknown> | null) {
      activeRun = value
    },
  }
}

test('starts a server-generated read-only run for an owned opportunity', async () => {
  const harness = createHarness()
  const status = await harness.service.startRun('workspace-1', 'opportunity-1')

  assert.equal(status.run?.id, 'local-run-1')
  assert.equal(harness.providerTasks.length, 1)
  assert.match(harness.providerTasks[0] ?? '', /strictly read-only/i)
  assert.match(harness.providerTasks[0] ?? '', /do not log in/i)
  assert.match(harness.providerTasks[0] ?? '', /https:\/\/example\.com\/bounty/)
})

test('rejects a second active run', async () => {
  const harness = createHarness()
  harness.setActiveRun({ id: 'existing', status: 'RUNNING' })

  await assert.rejects(
    () => harness.service.startRun('workspace-1', 'opportunity-1'),
    (error: unknown) => (error as { code?: string }).code === 'REVENUE_LIVE_RUN_ACTIVE',
  )
})

test('reconciles provider session, live view, and idempotent sanitized events', async () => {
  const harness = createHarness()
  await harness.service.startRun('workspace-1', 'opportunity-1')

  const first = await harness.service.getStatus('workspace-1')
  const second = await harness.service.getStatus('workspace-1')

  assert.equal(first.run?.providerSessionId, 'session-1')
  assert.equal(first.liveView?.debuggerFullscreenUrl, 'https://browserbase.example/live')
  assert.equal(first.currentPage?.url, 'https://example.com/bounty')
  assert.equal(first.events[0]?.message, 'Visited https://example.com/bounty')
  assert.equal(second.events.length, 1)
  assert.equal('wsUrl' in (first.liveView ?? {}), false)
})

test('stops the active provider browser session', async () => {
  const harness = createHarness()
  await harness.service.startRun('workspace-1', 'opportunity-1')
  await harness.service.getStatus('workspace-1')

  const status = await harness.service.stopRun('workspace-1', 'local-run-1')

  assert.deepEqual(harness.released, ['session-1'])
  assert.equal(status.run?.status, 'STOPPED')
})
