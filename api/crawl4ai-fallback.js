import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

const TASK_PREFIX = 'sf1_'
const TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const WIKIPEDIA_ENDPOINT = 'https://en.wikipedia.org/w/api.php'
const SEARCH_TIMEOUT_MS = 8_000
const DEFAULT_CRAWL_TIMEOUT_MS = 5_000
const DEFAULT_CRAWL_MAX_RESULTS = 5

function sendJson(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(status).json(payload)
}

function readStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string')
    : []
}

export function decodeFallbackTask(taskId) {
  if (typeof taskId !== 'string' || !taskId.startsWith(TASK_PREFIX)) return null
  try {
    const decoded = JSON.parse(
      Buffer.from(taskId.slice(TASK_PREFIX.length), 'base64url').toString('utf8'),
    )
    if (
      decoded?.v !== 1 ||
      typeof decoded.k !== 'string' ||
      !decoded.k.trim() ||
      !Number.isInteger(decoded.m) ||
      decoded.m < 1 ||
      decoded.m > 50 ||
      typeof decoded.t !== 'number' ||
      Date.now() - decoded.t > TASK_TTL_MS ||
      decoded.t - Date.now() > 60_000
    ) {
      return null
    }
    decoded.p = readStringArray(decoded.p)
    decoded.r = readStringArray(decoded.r)
    return decoded
  } catch {
    return null
  }
}

function readResultTaskId(path) {
  const match = path.match(/^search-task\/([^/]+)\/results$/)
  return match ? decodeURIComponent(match[1]) : null
}

function positiveInteger(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function crawlerConfig(env) {
  const rawBaseUrl = env.CRAWL4AI_BASE_URL?.trim()
  if (!rawBaseUrl) return null
  try {
    const url = new URL(rawBaseUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return {
      baseUrl: url.toString().replace(/\/+$/, ''),
      apiToken: env.CRAWL4AI_API_TOKEN?.trim() || null,
      timeoutMs: positiveInteger(
        env.CRAWL4AI_TIMEOUT_MS,
        DEFAULT_CRAWL_TIMEOUT_MS,
        15_000,
      ),
      maxResults: positiveInteger(
        env.CRAWL4AI_MAX_RESULTS,
        DEFAULT_CRAWL_MAX_RESULTS,
        10,
      ),
    }
  } catch {
    return null
  }
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function isAllowedCrawlTarget(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return false
    }
    const ipVersion = isIP(hostname)
    if (ipVersion === 4 && isPrivateIpv4(hostname)) return false
    if (ipVersion === 6 && (
      hostname === '::1' ||
      hostname.startsWith('fc') ||
      hostname.startsWith('fd') ||
      hostname.startsWith('fe80:')
    )) {
      return false
    }
    return true
  } catch {
    return false
  }
}

async function fetchJson(url, fetcher, timeoutMs = SEARCH_TIMEOUT_MS, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('request-timeout'), timeoutMs)
  try {
    const response = await fetcher(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SalesRadarAI/0.1 (+https://sales-radar-ai.vercel.app)',
        ...init.headers,
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`request returned HTTP ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function searchGdelt(task, fetcher) {
  const url = new URL(GDELT_ENDPOINT)
  url.searchParams.set('query', task.k)
  url.searchParams.set('mode', 'artlist')
  url.searchParams.set('maxrecords', String(Math.min(50, Math.max(task.m, 5))))
  url.searchParams.set('format', 'json')
  url.searchParams.set('sort', 'hybridrel')
  const payload = await fetchJson(url, fetcher)
  const articles = Array.isArray(payload?.articles) ? payload.articles : []
  return articles
    .filter(
      (article) =>
        article &&
        typeof article.url === 'string' &&
        article.url &&
        typeof article.title === 'string' &&
        article.title.trim(),
    )
    .slice(0, task.m)
    .map((article) => ({ ...article, provider: 'gdelt-doc' }))
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchWikipedia(task, fetcher) {
  const url = new URL(WIKIPEDIA_ENDPOINT)
  url.searchParams.set('action', 'query')
  url.searchParams.set('list', 'search')
  url.searchParams.set('srsearch', task.k)
  url.searchParams.set('utf8', '1')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('srlimit', String(Math.min(task.m, 20)))
  const payload = await fetchJson(url, fetcher)
  const results = Array.isArray(payload?.query?.search) ? payload.query.search : []
  return results.slice(0, task.m).map((item) => ({
    provider: 'wikipedia-search',
    url: `https://en.wikipedia.org/?curid=${encodeURIComponent(String(item.pageid ?? ''))}`,
    title: stripHtml(item.title),
    domain: 'en.wikipedia.org',
    seendate: item.timestamp ?? null,
    sourcecountry: 'Unknown',
    language: 'English',
    snippet: stripHtml(item.snippet),
  }))
}

