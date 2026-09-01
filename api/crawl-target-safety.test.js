import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'

function encodeTask() {
  const task = {
    v: 1,
    k: 'industrial pump buyer',
    p: ['Website'],
    r: [],
    m: 5,
    t: Date.now(),
  }
  return `sf1_${Buffer.from(JSON.stringify(task)).toString('base64url')}`
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    setHeader() {},
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

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

test('crawler gateway results reject non-public URL literals before crawl enrichment', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: {
        CRAWLER_GATEWAY_URL: 'https://crawler.example',
        CRAWL4AI_BASE_URL: 'https://crawler.example',
      },
      fetcher: async (input) => {
        const url = String(input)
        requests.push(url)
        if (url === 'https://crawler.example/search') {
          return jsonResponse({
            results: [
              {
                url: 'http://127.0.0.1/admin',
                title: 'Loopback admin',
              },
              {
                url: 'http://0.0.0.0/private',
                title: 'Non-public target',
              },
              {
                url: 'https://public.example/procurement/pumps',
                title: 'Public procurement page',
                content: 'Buyer requests quotations from industrial pump suppliers.',
              },
            ],
          })
        }
        throw new Error(`Unsafe result must never be crawled: ${url}`)
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.length, 1)
  assert.equal(
    response.body.data[0].sourceUrl,
    'https://public.example/procurement/pumps',
  )
  assert.deepEqual(requests, ['https://crawler.example/search'])
})
