import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'

function encodeTask() {
  const task = {
    v: 1,
    k: 'industrial pump buyer',
    p: ['Website'],
    r: [],
    m: 1,
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

test('direct crawler rejects non-public IPv4 literals before making a page request', async () => {
  const response = createResponse()
  let nonPublicFetchObserved = false

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: {},
      fetcher: async (input) => {
        const url = String(input)
        if (url.startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({
            articles: [
              {
                url: 'http://0.0.0.0/private',
                title: 'Non-public target',
                summary: 'This candidate must never be fetched as a public page.',
              },
            ],
          })
        }
        if (url === 'http://0.0.0.0/private') {
          nonPublicFetchObserved = true
          return new Response('<html><body>local service</body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(nonPublicFetchObserved, false)
  assert.equal(response.body.data.length, 1)
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisition, 'SKIPPED')
  assert.equal(response.body.data[0].sourceMetadata.contentAcquisitionProvider, null)
  assert.equal(response.body.data[0].evidenceStatus, 'UNKNOWN')
})
