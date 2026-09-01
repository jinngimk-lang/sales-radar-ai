import { isIP } from 'node:net'
import { crawlEmbeddedPage, searchEmbeddedHtml } from './embedded-crawler.js'

const DEFAULT_SEARCH_TIMEOUT_MS = 10_000
const DEFAULT_CRAWL_TIMEOUT_MS = 8_000
const DEFAULT_CRAWL_MAX_RESULTS = 6

const ENCYCLOPEDIA_DOMAINS = [
  'wikipedia.org',
  'wikidata.org',
  'britannica.com',
  'baike.baidu.com',
  'baike.com',
]

function positiveInteger(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function boundedTimeout(value, fallback, max = 30_000) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 500) return fallback
  return Math.min(Math.round(parsed), max)
}

function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

export function embeddedCrawlerEnabled(env = process.env) {
  return String(env.EMBEDDED_CRAWLER_DISABLED ?? '').toLowerCase() !== 'true'
}

export function crawlerGatewayConfig(env = process.env) {
  const baseUrl = normalizeBaseUrl(env.CRAWLER_GATEWAY_URL)
  if (!baseUrl) return null
  return {
    mode: 'external',
    baseUrl,
    token: env.CRAWLER_GATEWAY_TOKEN?.trim() || null,
    timeoutMs: boundedTimeout(
      env.CRAWLER_GATEWAY_TIMEOUT_MS,
      DEFAULT_SEARCH_TIMEOUT_MS,
    ),
  }
}

export function crawlerSearchRuntime(env = process.env) {
  const external = crawlerGatewayConfig(env)
  if (external) return { available: true, mode: 'external', provider: 'crawler-gateway' }
  if (embeddedCrawlerEnabled(env)) {
    return { available: true, mode: 'embedded', provider: 'embedded-html-crawler' }
  }
  return { available: false, mode: 'disabled', provider: null }
}

function crawlerContentConfig(env = process.env) {
  const gateway = crawlerGatewayConfig(env)
  const explicitCrawlBase = normalizeBaseUrl(env.CRAWL4AI_BASE_URL)
  if (explicitCrawlBase || gateway?.baseUrl) {
    return {
      mode: 'external',
      baseUrl: explicitCrawlBase || gateway.baseUrl,
      token:
        env.CRAWL4AI_API_TOKEN?.trim() ||
        env.CRAWLER_GATEWAY_TOKEN?.trim() ||
        null,
      timeoutMs: boundedTimeout(
        env.CRAWL4AI_TIMEOUT_MS,
        DEFAULT_CRAWL_TIMEOUT_MS,
        20_000,
      ),
      maxResults: positiveInteger(
        env.CRAWL4AI_MAX_RESULTS,
        DEFAULT_CRAWL_MAX_RESULTS,
        12,
      ),
    }
  }
  if (!embeddedCrawlerEnabled(env)) return null
  return {
    mode: 'embedded',
    timeoutMs: boundedTimeout(
      env.EMBEDDED_CRAWLER_TIMEOUT_MS,
      DEFAULT_CRAWL_TIMEOUT_MS,
      15_000,
    ),
    maxResults: positiveInteger(
      env.EMBEDDED_CRAWLER_MAX_RESULTS,
      DEFAULT_CRAWL_MAX_RESULTS,
      10,
    ),
  }
}

function isNonPublicIpv4(hostname) {
  const parts = hostname.split('.').map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true
  }
  const [a, b, c] = parts
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  )
}

export function isAllowedPublicUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) return false
    const ipVersion = isIP(hostname)
    if (ipVersion === 4 && isNonPublicIpv4(hostname)) return false
    if (
      ipVersion === 6 &&
      (hostname === '::1' ||
        hostname.startsWith('fc') ||
        hostname.startsWith('fd') ||
        hostname.startsWith('fe80:'))
    ) return false
    return true
  } catch {
    return false
  }
}

export function isEncyclopediaUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return ENCYCLOPEDIA_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return true
  }
}

export function compactCrawlerText(value, maxLength = 20_000) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resultContent(result) {
  const metadata = record(result?.metadata)
  return compactCrawlerText(
    result?.content ??
      result?.text ??
      result?.markdown ??
      metadata?.content ??
      '',
  )
}

function normalizeGatewayResult(value) {
  const result = record(value)
  if (!result) return null
  const url = stringValue(result.url) || stringValue(result.sourceUrl)
  if (!url || !isAllowedPublicUrl(url) || isEncyclopediaUrl(url)) return null
  const metadata = record(result.metadata) ?? {}
  const content = resultContent(result)
  const provider =
    stringValue(metadata.searchEngine) ||
    stringValue(result.provider) ||
    'crawler-mcp'
  return {
    ...result,
    url: new URL(url).toString(),
    title:
      stringValue(result.title) ||
      stringValue(result.customerName) ||
      new URL(url).hostname.replace(/^www\./, ''),
    summary:
      stringValue(result.summary) ||
      stringValue(result.snippet) ||
      content ||
      stringValue(result.title) ||
      url,
    provider,
    metadata,
    ...(content
      ? {
          crawlStatus: 'ENRICHED',
          crawlProvider: 'crawler-gateway',
          crawlContent: content,
        }
      : {}),
  }
}

