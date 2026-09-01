import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { Server } from 'node:http'
import { describe, it } from 'node:test'
import { app } from '../src/app.js'
import { ProviderHealthService } from '../src/services/provider-health.service.js'
import {
  logCrawlerRuntimeDiagnostics,
  startBackendServer,
  type ServerLifecycleLogger,
} from '../src/server-lifecycle.js'

describe('backend startup lifecycle', () => {
  it('listens and serves health without a configured crawler gateway', async () => {
    await withBackend(
      (logger) => logCrawlerRuntimeDiagnostics(logger, {}),
      async (baseUrl, events) => {
        await assertHealthy(baseUrl)
        await waitForPostListenDiagnostics()
        assert.ok(events.includes('log:[runtime] search.active-provider=crawler'))
        assert.ok(events.includes('log:[runtime] crawler.gateway.configured=false'))
        assert.ok(events.includes('log:[runtime] crawler.direct-http-fallback=true'))
      },
    )
  })

  it('reports configured crawler capabilities without logging credentials or endpoints', async () => {
    const secretToken = 'crawler-secret-token'
    const gatewayUrl = 'https://crawler.private.example'
    await withBackend(
      (logger) =>
        logCrawlerRuntimeDiagnostics(logger, {
          CRAWLER_GATEWAY_URL: gatewayUrl,
          CRAWLER_GATEWAY_TOKEN: secretToken,
          CRAWL4AI_BASE_URL: 'https://crawl4ai.private.example',
          CRAWL4AI_API_TOKEN: 'crawl4ai-secret-token',
        }),
      async (baseUrl, events) => {
        await assertHealthy(baseUrl)
        await waitForPostListenDiagnostics()
        assert.ok(events.includes('log:[runtime] crawler.gateway.configured=true'))
        assert.ok(events.includes('log:[runtime] crawler.gateway.token.configured=true'))
        assert.ok(events.includes('log:[runtime] crawl4ai.configured=true'))
        assert.ok(events.includes('log:[runtime] crawl4ai.token.configured=true'))
        const joined = events.join('\n')
        assert.equal(joined.includes(secretToken), false)
        assert.equal(joined.includes(gatewayUrl), false)
        assert.equal(joined.includes('crawl4ai-secret-token'), false)
      },
    )
  })

  it('keeps health independent from an explicit crawler gateway failure', async () => {
    await withBackend(
      () => undefined,
      async (baseUrl) => {
        await assertHealthy(baseUrl)

        const providerHealth = new ProviderHealthService({
          baseUrl: 'https://crawler.example',
          fetcher: async () => {
            throw new Error('crawler gateway unreachable')
          },
        })
        const health = await providerHealth.checkCrawler()

        assert.equal(health.state, 'UNAVAILABLE')
        assert.equal(health.provider, 'crawler')
        assert.equal(health.dependency, 'crawler-gateway')
        assert.equal(health.code, 'CRAWLER_GATEWAY_HEALTH_CHECK_FAILED')
      },
    )
  })

  it('contains an unexpected post-listen diagnostics failure', async () => {
    await withBackend(
      () => {
        throw new Error('simulated diagnostics failure')
      },
      async (baseUrl, events) => {
        await assertHealthy(baseUrl)
        await waitForPostListenDiagnostics()
        assert.ok(events.includes('diagnostics-warning'))
      },
    )
  })

  it('starts listening before scheduling provider diagnostics', async () => {
    await withBackend(
      () => undefined,
      async (baseUrl, events) => {
        await assertHealthy(baseUrl)
        await waitForPostListenDiagnostics()

        assert.ok(events.indexOf('listening') >= 0)
        assert.ok(events.indexOf('diagnostics') >= 0)
        assert.ok(
          events.indexOf('listening') < events.indexOf('diagnostics'),
        )
      },
    )
  })
})

async function withBackend(
  diagnostics: (
    logger: ServerLifecycleLogger,
  ) => void | Promise<void>,
  assertion: (baseUrl: string, events: string[]) => Promise<void>,
): Promise<void> {
  const events: string[] = []
  const logger: ServerLifecycleLogger = {
    log(message) {
      events.push(`log:${message}`)
      if (message.startsWith('Sales Radar AI backend listening')) {
        events.push('listening')
      }
    },
    warn() {
      events.push('diagnostics-warning')
    },
  }
  const server = startBackendServer({
    application: app,
    port: 0,
    logger,
    runtimeDiagnostics: async () => {
      events.push('diagnostics')
      await diagnostics(logger)
    },
  })

  try {
    if (!server.listening) await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    await assertion(`http://127.0.0.1:${address.port}`, events)
  } finally {
    await closeServer(server)
  }
}

async function assertHealthy(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function waitForPostListenDiagnostics(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve))
}
