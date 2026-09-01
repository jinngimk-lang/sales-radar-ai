import assert from 'node:assert/strict'
import test from 'node:test'

import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'

function encodeTask() {
  const task = {
    v: 1,
    k: 'industrial automation Thailand',
    p: ['Website'],
    r: ['SoutheastAsia'],
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

test('GDELT candidate discovery ORs commercial-intent synonyms instead of requiring every synonym', async () => {
  const response = createResponse()
  let observedQuery = null

  const handled = await handleCrawlerSearchResults(
    { method: 'GET', query: {} },
    response,
    `search-task/${encodeURIComponent(encodeTask())}/results`,
    {
      env: {},
      fetcher: async (input) => {
        const url = new URL(String(input))
        assert.equal(url.hostname, 'api.gdeltproject.org')
        observedQuery = url.searchParams.get('query')
        return new Response(JSON.stringify({ articles: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.match(observedQuery ?? '', /^industrial automation Thailand \(/)
  assert.match(observedQuery ?? '', /\bbuyer OR procurement OR sourcing OR RFQ OR supplier\b/i)
  assert.doesNotMatch(
    observedQuery ?? '',
    /buyer procurement purchasing sourcing RFQ RFP tender supplier/,
  )
})
