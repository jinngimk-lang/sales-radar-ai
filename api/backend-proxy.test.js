import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import handler from './backend-proxy.js'

const originalBackendOrigin = process.env.BACKEND_ORIGIN
const originalCrawlerGatewayUrl = process.env.CRAWLER_GATEWAY_URL
const originalCrawlerGatewayToken = process.env.CRAWLER_GATEWAY_TOKEN
const originalFetch = globalThis.fetch

afterEach(() => {
  if (originalBackendOrigin === undefined) delete process.env.BACKEND_ORIGIN
  else process.env.BACKEND_ORIGIN = originalBackendOrigin

  if (originalCrawlerGatewayUrl === undefined) delete process.env.CRAWLER_GATEWAY_URL
  else process.env.CRAWLER_GATEWAY_URL = originalCrawlerGatewayUrl

  if (originalCrawlerGatewayToken === undefined) delete process.env.CRAWLER_GATEWAY_TOKEN
  else process.env.CRAWLER_GATEWAY_TOKEN = originalCrawlerGatewayToken

  globalThis.fetch = originalFetch
})

function createResponseRecorder() {
  return {
    statusCode: 200,
    headers: new Map(),
    jsonBody: undefined,
    sentBody: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(value) {
      this.jsonBody = value
      return this
    },
    setHeader(key, value) {
      this.headers.set(key.toLowerCase(), value)
    },
    send(value) {
      this.sentBody = value
      return this
    },
  }
}

async function invoke({ path, method = 'GET', body, query = {}, headers = {} }) {
  const response = createResponseRecorder()
  await handler(
    {
      method,
      headers,
      query: { path, ...query },
      body,
    },
    response,
  )
  return response
}

test('serves a complete crawler-MCP search flow when BACKEND_ORIGIN is missing', async () => {
  delete process.env.BACKEND_ORIGIN
  process.env.CRAWLER_GATEWAY_URL = 'https://crawler.example'
  process.env.CRAWLER_GATEWAY_TOKEN = 'test-token'

  globalThis.fetch = async (url, init = {}) => {
    const target = String(url)
    assert.equal(target, 'https://crawler.example/search')
    assert.equal(init.method, 'POST')
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-token')
    return new Response(
      JSON.stringify({
        results: [
          {
            url: 'https://example.com/thailand-automation-expansion',
            title: 'Automation supplier expands industrial operations in Thailand',
            content:
              'Automation supplier expands industrial operations in Thailand and is evaluating new production partners.',
            country: 'Thailand',
            region: 'SoutheastAsia',
            metadata: { searchEngine: 'crawler-mcp' },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )
  }

  const health = await invoke({ path: 'health' })
  assert.equal(health.statusCode, 200)
  assert.equal(health.jsonBody.status, 'ok')

  const provider = await invoke({ path: 'search/providers/health' })
  assert.equal(provider.statusCode, 200)
  assert.equal(provider.jsonBody.data.state, 'AVAILABLE')
  assert.equal(provider.jsonBody.data.provider, 'crawler-gateway')

  const created = await invoke({
    path: 'search-task',
    method: 'POST',
    body: {
      keyword: 'industrial automation companies Thailand',
      platforms: ['Website'],
      regions: ['SoutheastAsia'],
      includePublicContacts: false,
      maxResults: 1,
    },
  })

  assert.equal(created.statusCode, 202)
  assert.equal(created.jsonBody.data.status, 'COMPLETED')
  assert.equal(created.jsonBody.strategy.intent.product, 'industrial automation companies Thailand')
  assert.equal(created.jsonBody.productContext.source, 'inferred')
  assert.equal(created.jsonBody.searchIntent.salesIntent, 'customer')

  const taskId = created.jsonBody.data.id
  assert.ok(taskId)

  const task = await invoke({ path: `search-task/${taskId}` })
  assert.equal(task.statusCode, 200)
  assert.equal(task.jsonBody.data.status, 'COMPLETED')

  const results = await invoke({ path: `search-task/${taskId}/results` })
  assert.equal(results.statusCode, 200)
  assert.equal(results.jsonBody.meta.total, 1)
  assert.equal(results.jsonBody.data[0].platform, 'Website')
  assert.equal(results.jsonBody.data[0].customerType, 'Company')
  assert.equal(results.jsonBody.data[0].sourceUrl, 'https://example.com/thailand-automation-expansion')
  assert.match(results.jsonBody.data[0].postContent, /Automation supplier expands/)
  assert.equal(results.jsonBody.data[0].sourceMetadata.provider, 'crawler-gateway')
  assert.equal(results.jsonBody.data[0].sourceMetadata.discoveryProvider, 'crawler-mcp')
  assert.equal(results.jsonBody.data[0].sourceMetadata.contentAcquisitionProvider, 'crawler-gateway')

  const opportunities = await invoke({ path: `search-task/${taskId}/opportunities` })
  assert.equal(opportunities.statusCode, 200)
  assert.deepEqual(opportunities.jsonBody.data, [])

  const radar = await invoke({
    path: 'radar/assessments',
    query: { searchTaskId: taskId, includeBlocked: 'true' },
  })
  assert.equal(radar.statusCode, 200)
  assert.deepEqual(radar.jsonBody.data, [])
})

test('reports sales AI as unavailable when only the stateless fallback is running', async () => {
  delete process.env.BACKEND_ORIGIN

  const capabilities = await invoke({ path: 'health/capabilities' })

  assert.equal(capabilities.statusCode, 200)
  assert.equal(capabilities.jsonBody.data.salesAI.enabled, false)
  assert.equal(capabilities.jsonBody.data.salesAI.provider, null)
  assert.equal(capabilities.jsonBody.data.salesAI.model, null)
  assert.equal(capabilities.jsonBody.data.salesAI.reason, 'full_backend_required')
})

test('forwards API path, query, headers and JSON body to configured backend', async () => {
  process.env.BACKEND_ORIGIN = 'https://backend.example.com/some-ignored-path'
  let observedUrl
  let observedInit

  globalThis.fetch = async (url, init) => {
    observedUrl = String(url)
    observedInit = init
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: {
        'content-type': 'application/json',
        'x-upstream': 'yes',
      },
    })
  }

  const response = createResponseRecorder()
  await handler(
    {
      method: 'POST',
      headers: {
        host: 'sales-radar-ai.vercel.app',
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
        'content-length': '99',
      },
      query: { path: 'search-task/item-1', includeBlocked: 'true' },
      body: { keyword: 'pump' },
    },
    response,
  )

  assert.equal(
    observedUrl,
    'https://backend.example.com/api/search-task/item-1?includeBlocked=true',
  )
  assert.equal(observedInit.method, 'POST')
  assert.equal(observedInit.headers.get('authorization'), 'Bearer test-token')
  assert.equal(observedInit.headers.get('host'), null)
  assert.equal(observedInit.headers.get('content-length'), null)
  assert.equal(observedInit.body, JSON.stringify({ keyword: 'pump' }))
  assert.equal(response.statusCode, 201)
  assert.equal(response.headers.get('x-upstream'), 'yes')
  assert.equal(JSON.parse(response.sentBody.toString()).ok, true)
})