async function searchPublicWeb(task, fetcher) {
  let firstError = null
  try {
    const articles = await searchGdelt(task, fetcher)
    if (articles.length > 0) return articles
  } catch (error) {
    firstError = error
  }

  try {
    const articles = await searchWikipedia(task, fetcher)
    if (articles.length > 0) return articles
  } catch (error) {
    if (!firstError) firstError = error
  }

  if (firstError) throw firstError
  return []
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readText(value, keys) {
  if (!value) return null
  for (const key of keys) {
    const text = stringValue(value[key])
    if (text) return text
  }
  return null
}

function markdownText(value) {
  if (typeof value === 'string') return value
  return readText(record(value), ['fit_markdown', 'raw_markdown', 'markdown'])
}

function parseCrawlPayload(payload, requestedUrl) {
  const root = record(payload)
  const results = Array.isArray(root?.results) ? root.results : []
  const first = record(results[0])
  if (root?.success !== true || first?.success !== true) {
    throw new Error('Crawl4AI returned an unsuccessful result')
  }
  const content = markdownText(first.markdown) || stringValue(first.html)
  if (!content) throw new Error('Crawl4AI returned no usable content')
  const normalized = content.trim().slice(0, 20_000)
  const metadata = record(first.metadata) ?? {}
  return {
    url: stringValue(first.url) ?? requestedUrl,
    title: readText(metadata, ['title']),
    content: normalized,
    metadata,
    statusCode:
      typeof first.status_code === 'number' && Number.isFinite(first.status_code)
        ? first.status_code
        : null,
    contentHash: createHash('sha256').update(normalized).digest('hex'),
  }
}

async function crawlArticle(article, config, fetcher) {
  const url = String(article.url ?? '')
  if (!isAllowedCrawlTarget(url)) {
    return {
      ...article,
      crawlStatus: 'SKIPPED',
      crawlReason: 'UNSAFE_OR_INVALID_URL',
    }
  }

  try {
    const payload = await fetchJson(
      `${config.baseUrl}/crawl`,
      fetcher,
      config.timeoutMs,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiToken
            ? { Authorization: `Bearer ${config.apiToken}` }
            : {}),
        },
        body: JSON.stringify({ urls: [url] }),
      },
    )
    const crawled = parseCrawlPayload(payload, url)
    return {
      ...article,
      title: crawled.title || article.title,
      crawlStatus: 'ENRICHED',
      crawlContent: crawled.content,
      crawlMetadata: crawled.metadata,
      crawlStatusCode: crawled.statusCode,
      crawlContentHash: crawled.contentHash,
    }
  } catch (error) {
    return {
      ...article,
      crawlStatus: 'FAILED',
      crawlError: error instanceof Error ? error.message : String(error),
    }
  }
}

async function enrichArticles(articles, config, fetcher) {
  return Promise.all(
    articles.map((article, index) => {
      if (index >= config.maxResults) {
        return Promise.resolve({
          ...article,
          crawlStatus: 'SKIPPED',
          crawlReason: 'CRAWL_LIMIT',
        })
      }
      return crawlArticle(article, config, fetcher)
    }),
  )
}

function inferIndustry(keyword) {
  const value = keyword.toLowerCase()
  if (/medical|health|hospital|pharma|biotech/.test(value)) return 'MedicalHealth'
  if (/software|saas|cloud|cyber|\bai\b|artificial intelligence/.test(value)) return 'SaaSSoftware'
  if (/electronic|semiconductor|chip|device|hardware/.test(value)) return 'ConsumerElectronics'
  if (/beauty|cosmetic|skincare|makeup/.test(value)) return 'BeautyIndustry'
  if (/trade|export|import|logistics|freight|shipping/.test(value)) return 'TradeExport'
  return 'IndustrialManufacturing'
}

function inferRegion(task, sourceCountry = '') {
  if (task.r[0]) return task.r[0]
  const country = sourceCountry.toLowerCase()
  if (/china|hong kong|taiwan/.test(country)) return 'China'
  if (/singapore|thailand|vietnam|malaysia|indonesia|philippines|cambodia|laos|myanmar|brunei/.test(country)) return 'SoutheastAsia'
  if (/united states|usa|america/.test(country)) return 'USA'
  if (/saudi|emirates|uae|qatar|oman|bahrain|kuwait|israel|jordan/.test(country)) return 'MiddleEast'
  if (/france|germany|italy|spain|uk|united kingdom|netherlands|belgium|sweden|norway|denmark|finland|poland|austria|switzerland|ireland|portugal/.test(country)) return 'Europe'
  return 'USA'
}

function keywordTags(keyword) {
  return [
    ...new Set(
      keyword
        .split(/[^\p{L}\p{N}]+/u)
        .map((item) => item.trim())
        .filter((item) => item.length > 2),
    ),
  ].slice(0, 8)
}

function parseSeenDate(value) {
  if (typeof value !== 'string' || !value) return null
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/)
  if (!compact) {
    const parsed = new Date(value)
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
  }
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = compact
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function safeDomain(value, url) {
  if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase()
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return 'public-web'
  }
}

