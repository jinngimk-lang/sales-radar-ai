import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  Industry,
  MarketSignalType,
  Platform,
  Region,
} from '@prisma/client'
import {
  MarketWebResearchService,
  extractMarketResearchResponse,
  readHostedResearchConfig,
} from '../src/services/market-intelligence/market-web-research.service.js'

const RESPONSE_PAYLOAD = {
  id: 'resp_market_1',
  model: 'gpt-5.6',
  output: [
    {
      type: 'web_search_call',
      status: 'completed',
      action: {
        type: 'search',
        queries: ['industrial automation factory expansion Europe'],
        sources: [
          {
            type: 'url',
            url: 'https://acme.example.com/news/factory-expansion?utm_source=test',
          },
        ],
      },
      results: [
        {
          url: 'https://acme.example.com/news/factory-expansion',
          title: 'Acme announces factory expansion in Europe',
          snippet:
            'Acme announced a factory expansion to increase manufacturing capacity in Europe.',
        },
      ],
    },
    {
      type: 'web_search_call',
      status: 'completed',
      action: {
        type: 'open_page',
        url: 'https://acme.example.com/news/factory-expansion',
      },
    },
    {
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: 'Acme 的扩产可能带来新的工业自动化需求。',
          annotations: [
            {
              type: 'url_citation',
              url: 'https://acme.example.com/news/factory-expansion',
              title: 'Acme announces factory expansion in Europe',
            },
          ],
        },
      ],
    },
  ],
}

describe('hosted market web research response extraction', () => {
  it('returns only actual search actions and source URLs', () => {
    const result = extractMarketResearchResponse(
      RESPONSE_PAYLOAD,
      { product: 'industrial automation' },
      '2026-08-03T00:00:00.000Z',
    )

    assert.equal(result.sources.length, 1)
    assert.equal(
      result.sources[0]?.url,
      'https://acme.example.com/news/factory-expansion',
    )
    assert.equal(result.sources[0]?.status, 'cited')
    assert.equal(result.sources[0]?.sourceType, 'news')
    assert.equal(result.trace.length, 2)
    assert.deepEqual(result.queries, [
      'industrial automation factory expansion Europe',
    ])
  })

  it('does not create a source when the response contains no HTTP URL', () => {
    const result = extractMarketResearchResponse(
      {
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'No sources were found.' }],
          },
        ],
      },
      { product: 'unknown product' },
    )
    assert.deepEqual(result.sources, [])
    assert.equal(result.summary, 'No sources were found.')
  })
})

describe('hosted research provider configuration', () => {
  it('prefers OpenAI without exposing its key', () => {
    const config = readHostedResearchConfig({
      OPENAI_API_KEY: 'test-openai-key',
      OPENAI_MARKET_MODEL: 'gpt-5.6',
      AI_PROVIDER: 'qwen',
      AI_API_KEY: 'test-qwen-key',
      AI_BASE_URL: 'https://qwen.example.com/v1/chat/completions',
    })
    assert.equal(config?.provider, 'openai-web')
    assert.equal(config?.endpoint, 'https://api.openai.com/v1/responses')
    assert.equal(config?.model, 'gpt-5.6')
  })

  it('reuses configured Qwen credentials with a Responses endpoint', () => {
    const config = readHostedResearchConfig({
      AI_PROVIDER: 'qwen',
      AI_API_KEY: 'test-qwen-key',
      AI_BASE_URL: 'https://qwen.example.com/v1/chat/completions',
      MARKET_RESEARCH_MODEL: 'qwen3.7-plus',
    })
    assert.equal(config?.provider, 'qwen-web')
    assert.equal(config?.endpoint, 'https://qwen.example.com/v1/responses')
    assert.equal(config?.model, 'qwen3.7-plus')
  })
})

describe('hosted market web research service', () => {
  it('uses the configured Exa search as a truthful no-model fallback', async () => {
    const service = new MarketWebResearchService({
      environment: { EXA_API_KEY: 'test-exa-key' },
      now: () => new Date('2026-08-03T00:00:00.000Z'),
      searchProvider: {
        name: 'agent-reach',
        async search(input) {
          assert.match(input.keyword, /industrial automation/)
          return [{
            externalId: 'exa-1',
            platform: Platform.Website,
            sourceUrl: 'https://manufacturer.example/news/new-factory',
            profileUrl: 'https://manufacturer.example',
            company: 'Manufacturer',
            customerName: 'Manufacturer',
            country: 'Germany',
            region: Region.Europe,
            industry: Industry.IndustrialManufacturing,
            rawContent: 'Manufacturer announced a new factory and production line.',
            metadata: { title: 'Manufacturer opens new factory' },
          }]
        },
      },
      persistence: {
        async captureSearchResult() {
          return [{ signalType: MarketSignalType.FACTORY_EXPANSION }]
        },
      },
    })

    const session = await service.run('user-1', {
      product: 'industrial automation',
      region: Region.Europe,
    })

    assert.equal(session.provider, 'exa-web')
    assert.equal(session.sources.length, 1)
    assert.equal(session.sources[0]?.status, 'consulted')
    assert.equal(session.trace[0]?.action, 'search')
    assert.match(session.summary, /不是大模型推断/)
  })

  it('calls the Responses API and persists source snippets through the market pipeline', async () => {
    const captured: Array<{ provider: string; sourceUrl: string }> = []
    const service = new MarketWebResearchService({
      environment: {
        OPENAI_API_KEY: 'test-key',
        OPENAI_MARKET_MODEL: 'gpt-5.6',
      },
      now: () => new Date('2026-08-03T00:00:00.000Z'),
      fetcher: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        assert.equal(body.model, 'gpt-5.6')
        assert.equal(body.tool_choice, 'required')
        return new Response(JSON.stringify(RESPONSE_PAYLOAD), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
      persistence: {
        async captureSearchResult(input) {
          captured.push({
            provider: input.provider,
            sourceUrl: input.result.sourceUrl,
          })
          return [{ signalType: MarketSignalType.FACTORY_EXPANSION }]
        },
      },
    })

    const session = await service.run('user-1', {
      product: 'industrial automation',
      region: 'Europe',
    })

    assert.equal(session.status, 'completed')
    assert.equal(session.provider, 'openai-web')
    assert.equal(session.sources.length, 1)
    assert.equal(session.signals.length, 1)
    assert.deepEqual(captured, [
      {
        provider: 'openai-web',
        sourceUrl: 'https://acme.example.com/news/factory-expansion',
      },
    ])
  })
})
