import assert from 'node:assert/strict'
import test from 'node:test'

import { handleMarketResearchFallback } from './market-research-fallback.js'

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

test('Market Radar GET /market-signals is safe in stateless mode', async () => {
  const response = createResponse()
  const handled = await handleMarketResearchFallback(
    { method: 'GET', body: {}, query: {} },
    response,
    'market-signals',
    { env: {}, fetcher: async () => { throw new Error('not expected') } },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { data: [], meta: { total: 0 } })
})

test('Market Radar crawler MCP search keeps useful ordinary pages and removes encyclopedia sources', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: { product: '电池', goal: 'FIND_BUYERS', signalFocus: 'ALL', region: 'SoutheastAsia' },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: { CRAWLER_GATEWAY_URL: 'https://crawler.example', EXA_API_KEY: 'must-not-be-used' },
      fetcher: async (input, init = {}) => {
        const url = String(input)
        requests.push(url)
        assert.equal(url, 'https://crawler.example/search')
        assert.equal(init.method, 'POST')
        const body = JSON.parse(String(init.body))
        assert.match(body.keyword, /电池/)
        assert.deepEqual(body.platforms, ['Website'])
        assert.deepEqual(body.regions, ['SoutheastAsia'])
        return jsonResponse({
          results: [
            { url: 'https://en.wikipedia.org/wiki/Battery', title: 'Battery - Wikipedia', content: 'Encyclopedia entry.' },
            { url: 'https://battery.example.com/', title: 'Example Battery Company', content: 'Official company homepage and product catalog.' },
            { url: 'https://research.example.net/battery-market-report', title: 'Battery market report', content: 'Market overview describing demand and capacity changes.' },
            { url: 'https://forum.example.net/battery-sourcing', title: 'Battery sourcing discussion', content: 'Industry forum discussion about buyers and suppliers.' },
            { url: 'https://buyer.example.com/procurement/battery-storage', title: 'Battery storage procurement RFQ', content: 'Procurement team seeks suppliers and quotations for a 2026 project.' },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.data.provider, 'crawler-gateway')
  const urls = response.body.data.sources.map((source) => source.url)
  assert.equal(urls.length, 4)
  assert.ok(!urls.some((url) => /wikipedia\.org/i.test(url)))
  assert.ok(urls.includes('https://battery.example.com/'))
  assert.ok(urls.includes('https://research.example.net/battery-market-report'))
  assert.ok(urls.includes('https://forum.example.net/battery-sourcing'))
  assert.ok(urls.includes('https://buyer.example.com/procurement/battery-storage'))
  assert.deepEqual(requests, ['https://crawler.example/search'])
})

test('Market Radar deep-crawls search results when the MCP search response lacks content', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: { product: 'industrial robot', goal: 'FIND_BUYERS', signalFocus: 'FACTORY_EXPANSION' },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: { CRAWLER_GATEWAY_URL: 'https://crawler.example', CRAWL4AI_BASE_URL: 'https://crawler.example' },
      fetcher: async (input, init = {}) => {
        const url = String(input)
        requests.push(url)
        if (url === 'https://crawler.example/search') {
          return jsonResponse({ results: [{ url: 'https://factory.example.com/news/automation-project', title: 'Factory automation project' }] })
        }
        if (url === 'https://crawler.example/crawl') {
          assert.deepEqual(JSON.parse(String(init.body)), { urls: ['https://factory.example.com/news/automation-project'] })
          return jsonResponse({
            success: true,
            results: [{
              success: true,
              url: 'https://factory.example.com/news/automation-project',
              markdown: { fit_markdown: 'The factory is expanding two production lines and evaluating industrial robot suppliers this quarter.' },
              metadata: { title: 'Factory automation project' },
              status_code: 200,
            }],
          })
        }
        throw new Error(`unexpected request ${url}`)
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.data.status, 'completed')
  assert.equal(response.body.data.sources.length, 1)
  assert.match(response.body.data.sources[0].summary, /expanding two production lines/i)
  assert.deepEqual(requests, ['https://crawler.example/search', 'https://crawler.example/crawl'])
})

test('Market Radar returns truthful no-results when every crawler runtime is explicitly disabled', async () => {
  const response = createResponse()
  let fetchObserved = false

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: { product: '电池', goal: 'FIND_BUYERS', signalFocus: 'ALL' },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: { EMBEDDED_CRAWLER_DISABLED: 'true' },
      fetcher: async () => {
        fetchObserved = true
        throw new Error('network must not be called')
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.data.status, 'no_results')
  assert.deepEqual(response.body.data.sources, [])
  assert.match(response.body.data.summary, /Crawler\/MCP 检索没有返回/)
  assert.equal(fetchObserved, false)
})
