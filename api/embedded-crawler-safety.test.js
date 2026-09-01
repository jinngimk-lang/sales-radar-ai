import assert from 'node:assert/strict'
import test from 'node:test'

import { crawlEmbeddedPage } from './embedded-crawler.js'

function htmlResponse(body, init = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...(init.headers ?? {}),
    },
  })
}

test('embedded crawler rejects hostnames that resolve to private addresses before fetching', async () => {
  let fetchObserved = false
  await assert.rejects(
    crawlEmbeddedPage('https://internal.example/page', {
      resolver: async () => [{ address: '127.0.0.1', family: 4 }],
      fetcher: async () => {
        fetchObserved = true
        return htmlResponse('must not fetch')
      },
    }),
    /non-public/i,
  )
  assert.equal(fetchObserved, false)
})

test('embedded crawler validates every redirect target and extracts public page text', async () => {
  const requests = []
  const result = await crawlEmbeddedPage('https://public.example/start', {
    resolver: async (hostname) => {
      assert.equal(hostname, 'public.example')
      return [{ address: '93.184.216.34', family: 4 }]
    },
    fetcher: async (input) => {
      const url = String(input)
      requests.push(url)
      if (url === 'https://public.example/start') {
        return htmlResponse('', {
          status: 302,
          headers: { location: '/procurement/rfq' },
        })
      }
      if (url === 'https://public.example/procurement/rfq') {
        return htmlResponse('<html><head><title>Pump RFQ</title></head><body><main>Buyer requests quotations from qualified industrial pump suppliers.</main></body></html>')
      }
      throw new Error(`unexpected fetch ${url}`)
    },
  })

  assert.equal(result.url, 'https://public.example/procurement/rfq')
  assert.equal(result.title, 'Pump RFQ')
  assert.match(result.content, /requests quotations/i)
  assert.deepEqual(requests, [
    'https://public.example/start',
    'https://public.example/procurement/rfq',
  ])
})
