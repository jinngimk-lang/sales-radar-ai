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

test('Market Radar buyer search uses transaction-intent terms and rejects generic reference results', async () => {
  const response = createResponse()
  let exaBody = null

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: {
        product: '电池',
        goal: 'FIND_BUYERS',
        signalFocus: 'ALL',
        region: 'SoutheastAsia',
      },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: { EXA_API_KEY: 'exa-test-key' },
      fetcher: async (_input, init = {}) => {
        exaBody = JSON.parse(String(init.body))
        return jsonResponse({
          results: [
            {
              id: 'wiki',
              title: 'Battery - Wikipedia',
              url: 'https://en.wikipedia.org/wiki/Battery',
              text: 'A battery is a source of electric power.',
            },
            {
              id: 'official',
              title: 'Example Battery Company - Official Website',
              url: 'https://example-battery.com/',
              text: 'Welcome to our official website and company profile.',
            },
            {
              id: 'buyer-rfq',
              title: 'Battery storage procurement RFQ',
              url: 'https://buyer.example.com/procurement/battery-storage',
              text: 'Procurement team seeks battery storage suppliers and requests quotations for a 2026 project.',
            },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.match(exaBody.query, /buyer|procurement|purchasing|sourcing|rfq|tender/i)
  assert.ok(exaBody.excludeDomains.includes('wikipedia.org'))
  assert.equal(response.body.data.sources.length, 1)
  assert.equal(
    response.body.data.sources[0].url,
    'https://buyer.example.com/procurement/battery-storage',
  )
})

test('Market Radar scan prefers Exa and returns source-backed research', async () => {
  const response = createResponse()
  let exaBody = null

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: {
        product: '电池',
        goal: 'FIND_BUYERS',
        signalFocus: 'ALL',
        region: 'SoutheastAsia',
      },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: { EXA_API_KEY: 'exa-test-key' },
      fetcher: async (input, init = {}) => {
        assert.equal(String(input), 'https://api.exa.ai/search')
        exaBody = JSON.parse(String(init.body))
        return jsonResponse({
          results: [
            {
              id: 'exa-market-1',
              title: 'Battery maker expands Southeast Asia production and seeks suppliers',
              url: 'https://example.com/procurement/battery-expansion',
              publishedDate: '2026-08-30T08:00:00.000Z',
              text: 'The company is expanding battery production capacity and evaluating new supply partners in Southeast Asia.',
            },
          ],
        })
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.match(exaBody.query, /电池/)
  assert.match(exaBody.query, /Southeast Asia/i)
  assert.match(exaBody.query, /buyer|procurement|purchasing|sourcing/i)
  assert.equal(exaBody.type, 'fast')
  assert.equal(response.body.data.provider, 'exa-web')
  assert.equal(response.body.data.status, 'completed')
  assert.equal(response.body.data.sources.length, 1)
  assert.equal(response.body.data.sources[0].url, 'https://example.com/procurement/battery-expansion')
  assert.match(response.body.data.sources[0].summary, /expanding battery production/i)
  assert.equal(response.body.data.signals.length, 0)
  assert.match(response.body.data.summary, /真实公开商业来源/)
})

test('Market Radar scan uses no-secret public web research when Exa is unavailable', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: {
        product: '电池',
        goal: 'FIND_BUYERS',
        signalFocus: 'FACTORY_EXPANSION',
      },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: {},
      fetcher: async (input) => {
        requests.push(String(input))
        if (String(input).startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({
            articles: [
              {
                url: 'https://news.example.com/procurement/battery-factory',
                title: 'New battery factory seeks equipment suppliers',
                seendate: '20260830T090000Z',
                sourcecountry: 'China',
                summary: 'The project procurement team is sourcing battery production equipment and accepting supplier quotations.',
              },
            ],
          })
        }
        throw new Error(`unexpected request ${String(input)}`)
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.data.provider, 'public-web')
  assert.equal(response.body.data.status, 'completed')
  assert.equal(response.body.data.sources.length, 1)
  assert.equal(response.body.data.sources[0].url, 'https://news.example.com/procurement/battery-factory')
  assert.match(response.body.data.summary, /公开网页检索/)
  assert.ok(requests.some((url) => url.includes('api.gdeltproject.org')))
  assert.ok(requests.every((url) => !/wikipedia\.org/i.test(url)))
})

test('Market Radar scan returns truthful no-results without falling back to Wikipedia', async () => {
  const response = createResponse()
  const requests = []

  const handled = await handleMarketResearchFallback(
    {
      method: 'POST',
      body: { product: '电池', goal: 'FIND_BUYERS', signalFocus: 'ALL' },
      query: {},
    },
    response,
    'market-signals/scan',
    {
      env: {},
      fetcher: async (input) => {
        requests.push(String(input))
        if (String(input).startsWith('https://api.gdeltproject.org/')) {
          return jsonResponse({ articles: [] })
        }
        throw new Error(`reference fallback must not be called: ${String(input)}`)
      },
    },
  )

  assert.equal(handled, true)
  assert.equal(response.statusCode, 201)
  assert.equal(response.body.data.status, 'no_results')
  assert.deepEqual(response.body.data.sources, [])
  assert.match(response.body.data.summary, /没有找到可验证的买家、卖家、采购、供应或渠道商业信号/)
  assert.ok(requests.every((url) => !/wikipedia\.org/i.test(url)))
})
