import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'
import { runtimeCapabilities } from './serverless-fallback.js'

function encodeTask(overrides = {}) {
  const task = {
    v: 1,
    k: 'industrial pump buyer',
    p: ['Website'],
    r: [],
    m: 5,
    t: Date.now(),
    ...overrides,
  }
  return `sf1_${Buffer.from(JSON.stringify(task)).toString('base64url')}`
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

test('crawler MCP search filters encyclopedia pages and keeps useful ordinary public pages', async () => {
  const response = createResponse()
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: { CRAWLER_GATEWAY_URL: 'https://crawler.example' },
      fetcher: async (input) => {
        assert.equal(String(input), 'https://crawler.example/search')
        return jsonResponse({
          results: [
            { url: 'https://en.wikipedia.org/wiki/Pump', title: 'Pump - Wikipedia', content: 'Encyclopedia entry.' },
            { url: 'https://pump.example.com/', title: 'Pump Example official website', content: 'Company product catalog and factory capabilities.' },
            { url: 'https://research.example.com/pump-market-report', title: 'Industrial pump market report', content: 'Report describing regional demand and new capacity investments.' },
            { url: 'https://forum.example.net/pump-buyers', title: 'Pump buyer discussion', content: 'Forum discussion comparing supplier availability and sourcing experience.' },
            { url: 'https://buyer.example.org/rfq/pumps', title: 'RFQ for industrial pumps', content: 'Procurement team seeks quotations from qualified pump suppliers.' },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  const urls = response.body.data.map((item) => item.sourceUrl)
  assert.equal(urls.length, 4)
  assert.ok(!urls.some((url) => /wikipedia\.org/i.test(url)))
  assert.ok(urls.includes('https://pump.example.com/'))
  assert.ok(urls.includes('https://research.example.com/pump-market-report'))
  assert.ok(urls.includes('https://forum.example.net/pump-buyers'))
  assert.ok(urls.includes('https://buyer.example.org/rfq/pumps'))
  assert.ok(response.body.data.every((item) => item.evidenceStatus === 'VALID'))
})

test('crawler MCP search deep-crawls results that do not already contain page text', async () => {
  const response = createResponse()
  const calls = []
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask({ m: 1 }))}/results`,
    {
      env: {
        CRAWLER_GATEWAY_URL: 'https://crawler.example',
        CRAWL4AI_BASE_URL: 'https://crawler.example',
      },
      fetcher: async (input, init = {}) => {
        const url = String(input)
        calls.push(url)
        if (url === 'https://crawler.example/search') {
          return jsonResponse({ results: [{ url: 'https://factory.example.com/procurement/pumps', title: 'Pump procurement project' }] })
        }
        if (url === 'https://crawler.example/crawl') {
          assert.deepEqual(JSON.parse(String(init.body)), { urls: ['https://factory.example.com/procurement/pumps'] })
          return jsonResponse({
            success: true,
            results: [{
              success: true,
              url: 'https://factory.example.com/procurement/pumps',
              markdown: { fit_markdown: 'The plant is requesting quotations for industrial pumps and evaluating suppliers for a new line.' },
              metadata: { title: 'Pump procurement project' },
              status_code: 200,
            }],
          })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.body.data.length, 1)
  assert.match(response.body.data[0].postContent, /requesting quotations/i)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisitionProvider, 'crawl4ai')
  assert.equal(response.body.data[0].evidenceStatus, 'VALID')
  assert.deepEqual(calls, ['https://crawler.example/search', 'https://crawler.example/crawl'])
})

test('crawler search returns truthful empty results when every crawler runtime is explicitly disabled', async () => {
  const response = createResponse()
  let fetchObserved = false
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: { EMBEDDED_CRAWLER_DISABLED: 'true' },
      fetcher: async () => {
        fetchObserved = true
        throw new Error('network must not be called')
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body.data, [])
  assert.equal(fetchObserved, false)
})

test('crawler provider health reports embedded crawler available by default', async () => {
  const response = createResponse()
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    'search/providers/health',
    { env: {} },
  )
  assert.equal(handled, true)
  assert.equal(response.body.data.state, 'AVAILABLE')
  assert.equal(response.body.data.provider, 'embedded-html-crawler')
  assert.equal(response.body.data.mode, 'embedded')
})

test('crawler provider health reports disabled only when embedded and external runtimes are absent', async () => {
  const response = createResponse()
  await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    'search/providers/health',
    { env: { EMBEDDED_CRAWLER_DISABLED: 'true' } },
  )
  assert.equal(response.body.data.state, 'UNAVAILABLE')
  assert.equal(response.body.data.code, 'CRAWLER_SEARCH_DISABLED')
})

test('serverless capabilities expose embedded crawler without external configuration', () => {
  const capabilities = runtimeCapabilities({})
  assert.equal(capabilities.marketResearch.enabled, true)
  assert.equal(capabilities.marketResearch.provider, 'embedded-html-crawler')
  assert.equal(capabilities.salesDiscovery.enabled, true)
  assert.equal(capabilities.agentRuntime.transport, 'embedded-serverless')
})

test('crawler gateway transport failure never falls back to Exa, GDELT or encyclopedia filler', async () => {
  const response = createResponse()
  const requests = []
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: { CRAWLER_GATEWAY_URL: 'https://crawler.example' },
      fetcher: async (input) => {
        requests.push(String(input))
        throw new Error('crawler unavailable')
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body.data, [])
  assert.deepEqual(requests, ['https://crawler.example/search'])
})
