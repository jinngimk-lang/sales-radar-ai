import assert from 'node:assert/strict'
import test from 'node:test'

import { searchCrawlerGateway } from './crawler-gateway-client.js'

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function bingTrackingUrl(target) {
  const encoded = Buffer.from(target, 'utf8').toString('base64url')
  return `https://www.bing.com/ck/a?!&&p=fixture&u=a1${encoded}&ntb=1`
}

test('uses embedded HTML crawler discovery when no external crawler gateway is configured', async () => {
  const requests = []
  const discovery = await searchCrawlerGateway({
    keyword: 'industrial pump procurement Europe',
    platforms: ['Website'],
    regions: ['Europe'],
    maxResults: 5,
    env: {},
    fetcher: async (input) => {
      const url = String(input)
      requests.push(url)
      assert.ok(!url.includes('api.exa.ai'))
      assert.ok(!url.includes('api.gdeltproject.org'))
      if (url.startsWith('https://html.duckduckgo.com/html/')) {
        return htmlResponse(`
          <div class="result">
            <h2 class="result__title"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FPump">Pump - Wikipedia</a></h2>
            <a class="result__snippet">Encyclopedia entry</a>
          </div>
          <div class="result">
            <h2 class="result__title"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbuyer.example%2Fprocurement%2Fpumps">Industrial pump RFQ</a></h2>
            <a class="result__snippet">Procurement team requests quotations from qualified pump suppliers.</a>
          </div>
          <div class="result">
            <h2 class="result__title"><a class="result__a" href="https://research.example.com/pump-market">Pump market report</a></h2>
            <a class="result__snippet">European industrial demand and supplier capacity report.</a>
          </div>
        `)
      }
      throw new Error(`unexpected request: ${url}`)
    },
  })

  assert.equal(discovery.configured, true)
  assert.equal(discovery.provider, 'crawler-gateway')
  assert.deepEqual(discovery.results.map((item) => item.url), [
    'https://buyer.example/procurement/pumps',
    'https://research.example.com/pump-market',
  ])
  assert.equal(discovery.results[0].provider, 'duckduckgo-html')
  assert.equal(discovery.results[0].metadata.searchEngine, 'duckduckgo-html')
  assert.match(discovery.results[0].summary, /requests quotations/i)
  assert.equal(requests.length, 1)
})

test('embedded crawler falls back to Bing HTML when DuckDuckGo yields no usable results', async () => {
  const requests = []
  const discovery = await searchCrawlerGateway({
    keyword: 'battery storage buyers',
    maxResults: 3,
    env: {},
    fetcher: async (input) => {
      const url = String(input)
      requests.push(url)
      if (url.startsWith('https://html.duckduckgo.com/html/')) {
        return htmlResponse('<html><body>No results</body></html>')
      }
      if (url.startsWith('https://www.bing.com/search?')) {
        return htmlResponse(`
          <ol id="b_results">
            <li class="b_algo"><h2><a href="https://buyer.example/rfq/storage">Battery storage tender</a></h2><div class="b_caption"><p>Buyer invites storage suppliers to bid.</p></div></li>
          </ol>
        `)
      }
      throw new Error(`unexpected request: ${url}`)
    },
  })

  assert.equal(discovery.configured, true)
  assert.equal(discovery.results.length, 1)
  assert.equal(discovery.results[0].url, 'https://buyer.example/rfq/storage')
  assert.equal(discovery.results[0].provider, 'bing-html')
  assert.equal(discovery.results[0].metadata.searchEngine, 'bing-html')
  assert.equal(requests.length, 2)
})

test('Bing tracking URLs are decoded before encyclopedia filtering and crawl enrichment', async () => {
  const wikipedia = 'https://en.m.wikipedia.org/wiki/Industrial'
  const procurement = 'https://buyer.example/procurement/industrial-automation'
  const requests = []

  const discovery = await searchCrawlerGateway({
    keyword: 'industrial automation procurement supplier Europe',
    maxResults: 5,
    env: {},
    fetcher: async (input) => {
      const url = String(input)
      requests.push(url)
      if (url.startsWith('https://html.duckduckgo.com/html/')) {
        return htmlResponse('<html><body>No usable results</body></html>')
      }
      if (url.startsWith('https://www.bing.com/search?')) {
        return htmlResponse(`
          <ol id="b_results">
            <li class="b_algo"><h2><a href="${bingTrackingUrl(wikipedia)}">Industrial - Wikipedia</a></h2><div class="b_caption"><p>Encyclopedia result.</p></div></li>
            <li class="b_algo"><h2><a href="${bingTrackingUrl(procurement)}">Industrial automation RFQ</a></h2><div class="b_caption"><p>Buyer requests quotations from automation suppliers.</p></div></li>
          </ol>
        `)
      }
      throw new Error(`unexpected request: ${url}`)
    },
  })

  assert.equal(discovery.configured, true)
  assert.deepEqual(discovery.results.map((item) => item.url), [procurement])
  assert.equal(discovery.results[0].provider, 'bing-html')
  assert.equal(discovery.results[0].metadata.searchEngine, 'bing-html')
  assert.ok(discovery.results.every((item) => !item.url.includes('bing.com/ck/a')))
  assert.equal(requests.length, 2)
})

test('embedded crawler retries with commercial intent when initial results are definition/reference noise', async () => {
  const bingRequests = []
  const discovery = await searchCrawlerGateway({
    keyword: 'industrial automation Europe',
    maxResults: 5,
    env: {},
    fetcher: async (input) => {
      const url = String(input)
      if (url.startsWith('https://html.duckduckgo.com/html/')) {
        return htmlResponse('<html><body>No usable results</body></html>')
      }
      if (url.startsWith('https://www.bing.com/search?')) {
        bingRequests.push(url)
        if (bingRequests.length === 1) {
          return htmlResponse(`
            <ol id="b_results">
              <li class="b_algo"><h2><a href="https://www.merriam-webster.com/dictionary/industrial">Industrial Definition</a></h2><div class="b_caption"><p>Definition and meaning of industrial.</p></div></li>
              <li class="b_algo"><h2><a href="https://www.cgaa.org/article/what-does-industrial-mean-in-business">What does industrial mean in business?</a></h2><div class="b_caption"><p>A general explanation of the word industrial.</p></div></li>
            </ol>
          `)
        }
        return htmlResponse(`
          <ol id="b_results">
            <li class="b_algo"><h2><a href="https://buyer.example/procurement/automation-rfq">Industrial automation procurement RFQ</a></h2><div class="b_caption"><p>Buyer is sourcing automation suppliers and requests quotations for a new production line.</p></div></li>
          </ol>
        `)
      }
      throw new Error(`unexpected request: ${url}`)
    },
  })

  assert.deepEqual(discovery.results.map((item) => item.url), [
    'https://buyer.example/procurement/automation-rfq',
  ])
  assert.equal(bingRequests.length, 2)
  const refinedQuery = new URL(bingRequests[1]).searchParams.get('q') || ''
  assert.match(refinedQuery, /procurement|rfq|tender|sourcing|buyer|supplier/i)
  assert.match(refinedQuery, /-dictionary|-definition|-meaning/i)
})
