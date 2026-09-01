import { createHash } from 'node:crypto'
import { Industry, Platform, Region } from '@prisma/client'
import { ProviderError } from '../errors/provider-error.js'
import type {
  SearchProvider,
  SearchProviderInput,
  SearchResult,
} from './search-provider.interface.js'

const ENCYCLOPEDIA_DOMAINS = [
  'wikipedia.org',
  'wikidata.org',
  'britannica.com',
  'baike.baidu.com',
  'baike.com',
] as const

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RESULTS = 20
const MAX_RESULTS = 50

export interface CrawlerSearchProviderOptions {
  baseUrl?: string
  token?: string
  timeoutMs?: number
  fetcher?: typeof fetch
}

export class CrawlerSearchProvider implements SearchProvider {
  readonly name = 'crawler' as const

  private readonly baseUrl: string
  private readonly token?: string
  private readonly timeoutMs: number
  private readonly fetcher: typeof fetch

  constructor(options: CrawlerSearchProviderOptions = {}) {
    this.baseUrl = normalizeBaseUrl(
      options.baseUrl ?? process.env.CRAWLER_GATEWAY_URL ?? '',
    )
    this.token =
      options.token ?? (process.env.CRAWLER_GATEWAY_TOKEN?.trim() || undefined)
    this.timeoutMs = normalizeTimeout(
      options.timeoutMs ?? Number(process.env.CRAWLER_GATEWAY_TIMEOUT_MS),
    )
    this.fetcher = options.fetcher ?? fetch
  }

  async search(input: SearchProviderInput): Promise<SearchResult[]> {
    if (!this.baseUrl) {
      throw new ProviderError(
        'AUTH_ERROR',
        'Crawler gateway is not configured.',
        this.name,
      )
    }

    const maxResults = normalizeResultLimit(input.maxResults)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetcher(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify({
          keyword: input.keyword,
          platforms: input.platforms,
          regions: input.regions,
          maxResults,
        }),
        signal: controller.signal,
      })

      if (response.status === 401 || response.status === 403) {
        throw new ProviderError(
          'AUTH_ERROR',
          'Crawler gateway rejected authentication.',
          this.name,
        )
      }
      if (response.status === 429) {
        throw new ProviderError(
          'RATE_LIMIT',
          'Crawler gateway rate limit exceeded.',
          this.name,
        )
      }
      if (!response.ok) {
        throw new ProviderError(
          'INVALID_RESPONSE',
          `Crawler gateway returned HTTP ${response.status}.`,
          this.name,
        )
      }

      const payload = await response.json() as unknown
      const root = asRecord(payload)
      const records = Array.isArray(root?.results) ? root.results : null
      if (!records) {
        throw new ProviderError(
          'INVALID_RESPONSE',
          'Crawler gateway response did not contain a results array.',
          this.name,
        )
      }

      return records
        .map((record) => normalizeResult(record, input))
        .filter((result): result is SearchResult => result !== null)
        .slice(0, maxResults)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        throw new ProviderError(
          'TIMEOUT',
          'Crawler gateway request timed out.',
          this.name,
          { cause: error },
        )
      }
      throw new ProviderError(
        'INVALID_RESPONSE',
        error instanceof Error
          ? `Crawler gateway request failed: ${error.message}`
          : 'Crawler gateway request failed.',
        this.name,
        { cause: error },
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}

function normalizeResult(
  value: unknown,
  input: SearchProviderInput,
): SearchResult | null {
  const record = asRecord(value)
  if (!record) return null

  const sourceUrl = safeHttpUrl(readString(record.url) ?? readString(record.sourceUrl))
  if (!sourceUrl || isEncyclopediaUrl(sourceUrl)) return null

  const title =
    readString(record.title) ??
    readString(record.customerName) ??
    hostname(sourceUrl)
  const rawContent =
    readString(record.content) ??
    readString(record.text) ??
    readString(record.summary) ??
    title
  const platform = readEnum(record.platform, Platform) ?? input.platforms[0] ?? Platform.Website
  const region = readEnum(record.region, Region) ?? input.regions[0] ?? Region.USA
  const industry =
    readEnum(record.industry, Industry) ?? Industry.IndustrialManufacturing
  const metadata = asRecord(record.metadata) ?? {}
  const profileUrl =
    safeHttpUrl(readString(record.profileUrl)) ?? homeUrl(sourceUrl)
  const externalId =
    readString(record.externalId) ??
    readString(record.id) ??
    `crawler_${createHash('sha256').update(sourceUrl).digest('hex').slice(0, 24)}`

  return {
    externalId,
    platform,
    sourceUrl,
    profileUrl,
    company: readString(record.company),
    customerName: readString(record.customerName) ?? title,
    country: readString(record.country) ?? 'Unknown',
    region,
    industry,
    rawContent,
    metadata: {
      ...metadata,
      provider: 'crawler',
      title,
      contentAcquisitionProvider:
        readString(record.contentAcquisitionProvider) ?? 'crawler-gateway',
    },
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function normalizeTimeout(value: number) {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS
  return Math.max(1, Math.min(60_000, Math.round(value)))
}

function normalizeResultLimit(value: number | undefined) {
  if (!Number.isInteger(value) || !value || value < 1) return DEFAULT_MAX_RESULTS
  return Math.min(value, MAX_RESULTS)
}

function safeHttpUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

function isEncyclopediaUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return ENCYCLOPEDIA_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    )
  } catch {
    return true
  }
}

function homeUrl(value: string) {
  try {
    return new URL('/', value).toString()
  } catch {
    return value
  }
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readEnum<T extends Record<string, string>>(
  value: unknown,
  enumObject: T,
): T[keyof T] | null {
  if (typeof value !== 'string') return null
  return Object.values(enumObject).includes(value)
    ? value as T[keyof T]
    : null
}
