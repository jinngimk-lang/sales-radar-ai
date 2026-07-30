import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ProviderRequestScheduler } from '../src/providers/search/provider-request-scheduler.js'

describe('ProviderRequestScheduler', () => {
  it('serializes concurrent calls and keeps a minimum interval between starts', async () => {
    let clock = 0
    const waits: number[] = []
    const starts: number[] = []
    const scheduler = new ProviderRequestScheduler(
      1_500,
      async (delayMs) => {
        waits.push(delayMs)
        clock += delayMs
      },
      () => clock,
    )

    const results = await Promise.all([
      scheduler.run(async () => {
        starts.push(clock)
        return 'first'
      }),
      scheduler.run(async () => {
        starts.push(clock)
        return 'second'
      }),
      scheduler.run(async () => {
        starts.push(clock)
        return 'third'
      }),
    ])

    assert.deepEqual(results, ['first', 'second', 'third'])
    assert.deepEqual(starts, [0, 1_500, 3_000])
    assert.deepEqual(waits, [1_500, 1_500])
  })

  it('releases the queue after a failed provider call', async () => {
    let clock = 0
    const scheduler = new ProviderRequestScheduler(
      1_000,
      async (delayMs) => {
        clock += delayMs
      },
      () => clock,
    )

    const failed = scheduler.run(async () => {
      throw new Error('provider failed')
    })
    const recovered = scheduler.run(async () => 'next request')

    await assert.rejects(failed, /provider failed/)
    assert.equal(await recovered, 'next request')
    assert.equal(clock, 1_000)
  })
})
