import { createHash } from 'node:crypto'
import type {
  ContentAcquisitionInput,
  ContentAcquisitionResult,
  ContentProvider,
} from './content-provider.interface.js'

export interface Crawl4AIContentProviderOptions {
  baseUrl: string
  apiToken?: string
  timeoutMs?: number
  fetcher?: typeof fetch
}

export class Crawl4AIContentProvider implements ContentProvider {
  readonly name = 'crawl4ai'
  private readonly baseUrl: string
  private readonly apiToken?: string
  private readonly timeoutMs: number
  private readonly fetcher: typeof fetch

  constructor(options: Crawl4AIContentProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.apiToken = options.apiToken?.trim() || undefined
    this.timeoutMs = clampTimeout(options.timeoutMs ?? 15_000)
    this.fetcher = options.fetcher ?? fetch
  }

  async acquire(input: ContentAcquisitionInput): Promise<ContentAcquisitionResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.apiToken ? { authorization: `Bearer ${this.apiToken}` } : {}),
        },
        body: JSON.stringify({ urls: [input.url] }),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`Crawl4AI request failed with status ${response.status}`)
      }
      const payload = await response.json() as unknown
      return parseResponse(payload, input.url)
    } finally {
      clearTimeout(timeout)
    }
  }
}

function parseResponse(payload: unknown, requestedUrl: string): ContentAcquisitionResult {
  const root = record(payload)
  const results = Array.isArray(root?.results) ? root.results : []
  const first = record(results[0])
  if (root?.success !== true || first?.success !== true) {
    throw new Error('Crawl4AI returned an unsuccessful result')
  }
  const content = markdownText(first.markdown) || stringValue(first.html)
  if (!content?.trim()) throw new Error('Crawl4AI returned no usable content')
  const normalized = content.trim().slice(0, 100_000)
  const metadata = record(first.metadata) ?? {}
  const publishedAt = readText(metadata, ['publishedAt', 'publishedDate', 'date'])
  const responseUrl = stringValue(first.url) ?? requestedUrl
  return {
    url: responseUrl,
    title: readText(metadata, ['title']) ?? null,
    content: normalized,
    publishedAt: publishedAt ?? null,
    contentHash: createHash('sha256').update(normalized).digest('hex'),
    statusCode: numberValue(first.status_code),
    metadata,
  }
}

function markdownText(value: unknown): string | null {
  if (typeof value === 'string') return value
  const markdown = record(value)
  return readText(markdown, ['fit_markdown', 'raw_markdown', 'markdown'])
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readText(value: Record<string, unknown> | null, keys: string[]) {
  if (!value) return null
  for (const key of keys) {
    const text = stringValue(value[key])
    if (text) return text
  }
  return null
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function clampTimeout(value: number) {
  return Math.max(1_000, Math.min(60_000, Math.round(value)))
}
