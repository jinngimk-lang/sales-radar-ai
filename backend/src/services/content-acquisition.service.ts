import type { ContentProvider } from '../providers/content/content-provider.interface.js'
import { Crawl4AIContentProvider } from '../providers/content/crawl4ai-content.provider.js'
import { publicCrawlTargetValidator } from './public-crawl-target-validator.service.js'

export interface ContentEnrichmentInput {
  url: string
  title: string | null
  content: string
  metadata: Record<string, unknown>
}

export interface ContentEnrichmentResult extends ContentEnrichmentInput {
  status: 'ENRICHED' | 'SKIPPED' | 'FAILED'
}

interface ContentAcquisitionOptions {
  provider?: ContentProvider | null
  validator?: { validate(url: string): Promise<void> }
}

export class ContentAcquisitionService {
  private readonly provider: ContentProvider | null
  private readonly validator: { validate(url: string): Promise<void> }

  constructor(options: ContentAcquisitionOptions = {}) {
    this.provider = options.provider === undefined ? providerFromEnvironment() : options.provider
    this.validator = options.validator ?? publicCrawlTargetValidator
  }

  async enrich(input: ContentEnrichmentInput): Promise<ContentEnrichmentResult> {
    if (!this.provider) return { ...input, status: 'SKIPPED' }
    try {
      await this.validator.validate(input.url)
      const acquired = await this.provider.acquire({ url: input.url })
      return {
        url: input.url,
        title: acquired.title ?? input.title,
        content: acquired.content,
        metadata: {
          ...input.metadata,
          ...acquired.metadata,
          publishedAt: acquired.publishedAt ?? input.metadata.publishedAt,
          contentAcquisition: 'ENRICHED',
          contentAcquisitionProvider: this.provider.name,
          contentHash: acquired.contentHash,
          crawlStatusCode: acquired.statusCode,
        },
        status: 'ENRICHED',
      }
    } catch {
      return {
        ...input,
        metadata: {
          ...input.metadata,
          contentAcquisition: 'FAILED',
          contentAcquisitionProvider: this.provider.name,
        },
        status: 'FAILED',
      }
    }
  }
}

function providerFromEnvironment(): ContentProvider | null {
  if (process.env.CONTENT_ACQUISITION_PROVIDER?.trim().toLowerCase() !== 'crawl4ai') return null
  const baseUrl = process.env.CRAWL4AI_BASE_URL?.trim()
  if (!baseUrl) return null
  return new Crawl4AIContentProvider({
    baseUrl,
    apiToken: process.env.CRAWL4AI_API_TOKEN,
    timeoutMs: positiveInteger(process.env.CRAWL4AI_TIMEOUT_MS),
  })
}

function positiveInteger(value: string | undefined) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : undefined
}

export const contentAcquisitionService = new ContentAcquisitionService()
