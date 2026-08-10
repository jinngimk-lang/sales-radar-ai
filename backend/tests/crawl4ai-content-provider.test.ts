import assert from 'node:assert/strict'
import test from 'node:test'
import { Crawl4AIContentProvider } from '../src/providers/content/crawl4ai-content.provider.js'
import { ContentAcquisitionService } from '../src/services/content-acquisition.service.js'
import { PublicCrawlTargetValidator } from '../src/services/public-crawl-target-validator.service.js'

test('Crawl4AI provider sends only a validated URL and parses grounded content', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const provider = new Crawl4AIContentProvider({
    baseUrl: 'https://crawl.example',
    apiToken: 'secret-token',
    fetcher: async (input, init) => {
      calls.push({ url: String(input), init })
      return new Response(
        JSON.stringify({
          success: true,
          results: [
            {
              success: true,
              url: 'https://manufacturer.example/news/expansion',
              status_code: 200,
              markdown: { fit_markdown: 'Official expansion announcement.' },
              metadata: {
                title: 'Factory expansion',
                publishedAt: '2026-08-01T00:00:00.000Z',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    },
  })

  const result = await provider.acquire({
    url: 'https://manufacturer.example/news/expansion',
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.url, 'https://crawl.example/crawl')
  assert.equal(
    new Headers(calls[0]?.init?.headers).get('authorization'),
    'Bearer secret-token',
  )
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    urls: ['https://manufacturer.example/news/expansion'],
  })
  assert.equal(result.content, 'Official expansion announcement.')
  assert.equal(result.title, 'Factory expansion')
  assert.equal(result.publishedAt, '2026-08-01T00:00:00.000Z')
  assert.match(result.contentHash, /^[a-f0-9]{64}$/)
})

test('public crawl validator blocks local and private targets', async () => {
  const validator = new PublicCrawlTargetValidator(async (hostname) => {
    if (hostname === 'internal.example') return ['10.0.0.12']
    return ['203.0.113.20']
  })

  await assert.rejects(() => validator.validate('http://localhost:8080/admin'))
  await assert.rejects(() => validator.validate('http://127.0.0.1/private'))
  await assert.rejects(() => validator.validate('https://internal.example/'))
  await assert.doesNotReject(() => validator.validate('https://public.example/news'))
})

test('content acquisition keeps original evidence when optional crawler fails', async () => {
  const service = new ContentAcquisitionService({
    provider: {
      name: 'crawl4ai',
      acquire: async () => {
        throw new Error('crawler unavailable')
      },
    },
    validator: { validate: async () => undefined },
  })

  const result = await service.enrich({
    url: 'https://public.example/news',
    title: 'Original title',
    content: 'Original provider evidence.',
    metadata: { publishedAt: '2026-08-01' },
  })

  assert.equal(result.status, 'FAILED')
  assert.equal(result.content, 'Original provider evidence.')
  assert.equal(result.title, 'Original title')
  assert.equal(result.metadata.contentAcquisition, 'FAILED')
  assert.equal(result.metadata.contentAcquisitionProvider, 'crawl4ai')
  assert.equal('error' in result.metadata, false)
})

test('content acquisition is disabled by default and performs no crawl', async () => {
  let called = false
  const service = new ContentAcquisitionService({
    provider: null,
    validator: {
      validate: async () => {
        called = true
      },
    },
  })

  const result = await service.enrich({
    url: 'https://public.example/news',
    title: null,
    content: 'Existing evidence',
    metadata: {},
  })

  assert.equal(result.status, 'SKIPPED')
  assert.equal(result.content, 'Existing evidence')
  assert.equal(called, false)
})
