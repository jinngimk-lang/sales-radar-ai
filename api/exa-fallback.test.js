import assert from 'node:assert/strict'
import test from 'node:test'

import { handleExaSearchResults } from './exa-fallback.js'

function encodeTask(overrides = {}) {
  const task = {
    v: 1,
    k: 'industrial pump buyer',
    p: ['Website'],
    r: ['USA'],
    m: 2,
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

test('Exa fallback searches for commercial counterparties and excludes low-value reference domains', async () => {
  const taskId = encodeTask()
  const response = createResponse()
  let requestBody = null

  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      env: { EXA_API_KEY: 'exa-test-key' },
      fetcher: async (_input, init = {}) => {
        requestBody = JSON.parse(String(init.body))
        return jsonResponse({ results: [] })
      },
    },
  )

  assert.equal(handled, false)
  assert.match(requestBody.query, /procurement|purchasing|buyer|supplier|sourcing/i)
  assert.ok(requestBody.excludeDomains.includes('wikipedia.org'))
  assert.ok(requestBody.excludeDomains.includes('britannica.com'))
})

test('Exa fallback uses Crawl4AI content before returning a commercial result when crawler is configured', async () => {
  const taskId = encodeTask({ m: 1 })
  const response = createResponse()
  const requests = []

  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      env: {
        EXA_API_KEY: 'exa-test-key',
        CRAWL4AI_BASE_URL: 'https://crawler.example.com',
        CRAWL4AI_API_TOKEN: 'crawler-token',
      },
      fetcher: async (input, init = {}) => {
        requests.push(String(input))
        if (String(input) === 'https://api.exa.ai/search') {
          return jsonResponse({
            results: [
              {
                id: 'exa-result-1',
                title: 'US manufacturer seeks industrial pump suppliers',
                url: 'https://buyer.example.com/procurement/pumps',
                text: 'Generic search snippet.',
              },
            ],
          })
        }
        assert.equal(String(input), 'https://crawler.example.com/crawl')
        assert.equal(init.headers.Authorization, 'Bearer crawler-token')
        return jsonResponse({
          success: true,
          results: [
            {
              success: true,
              url: 'https://buyer.example.com/procurement/pumps',
              markdown: {
                fit_markdown: 'RFQ: We are sourcing 500 industrial pumps and request supplier quotations by September 15.',
              },
              metadata: { title: 'Industrial pump RFQ' },
              status_code: 200,
            },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.deepEqual(requests, [
    'https://api.exa.ai/search',
    'https://crawler.example.com/crawl',
  ])
  assert.match(response.body.data[0].postContent, /RFQ.*500 industrial pumps/i)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisition, 'CRAWL4AI')
})

test('Exa fallback drops reference pages and keeps buyer or seller signals', async () => {
  const taskId = encodeTask({ m: 3 })
  const response = createResponse()

  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      env: { EXA_API_KEY: 'exa-test-key' },
      fetcher: async () => jsonResponse({
        results: [
          {
            id: 'wiki',
            title: 'Industrial pump - Wikipedia',
            url: 'https://en.wikipedia.org/wiki/Pump',
            text: 'An industrial pump is a mechanical device.',
          },
          {
            id: 'official-home',
            title: 'Acme Pumps | Home',
            url: 'https://acmepumps.example.com/',
            text: 'Welcome to Acme Pumps. Learn about our company.',
          },
          {
            id: 'buyer',
            title: 'RFQ for industrial pumps',
            url: 'https://buyer.example.com/rfq/industrial-pumps',
            text: 'Procurement notice: buyer seeks qualified pump suppliers and quotations.',
          },
        ],
      }),
    },
  )

  assert.equal(handled, true)
  assert.equal(response.body.data.length, 1)
  assert.equal(response.body.data[0].sourceUrl, 'https://buyer.example.com/rfq/industrial-pumps')
  assert.equal(response.body.data[0].sourceMetadata.commercialIntent, 'high')
})

test('Exa fallback powers Discover results directly when EXA_API_KEY is configured', async () => {
  const taskId = encodeTask()
  const response = createResponse()
  let requestBody = null
  let requestHeaders = null

  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      env: {
        EXA_API_KEY: 'exa-test-key',
        EXA_SEARCH_TIMEOUT_MS: '6000',
      },
      fetcher: async (input, init = {}) => {
        assert.equal(String(input), 'https://api.exa.ai/search')
        requestBody = JSON.parse(String(init.body))
        requestHeaders = init.headers
        return jsonResponse({
          results: [
            {
              id: 'exa-result-1',
              title: 'US manufacturer seeks industrial pump suppliers',
              url: 'https://buyer.example.com/procurement/pumps',
              publishedDate: '2026-08-30T12:00:00.000Z',
              author: 'Procurement Team',
              text: 'The manufacturer is evaluating industrial pump suppliers for a new production line and requests technical proposals this quarter.',
              highlights: ['evaluating industrial pump suppliers'],
            },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(requestHeaders['x-api-key'], 'exa-test-key')
  assert.match(requestBody.query, /industrial pump buyer/i)
  assert.match(requestBody.query, /United States/i)
  assert.equal(requestBody.type, 'fast')
  assert.equal(requestBody.numResults, 2)
  assert.deepEqual(requestBody.contents, { highlights: true })
  assert.equal(response.body.data.length, 1)
  assert.match(response.body.data[0].postContent, /evaluating industrial pump suppliers/i)
  assert.equal(response.body.data[0].sourceMetadata.provider, 'exa')
  assert.equal(response.body.data[0].sourceMetadata.searchEngine, 'exa')
  assert.equal(response.body.data[0].evidenceStatus, 'VALID')
})

test('Exa fallback uses domain filters for social-platform Discover searches', async () => {
  const taskId = encodeTask({ p: ['LinkedIn', 'Reddit'], r: [] })
  const response = createResponse()
  let requestBody = null

  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      env: { EXA_API_KEY: 'exa-test-key' },
      fetcher: async (_input, init = {}) => {
        requestBody = JSON.parse(String(init.body))
        return jsonResponse({ results: [] })
      },
    },
  )

  assert.equal(handled, false)
  assert.deepEqual(requestBody.includeDomains, ['linkedin.com', 'reddit.com'])
})

test('Exa fallback yields to the existing public search when the key is absent', async () => {
  const response = createResponse()
  let called = false
  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: {},
      fetcher: async () => {
        called = true
        throw new Error('should not fetch')
      },
    },
  )

  assert.equal(handled, false)
  assert.equal(called, false)
})

test('Exa transport failure yields to the existing public search instead of breaking Discover', async () => {
  const response = createResponse()
  const handled = await handleExaSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: { EXA_API_KEY: 'exa-test-key' },
      fetcher: async () => {
        throw new Error('temporary Exa outage')
      },
    },
  )

  assert.equal(handled, false)
  assert.equal(response.statusCode, null)
})
