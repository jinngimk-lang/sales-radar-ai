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
      const parsed = new URL(url)
      assert.match(
        parsed.searchParams.get('query') ?? '',
        /buyer|procurement|sourcing|rfq|supplier/i,
      )
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

test('crawler fallback never fills empty search with Wikipedia', async () => {
  const response = createResponse()
  const requests = []
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      fetcher: async (input) => {
        const url = String(input)
        requests.push(url)
        if (url.startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({ articles: [] })
        }
        throw new Error(`reference fallback must not be called: ${url}`)
      },
      env: { CRAWL4AI_BASE_URL: 'https://crawler.example' },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body.data, [])
  assert.ok(requests.every((url) => !/wikipedia\.org/i.test(url)))
})

test('crawler fallback filters only encyclopedia sources and keeps ordinary public pages', async () => {
  const response = createResponse()
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask({ m: 5 }))}/results`,
    {
      fetcher: async (input) => {
        const url = String(input)
        if (url.startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({
            articles: [
              {
                url: 'https://en.wikipedia.org/wiki/Pump',
                title: 'Pump - Wikipedia',
                summary: 'An encyclopedia article about pumps.',
              },
              {
                url: 'https://example.com/',
                title: 'Example Pumps Official Website',
                summary: 'Welcome to our company website and product overview.',
              },
              {
                url: 'https://example.net/market-report',
                title: 'Industrial pump market report',
                summary: 'General market information and industry history.',
              },
              {
                url: 'https://forum.example.net/pump-buyers',
                title: 'Pump buyer discussion',
                summary: 'Forum discussion about sourcing and supplier experiences.',
              },
              {
                url: 'https://buyer.example.org/rfq/pumps',
                title: 'RFQ for industrial pumps',
                summary: 'Buyer procurement team seeks suppliers and quotations for 200 pumps.',
              },
            ],
          })
        }
        if (url === 'https://crawler.example/crawl') {
          return jsonResponse({ success: false, results: [] })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
      env: { CRAWL4AI_BASE_URL: 'https://crawler.example' },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.body.data.length, 4)
  const urls = response.body.data.map((item) => item.sourceUrl)
  assert.ok(!urls.some((url) => /wikipedia\.org/i.test(url)))
  assert.ok(urls.includes('https://example.com/'))
  assert.ok(urls.includes('https://example.net/market-report'))
  assert.ok(urls.includes('https://forum.example.net/pump-buyers'))
  assert.ok(urls.includes('https://buyer.example.org/rfq/pumps'))
})

test('crawler fallback directly crawls safe public pages when Crawl4AI is not configured', async () => {
  const response = createResponse()
  const calls = []
  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      fetcher: async (input) => {
        const url = String(input)
        calls.push(url)
        if (url.startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({
            articles: [
              {
                url: 'https://example.com/pump-market',
                title: 'Pump market update',
                summary: 'A public page about industrial pumps.',
              },
            ],
          })
        }
        if (url === 'https://example.com/pump-market') {
          return new Response(
            '<html><head><title>Pump sourcing update</title></head><body><main>Regional buyers are comparing industrial pump suppliers for 2027 projects.</main></body></html>',
            {
              status: 200,
              headers: { 'content-type': 'text/html; charset=utf-8' },
            },
          )
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
      env: {},
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.length, 1)
  assert.match(response.body.data[0].postContent, /Regional buyers are comparing industrial pump suppliers/i)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisitionProvider, 'direct-http')
  assert.equal(response.body.data[0].evidenceStatus, 'VALID')
  assert.equal(calls.length, 2)
})

test('direct crawler does not follow redirects into private networks', async () => {
  const response = createResponse()
  let privateFetchObserved = false

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      fetcher: async (input, init = {}) => {
        const url = String(input)
        if (url.startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({
            articles: [
              {
                url: 'https://public.example/redirect',
                title: 'Public sourcing page',
                summary: 'A public candidate that redirects.',
              },
            ],
          })
        }
        if (url === 'https://public.example/redirect') {
          assert.equal(init.redirect, 'manual')
          return new Response(null, {
            status: 302,
            headers: { location: 'http://127.0.0.1/admin' },
          })
        }
        if (url === 'http://127.0.0.1/admin') {
          privateFetchObserved = true
          return new Response('<html><body>private admin page</body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
      env: {},
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(privateFetchObserved, false)
  assert.equal(response.body.data.length, 1)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisition, 'FAILED')
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisitionProvider, 'direct-http')
  assert.equal(response.body.data[0].evidenceStatus, 'UNKNOWN')
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
            url: 'https://example.com/rfq/pump-suppliers',
            title: 'Industrial pump supplier RFQ',
            domain: 'example.com',
            sourcecountry: 'Germany',
            language: 'English',
            summary: 'Procurement team requests quotations from qualified industrial pump suppliers.',
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
  assert.match(response.body.data[0].postContent, /supplier RFQ|requests quotations/i)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisition, 'FAILED')
  assert.equal(response.body.data[0].evidenceStatus, 'UNKNOWN')
})
