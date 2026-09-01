import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ProviderHealthService } from '../src/services/provider-health.service.js'
import { AppError } from '../src/utils/app-error.js'

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('ProviderHealthService', () => {
  it('reports the crawler gateway as available', async () => {
    let requestedUrl = ''
    const service = new ProviderHealthService({
      baseUrl: 'https://crawler.example',
      fetcher: async (input) => {
        requestedUrl = String(input)
        return jsonResponse({ status: 'ok' })
      },
    })

    const health = await service.checkCrawler()

    assert.equal(requestedUrl, 'https://crawler.example/health')
    assert.equal(health.provider, 'crawler')
    assert.equal(health.dependency, 'crawler-gateway')
    assert.equal(health.state, 'AVAILABLE')
    assert.equal(health.code, 'OK')
  })

  it('keeps historical AgentReach health calls as a crawler compatibility alias', async () => {
    const service = new ProviderHealthService({
      baseUrl: 'https://crawler.example',
      fetcher: async () => jsonResponse({ status: 'ok' }),
    })

    const health = await service.checkAgentReach()

    assert.equal(health.provider, 'crawler')
    assert.equal(health.state, 'AVAILABLE')
  })

  it('blocks search with a structured error when the crawler gateway is unavailable', async () => {
    const service = new ProviderHealthService({ baseUrl: '' })

    await assert.rejects(
      () => service.requireCrawler(),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 503 &&
        error.code === 'SEARCH_PROVIDER_UNAVAILABLE' &&
        error.details?.providerState === 'UNAVAILABLE' &&
        error.details?.dependency === 'crawler-gateway',
    )
  })

  it('reports gateway authentication failures without leaking credentials', async () => {
    const service = new ProviderHealthService({
      baseUrl: 'https://crawler.example',
      token: 'secret-token',
      fetcher: async (_input, init) => {
        assert.equal(
          new Headers(init?.headers).get('authorization'),
          'Bearer secret-token',
        )
        return jsonResponse({ error: 'unauthorized' }, 401)
      },
    })

    const health = await service.checkCrawler()

    assert.equal(health.state, 'UNAVAILABLE')
    assert.equal(health.code, 'CRAWLER_GATEWAY_AUTH_ERROR')
    assert.doesNotMatch(health.message, /secret-token/)
  })
})
