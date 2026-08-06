import assert from 'node:assert/strict'
import test from 'node:test'
import { Industry, Platform, Region } from '@prisma/client'
import { MarketWebResearchService } from '../src/services/market-intelligence/market-web-research.service.js'

test('hosted research quota failure falls back to configured Exa and preserves the full target in the query', async () => {
  let capturedKeyword = ''
  const service = new MarketWebResearchService({
    environment: {
      OPENAI_API_KEY: 'quota-exhausted',
      EXA_API_KEY: 'exa-available',
    },
    fetcher: async () =>
      new Response(
        JSON.stringify({ error: { message: 'You have no credits remaining' } }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      ),
    searchProvider: {
      name: 'agent-reach',
      async search(input) {
        capturedKeyword = input.keyword
        return [
          {
            externalId: 'fallback-1',
            platform: Platform.Website,
            sourceUrl: 'https://battery.example/news/expansion',
            profileUrl: 'https://battery.example',
            company: 'Battery Example',
            customerName: 'Battery Example',
            country: 'Singapore',
            region: Region.SoutheastAsia,
            industry: Industry.IndustrialManufacturing,
            rawContent: 'Battery Example is hiring automation engineers for a new factory.',
            metadata: { title: 'New battery factory' },
          },
        ]
      },
    },
    persistence: {
      async captureSearchResult() {
        return []
      },
    },
  })

  const session = await service.run('user-1', {
    product: 'battery automation',
    industry: 'battery manufacturing',
    region: Region.SoutheastAsia,
    customerType: 'Buyer',
    signalFocus: 'HIRING_SIGNAL',
  })

  assert.equal(session.provider, 'exa-web')
  assert.match(capturedKeyword, /battery automation/)
  assert.match(capturedKeyword, /battery manufacturing/)
  assert.match(capturedKeyword, /SoutheastAsia/)
  assert.match(capturedKeyword, /Buyer/)
  assert.match(capturedKeyword, /hiring jobs recruitment expansion/)
})
