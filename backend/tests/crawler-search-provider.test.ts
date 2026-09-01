import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Platform, Region } from '@prisma/client'
import { CrawlerSearchProvider } from '../src/providers/search/crawler-search.provider.js'
import { ProviderError } from '../src/providers/errors/provider-error.js'

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('CrawlerSearchProvider', () => {
  it('posts search intent to the crawler gateway and normalizes public-page results', async () => {
    let observedBody: Record<string, unknown> | null = null
    let observedAuthorization: string | null = null
    const provider = new CrawlerSearchProvider({
      baseUrl: 'https://crawler.example',
      token: 'test-token',
      fetcher: async (_input, init) => {
        observedBody = JSON.parse(String(init?.body)) as Record<string, unknown>
        observedAuthorization = new Headers(init?.headers).get('authorization')
        return jsonResponse({
          results: [
            {
              url: 'https://buyer.example.com/procurement/pumps',
              title: 'Industrial pump RFQ',
              content: 'Procurement team requests quotations from industrial pump suppliers.',
              company: 'Buyer Example',
              customerName: 'Buyer Example procurement',
              country: 'Germany',
              region: 'Europe',
              industry: 'IndustrialManufacturing',
              metadata: { source: 'crawl4ai-mcp' },
            },
          ],
        })
      },
    })

    const results = await provider.search({
      keyword: 'industrial pump buyers',
      platforms: [Platform.Website],
      regions: [Region.Europe],
      maxResults: 5,
    })

    assert.deepEqual(observedBody, {
      keyword: 'industrial pump buyers',
      platforms: ['Website'],
      regions: ['Europe'],
      maxResults: 5,
    })
    assert.equal(observedAuthorization, 'Bearer test-token')
    assert.equal(results.length, 1)
    assert.equal(results[0]?.sourceUrl, 'https://buyer.example.com/procurement/pumps')
    assert.equal(results[0]?.platform, Platform.Website)
    assert.equal(results[0]?.region, Region.Europe)
    assert.equal(results[0]?.industry, 'IndustrialManufacturing')
    assert.equal(results[0]?.metadata.provider, 'crawler')
    assert.equal(results[0]?.metadata.source, 'crawl4ai-mcp')
  })

  it('removes encyclopedia sources but keeps ordinary homepages and reports', async () => {
    const provider = new CrawlerSearchProvider({
      baseUrl: 'https://crawler.example',
      fetcher: async () => jsonResponse({
        results: [
          {
            url: 'https://en.wikipedia.org/wiki/Pump',
            title: 'Pump - Wikipedia',
            content: 'Encyclopedia entry.',
          },
          {
            url: 'https://pump.example.com/',
            title: 'Pump Example official website',
            content: 'Product catalog and company profile.',
          },
          {
            url: 'https://research.example.com/pump-market-report',
            title: 'Industrial pump market report',
            content: 'Market report covering industrial pump demand.',
          },
        ],
      }),
    })

    const results = await provider.search({
      keyword: 'industrial pumps',
      platforms: [Platform.Website],
      regions: [],
      maxResults: 10,
    })

    assert.equal(results.length, 2)
    assert.deepEqual(
      results.map((result) => result.sourceUrl),
      ['https://pump.example.com/', 'https://research.example.com/pump-market-report'],
    )
  })

  it('uses safe defaults for incomplete crawler records instead of fabricating verified identity', async () => {
    const provider = new CrawlerSearchProvider({
      baseUrl: 'https://crawler.example',
      fetcher: async () => jsonResponse({
        results: [
          {
            url: 'https://news.example.com/project',
            title: 'New factory project',
            content: 'A public project page.',
          },
        ],
      }),
    })

    const [result] = await provider.search({
      keyword: 'factory project',
      platforms: [Platform.Website],
      regions: [Region.SoutheastAsia],
      maxResults: 1,
    })

    assert.equal(result?.company, null)
    assert.equal(result?.customerName, 'New factory project')
    assert.equal(result?.country, 'Unknown')
    assert.equal(result?.region, Region.SoutheastAsia)
    assert.equal(result?.industry, 'IndustrialManufacturing')
  })

  it('returns a typed provider error when the crawler gateway is not configured', async () => {
    const provider = new CrawlerSearchProvider({ baseUrl: '' })

    await assert.rejects(
      provider.search({
        keyword: 'pump',
        platforms: [Platform.Website],
        regions: [],
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError)
        assert.equal(error.provider, 'crawler')
        assert.equal(error.code, 'AUTH_ERROR')
        return true
      },
    )
  })

  it('turns gateway timeouts into retryable provider timeout errors', async () => {
    const provider = new CrawlerSearchProvider({
      baseUrl: 'https://crawler.example',
      timeoutMs: 5,
      fetcher: async (_input, init) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 100)
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new DOMException('aborted', 'AbortError'))
          })
        })
        return jsonResponse({ results: [] })
      },
    })

    await assert.rejects(
      provider.search({
        keyword: 'pump',
        platforms: [Platform.Website],
        regions: [],
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError)
        assert.equal(error.code, 'TIMEOUT')
        assert.equal(error.provider, 'crawler')
        return true
      },
    )
  })
})
