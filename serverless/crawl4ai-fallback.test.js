import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'

function encodeTask(overrides = {}) {
  const task = {
    v: 1,
    k: 'industrial pump buyer',
    p: ['Website'],
    r: [],
    m: 1,
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

test('crawler fallback enriches Discover search results with Crawl4AI content', async () => {
  const taskId = encodeTask()
  const response = createResponse()
  const calls = []
  const fetcher = async (input, init = {}) => {
    const url = String(input)
    calls.push({ url, init })

    if (url.startsWith('https://api.gdeltproject.org/')) {
      return jsonResponse({
        articles: [
          {
            url: 'https://example.com/procurement/pumps',
            title: 'Factory expands pump procurement program',
            domain: 'example.com',
            sourcecountry: 'United States',
            language: 'English',
          },
        ],
      })
    }

    if (url === 'https://crawler.example/crawl') {
      assert.deepEqual(JSON.parse(String(init.body)), {
        urls: ['https://example.com/procurement/pumps'],
      })
      return jsonResponse({
        success: true,
        results: [
          {
            success: true,
            url: 'https://example.com/procurement/pumps',
            markdown: {
              fit_markdown:
                'The procurement team is sourcing industrial pumps for a new production line and is evaluating suppliers this quarter.',
            },
            metadata: { title: 'Pump procurement program' },
            status_code: 200,
          },
        ],
      })
    }

    throw new Error(`Unexpected fetch: ${url}`)
  }

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      fetcher,
      env: {
        CRAWL4AI_BASE_URL: 'https://crawler.example',
        CRAWL4AI_MAX_RESULTS: '3',
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.length, 1)
  assert.match(response.body.data[0].postContent, /procurement team is sourcing industrial pumps/i)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisition, 'ENRICHED')
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisitionProvider, 'crawl4ai')
  assert.equal(response.body.data[0].evidenceStatus, 'VALID')
  assert.equal(calls.length, 2)
})

test('crawler fallback yields to the existing stateless search when Crawl4AI is not configured', async () => {
  const response = createResponse()
  let called = false
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      fetcher: async () => {
        called = true
        throw new Error('should not fetch')
      },
      env: {},
    },
  )

  assert.equal(handled, false)
  assert.equal(called, false)
})

test('crawler failure keeps public-search evidence available instead of failing the whole Discover search', async () => {
  const taskId = encodeTask()
  const response = createResponse()
  const fetcher = async (input) => {
    const url = String(input)
    if (url.startsWith('https://api.gdeltproject.org/')) {
      return jsonResponse({
        articles: [
          {
            url: 'https://example.com/pump-market',
            title: 'Industrial pump market update',
            domain: 'example.com',
            sourcecountry: 'Germany',
            language: 'English',
          },
        ],
      })
    }
    if (url === 'https://crawler.example/crawl') {
      return jsonResponse({ success: false, results: [] }, 200)
    }
    throw new Error(`Unexpected fetch: ${url}`)
  }

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(taskId)}/results`,
    {
      fetcher,
      env: { CRAWL4AI_BASE_URL: 'https://crawler.example' },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.length, 1)
  assert.match(response.body.data[0].postContent, /Industrial pump market update/i)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisition, 'FAILED')
  assert.equal(response.body.data[0].evidenceStatus, 'UNKNOWN')
})