function homeUrl(url) {
  try {
    return new URL('/', url).toString()
  } catch {
    return url
  }
}

function compactEvidence(article, title) {
  const value = article.crawlContent || article.snippet || title
  return String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1_500)
}

function buildLead(article, index, task) {
  const url = String(article.url ?? '')
  const title = String(article.title ?? '').trim() || url
  const domain = safeDomain(article.domain, url)
  const sourceCountry = String(article.sourcecountry ?? article.sourceCountry ?? '').trim()
  const language = String(article.language ?? 'Unknown').trim()
  const publishedAt = parseSeenDate(article.seendate ?? article.publishedAt)
  const tags = keywordTags(task.k)
  const id = `fallback_${createHash('sha256').update(url || `${title}:${index}`).digest('hex').slice(0, 20)}`
  const neutralScore = Math.max(30, 45 - index * 2)
  const enriched = article.crawlStatus === 'ENRICHED'
  const evidence = compactEvidence(article, title)

  return {
    id,
    username: domain,
    displayName: title.slice(0, 180),
    avatarUrl:
      typeof article.socialimage === 'string' && /^https?:\/\//i.test(article.socialimage)
        ? article.socialimage
        : null,
    initials: domain.replace(/^www\./, '').slice(0, 2).toUpperCase() || 'WE',
    platform: 'Website',
    customerType: 'Company',
    postContent: evidence || title,
    postedAt: publishedAt,
    country: sourceCountry || 'Unknown',
    region: inferRegion(task, sourceCountry),
    industry: inferIndustry(task.k),
    jobTitle: null,
    company: null,
    sourceUrl: url,
    profileUrl: homeUrl(url),
    interestTags: tags,
    intentScore: neutralScore,
    recommendedAction: 'monitor',
    updatedAt: new Date().toISOString(),
    sourceMetadata: {
      provider: article.provider ?? 'gdelt-doc',
      leadType: 'content',
      evidenceKind: enriched ? 'crawl4ai-public-web-content' : 'public-web-article',
      sourceCountry: sourceCountry || null,
      language,
      commercialIntent: 'unverified',
      fallbackRuntime: true,
      contentAcquisition: article.crawlStatus ?? 'SKIPPED',
      contentAcquisitionProvider: 'crawl4ai',
      contentAcquisitionReason: article.crawlReason ?? null,
      contentHash: article.crawlContentHash ?? null,
      crawlStatusCode: article.crawlStatusCode ?? null,
    },
    identityStatus: 'UNVERIFIED',
    evidenceStatus: enriched ? 'VALID' : 'UNKNOWN',
    analysis: {
      id: `${id}_analysis`,
      intentType: enriched ? '公开网页正文信号' : '公开市场信号',
      intentScore: neutralScore,
      tags,
      suggestion: '先核验来源中涉及的商业主体、角色和实际需求，再决定是否联系。',
      background: enriched
        ? `该结果由公开检索发现，并由 Crawl4AI 抓取网页正文作为证据（${domain}）。`
        : `该结果来自公开网页证据（${domain}）；正文抓取未完成，因此不把标题相关性当作采购意图。`,
      need: evidence || '公开来源与搜索关键词相关，但不能单凭该来源确认采购需求。',
      purchaseProbability: 'low',
      salesStrategy: '先完成实体与需求核验，再进行任何销售触达。',
      reasoning: enriched
        ? '已取得网页正文，但评分仍只表示查询相关性；购买意向需要进一步验证。'
        : '当前评分仅表示公开内容与查询的相关性，不代表已确认的购买意向。',
      needKeywords: tags,
      recommendedScript: null,
      contactAdvice: null,
    },
    contacts: [],
  }
}

export async function handleCrawlerSearchResults(
  request,
  response,
  path,
  options = {},
) {
  if (request.method !== 'GET') return false
  const taskId = readResultTaskId(path)
  if (!taskId) return false

  const env = options.env ?? process.env
  const config = crawlerConfig(env)
  if (!config) return false

  const task = decodeFallbackTask(taskId)
  if (!task) {
    sendJson(response, 404, {
      error: {
        code: 'SEARCH_TASK_NOT_FOUND',
        message: 'Search task not found or expired.',
      },
    })
    return true
  }

  const fetcher = options.fetcher ?? fetch
  try {
    const articles = await searchPublicWeb(task, fetcher)
    const enrichedArticles = await enrichArticles(articles, config, fetcher)
    const results = enrichedArticles.map((article, index) =>
      buildLead(article, index, task),
    )
    sendJson(response, 200, { data: results, meta: { total: results.length } })
  } catch (error) {
    sendJson(response, 503, {
      error: {
        code: 'SEARCH_PROVIDER_UNAVAILABLE',
        message:
          error instanceof Error
            ? error.message
            : 'Public web evidence search failed.',
        provider: 'public-web-evidence+crawl4ai',
        providerState: 'UNAVAILABLE',
        retryable: true,
      },
    })
  }
  return true
}