async function fetchJson(fetcher, url, init, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('crawler-timeout'), timeoutMs)
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new Error(`crawler gateway returned HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchCrawlerGateway({
  keyword,
  platforms = ['Website'],
  regions = [],
  maxResults = 10,
  env = process.env,
  fetcher = fetch,
}) {
  const config = crawlerGatewayConfig(env)
  if (!config) {
    if (!embeddedCrawlerEnabled(env)) {
      return { configured: false, provider: 'crawler-gateway', results: [] }
    }
    const rawResults = await searchEmbeddedHtml({
      keyword,
      regions,
      maxResults: positiveInteger(maxResults, 10, 50),
      fetcher,
    })
    return {
      configured: true,
      provider: 'crawler-gateway',
      results: rawResults.map(normalizeGatewayResult).filter(Boolean),
    }
  }

  const payload = await fetchJson(
    fetcher,
    `${config.baseUrl}/search`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      body: JSON.stringify({
        keyword: String(keyword ?? '').trim(),
        platforms: Array.isArray(platforms) ? platforms : [],
        regions: Array.isArray(regions) ? regions : [],
        maxResults: positiveInteger(maxResults, 10, 50),
      }),
    },
    config.timeoutMs,
  )

  const root = record(payload)
  const rawResults = Array.isArray(root?.results) ? root.results : []
  return {
    configured: true,
    provider: 'crawler-gateway',
    results: rawResults.map(normalizeGatewayResult).filter(Boolean),
  }
}

function readCrawlContent(payload, requestedUrl) {
  const root = record(payload)
  const first = record(Array.isArray(root?.results) ? root.results[0] : null)
  if (root?.success !== true || first?.success !== true) return null
  const metadata = record(first.metadata) ?? {}
  const markdown =
    typeof first.markdown === 'string'
      ? first.markdown
      : record(first.markdown)?.fit_markdown ??
        record(first.markdown)?.raw_markdown ??
        record(first.markdown)?.markdown
  const content = compactCrawlerText(markdown || first.html || first.text || '')
  if (!content) return null
  const url = stringValue(first.url) || requestedUrl
  if (!isAllowedPublicUrl(url) || isEncyclopediaUrl(url)) return null
  return {
    url,
    title: stringValue(metadata.title),
    content,
    metadata,
    statusCode:
      typeof first.status_code === 'number' && Number.isFinite(first.status_code)
        ? first.status_code
        : null,
  }
}

async function crawlOne(result, config, fetcher) {
  if (result.crawlStatus === 'ENRICHED') return result
  const url = stringValue(result.url)
  if (!url || !isAllowedPublicUrl(url) || isEncyclopediaUrl(url)) {
    return { ...result, crawlStatus: 'SKIPPED', crawlReason: 'UNSAFE_OR_ENCYCLOPEDIA_URL' }
  }

  try {
    if (config.mode === 'embedded') {
      const crawled = await crawlEmbeddedPage(url, {
        fetcher,
        timeoutMs: config.timeoutMs,
        allowUrl: (candidate) => isAllowedPublicUrl(candidate) && !isEncyclopediaUrl(candidate),
      })
      return {
        ...result,
        url: crawled.url,
        title: crawled.title || result.title,
        crawlStatus: 'ENRICHED',
        crawlProvider: 'embedded-html-crawler',
        crawlContent: crawled.content,
        crawlMetadata: crawled.metadata,
        crawlStatusCode: crawled.statusCode,
      }
    }

    const payload = await fetchJson(
      fetcher,
      `${config.baseUrl}/crawl`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        },
        body: JSON.stringify({ urls: [url] }),
      },
      config.timeoutMs,
    )
    const crawled = readCrawlContent(payload, url)
    if (!crawled) {
      return { ...result, crawlStatus: 'FAILED', crawlProvider: 'crawl4ai' }
    }
    return {
      ...result,
      url: crawled.url,
      title: crawled.title || result.title,
      crawlStatus: 'ENRICHED',
      crawlProvider: 'crawl4ai',
      crawlContent: crawled.content,
      crawlMetadata: crawled.metadata,
      crawlStatusCode: crawled.statusCode,
    }
  } catch (error) {
    return {
      ...result,
      crawlStatus: 'FAILED',
      crawlProvider: config.mode === 'embedded' ? 'embedded-html-crawler' : 'crawl4ai',
      crawlError: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function enrichCrawlerResults(
  results,
  { env = process.env, fetcher = fetch } = {},
) {
  const config = crawlerContentConfig(env)
  if (!config) return results
  return Promise.all(
    results.map((result, index) =>
      index < config.maxResults ? crawlOne(result, config, fetcher) : result,
    ),
  )
}
