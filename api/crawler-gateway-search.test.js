import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'
import { handleMarketResearchFallback } from './market-research-fallback.js'

function encodeTask(overrides = {}) {
  const task = {
    v: 1,
    k: 'industrial pump buyer',
    p: ['Website'],
    r: ['Europe'],
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

test('Discover uses crawler gateway search instead of provider search APIs when configured', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: {
        CRAWLER_GATEWAY_URL: 'https://crawler.example',
        CRAWLER_GATEWAY_TOKEN: 'test-token',
      },
      fetcher: async (input, init = {}) => {
        const url = String(input)
        requests.push(url)
        assert.ok(!url.includes('api.gdeltproject.org'))
        assert.ok(!url.includes('api.exa.ai'))
        assert.equal(url, 'https://crawler.example/search')
        assert.equal(init.method, 'POST')
        assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-token')
        const body = JSON.parse(String(init.body))
        assert.equal(body.keyword, 'industrial pump buyer')
        assert.deepEqual(body.platforms, ['Website'])
        assert.deepEqual(body.regions, ['Europe'])
        assert.equal(body.maxResults, 15)
        return jsonResponse({
          results: [
            {
              url: 'https://en.wikipedia.org/wiki/Pump',
              title: 'Pump - Wikipedia',
              content: 'Encyclopedia entry.',
            },
            {
              url: 'https://buyer.example/procurement/pumps',
              title: 'Industrial pump RFQ',
              content: 'Procurement team is requesting quotations from industrial pump suppliers for a 2027 project.',
              country: 'Germany',
              region: 'Europe',
              metadata: { searchEngine: 'crawler-mcp' },
            },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.length, 1)
  assert.equal(response.body.data[0].sourceUrl, 'https://buyer.example/procurement/pumps')
  assert.match(response.body.data[0].postContent, /requesting quotations/i)
  assert.equal(response.body.data[0].sourceMetadata.provider, 'crawler-gateway')
  assert.equal(response.body.data[0].sourceMetadata.discoveryProvider, 'crawler-mcp')
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisitionProvider, 'crawler-gateway')
  assert.equal(response.body.data[0].evidenceStatus, 'VALID')
  assert.deepEqual(requests, ['https://crawler.example/search'])
})

test('Market Radar uses crawler gateway search instead of GDELT or Exa when configured', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: {
        product: 'battery storage',
        goal: 'FIND_BUYERS',
        signalFocus: 'ALL',
        region: 'Europe',
      },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: {
        CRAWLER_GATEWAY_URL: 'https://crawler.example',
        CRAWLER_GATEWAY_TOKEN: 'test-token',
        EXA_API_KEY: 'must-not-be-used',
      },
      fetcher: async (input, init = {}) => {
        const url = String(input)
        requests.push(url)
        assert.ok(!url.includes('api.gdeltproject.org'))
        assert.ok(!url.includes('api.exa.ai'))
        assert.equal(url, 'https://crawler.example/search')
        assert.equal(init.method, 'POST')
        assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-token')
        const body = JSON.parse(String(init.body))
        assert.match(body.keyword, /battery storage/i)
        assert.deepEqual(body.platforms, ['Website'])
        assert.deepEqual(body.regions, ['Europe'])
        return jsonResponse({
          results: [
            {
              url: 'https://research.example.com/battery-demand',
              title: 'Battery storage demand report',
              content: 'European industrial buyers are expanding storage procurement programs and evaluating suppliers.',
              metadata: { searchEngine: 'crawler-mcp' },
            },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.data.provider, 'crawler-gateway')
  assert.equal(response.body.data.sources.length, 1)
  assert.equal(response.body.data.sources[0].url, 'https://research.example.com/battery-demand')
  assert.match(response.body.data.sources[0].summary, /industrial buyers are expanding/i)
  assert.deepEqual(requests, ['https://crawler.example/search'])
})
