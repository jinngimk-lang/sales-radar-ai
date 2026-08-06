import assert from 'node:assert/strict'
import test from 'node:test'
import { createRevenueLiveLoopWorker } from '../src/workers/revenue-live-loop.worker.js'

function createHarness(options: { enabled?: boolean; configured?: boolean } = {}) {
  let scheduled: (() => void) | null = null
  let cleared = false
  let runCount = 0
  let resolveRun: (() => void) | null = null
  const warnings: string[] = []

  const worker = createRevenueLiveLoopWorker({
    enabled: options.enabled ?? true,
    configured: options.configured ?? true,
    intervalMinutes: 30,
    resolveUserId: async () => 'workspace-1',
    runNext: async () => {
      runCount += 1
      await new Promise<void>((resolve) => {
        resolveRun = resolve
      })
    },
    setIntervalImpl(callback) {
      scheduled = callback
      return 1 as unknown as NodeJS.Timeout
    },
    clearIntervalImpl() {
      cleared = true
    },
    logger: {
      log() {},
      warn(message) {
        warnings.push(message)
      },
    },
  })

  return {
    worker,
    get scheduled() {
      return scheduled
    },
    get runCount() {
      return runCount
    },
    get cleared() {
      return cleared
    },
    warnings,
    finishRun() {
      resolveRun?.()
      resolveRun = null
    },
  }
}

async function flushAsyncWork() {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

test('disabled or unconfigured loops schedule nothing', () => {
  const disabled = createHarness({ enabled: false })
  const unconfigured = createHarness({ configured: false })

  disabled.worker.start()
  unconfigured.worker.start()

  assert.equal(disabled.scheduled, null)
  assert.equal(unconfigured.scheduled, null)
  assert.equal(disabled.runCount, 0)
  assert.equal(unconfigured.runCount, 0)
})

test('enabled loop runs immediately and schedules future iterations', async () => {
  const harness = createHarness()
  harness.worker.start()
  await flushAsyncWork()

  assert.equal(harness.runCount, 1)
  assert.equal(typeof harness.scheduled, 'function')
  harness.finishRun()
  await flushAsyncWork()
})

test('overlapping ticks are skipped', async () => {
  const harness = createHarness()
  harness.worker.start()
  await flushAsyncWork()

  harness.scheduled?.()
  await flushAsyncWork()
  assert.equal(harness.runCount, 1)

  harness.finishRun()
  await flushAsyncWork()
  harness.scheduled?.()
  await flushAsyncWork()
  assert.equal(harness.runCount, 2)
  harness.finishRun()
  await flushAsyncWork()
})

test('iteration failures are contained and do not crash scheduling', async () => {
  let scheduled: (() => void) | null = null
  const warnings: string[] = []
  const worker = createRevenueLiveLoopWorker({
    enabled: true,
    configured: true,
    intervalMinutes: 30,
    resolveUserId: async () => 'workspace-1',
    runNext: async () => {
      throw new Error('provider unavailable with secret details')
    },
    setIntervalImpl(callback) {
      scheduled = callback
      return 1 as unknown as NodeJS.Timeout
    },
    clearIntervalImpl() {},
    logger: { log() {}, warn: (message) => warnings.push(message) },
  })

  worker.start()
  await flushAsyncWork()

  assert.equal(typeof scheduled, 'function')
  assert.equal(warnings.length, 1)
  assert.doesNotMatch(warnings[0] ?? '', /secret details/)
})

test('stop clears the scheduled interval', () => {
  const harness = createHarness()
  harness.worker.start()
  harness.worker.stop()
  assert.equal(harness.cleared, true)
  harness.finishRun()
})
