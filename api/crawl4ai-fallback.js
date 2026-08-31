import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

const TASK_PREFIX = 'sf1_'
const TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const SEARCH_TIMEOUT_MS = 8_000
const DEFAULT_CRAWL_TIMEOUT_MS = 5_000
const DEFAULT_CRAWL_MAX_RESULTS = 5

const COMMERCIAL_QUERY_TERMS = [
  'buyer',
  'procurement',
  'purchasing',
  'sourcing',
  'RFQ',
  'RFP',
  'tender',
  'supplier',
  'manufacturer',
  'distributor',
  'importer',
  'wholesaler',
  '采购',
  '求购',
  '询价',
  '招标',
  '买家',
  '供应商',
  '经销商',
].join(' ')

const LOW_VALUE_DOMAINS = [
  'wikipedia.org',
  'wikimedia.org',
  'britannica.com',
  'baike.baidu.com',
  'zhihu.com',
]

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu
const GENERIC_REFERENCE_PATTERN = /\b(?:wikipedia|encyclopedia|definition|overview|what is|history of|market report|industry report|market update)\b|百科|词条|是什么|行业报告|市场报告|市场概况/iu
const GENERIC_HOME_PATTERN = /\b(?:home|homepage|about us|company profile|welcome to|official site|official website)\b|官网|官方网站|公司简介|关于我们/iu

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
    ) return false
    const ipVersion = isIP(hostname)
    if (ipVersion === 4 && isPrivateIpv4(hostname)) return false
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
    if (!response.ok) throw new Error(`request returned HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function buildCommercialQuery(task) {
  return `${task.k.trim()} ${COMMERCIAL_QUERY_TERMS}`.trim()
}

async function searchGdelt(task, fetcher) {
  const url = new URL(GDELT_ENDPOINT)
  url.searchParams.set('query', buildCommercialQuery(task))
  url.searchParams.set('mode', 'artlist')
  url.searchParams.set('maxrecords', String(Math.min(50, Math.max(task.m * 3, 10))))
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
    .map((article) => ({ ...article, provider: 'gdelt-doc' }))
}

async function searchPublicWeb(task, fetcher) {
  return searchGdelt(task, fetcher)
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
      url: crawled.url,
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

function compactEvidence(article, title) {
  const value = article.crawlContent || article.summary || article.snippet || title
  return String(value)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1_500)
}

function isLowValueDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return LOW_VALUE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return true
  }
}

function commercialScore(article) {
  const url = String(article.url ?? '')
  if (!url || isLowValueDomain(url)) return -100
  const title = String(article.title ?? '').trim()
  const evidence = compactEvidence(article, title)
  const text = `${title} ${evidence} ${url}`
  let score = 0
  if (STRONG_COMMERCIAL_PATTERN.test(text)) score += 4
  if (TRANSACTION_PATH_PATTERN.test(url)) score += 3
  if (GENERIC_REFERENCE_PATTERN.test(text)) score -= 4
  try {
    const parsed = new URL(url)
    const homePage = parsed.pathname === '/' || parsed.pathname === ''
    if (homePage && GENERIC_HOME_PATTERN.test(text)) score -= 3
    if (homePage && !STRONG_COMMERCIAL_PATTERN.test(text)) score -= 2
  } catch {
    score -= 4
  }
  return score
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

function buildLead(article, index, task) {
  const url = String(article.url ?? '')
  const title = String(article.title ?? '').trim() || url
  const domain = safeDomain(article.domain, url)
  const sourceCountry = String(article.sourcecountry ?? article.sourceCountry ?? '').trim()
  const language = String(article.language ?? 'Unknown').trim()
  const publishedAt = parseSeenDate(article.seendate ?? article.publishedAt)
  const tags = keywordTags(task.k)
  const id = `fallback_${createHash('sha256').update(url || `${title}:${index}`).digest('hex').slice(0, 20)}`
  const enriched = article.crawlStatus === 'ENRICHED'
  const evidence = compactEvidence(article, title)
  const intent = commercialScore(article)
  const intentScore = Math.min(95, Math.max(55, 66 + intent * 4 - index * 2))

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
    intentScore,
    recommendedAction: intent >= 4 ? 'research-contact' : 'monitor',
    updatedAt: new Date().toISOString(),
    sourceMetadata: {
      provider: article.provider ?? 'gdelt-doc',
      leadType: 'commercial-page',
      evidenceKind: enriched ? 'crawl4ai-commercial-web-content' : 'commercial-public-web-article',
      sourceCountry: sourceCountry || null,
      language,
      commercialIntent: intent >= 4 ? 'high' : 'medium',
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
      intentType: '买家/卖家商业信号',
      intentScore,
      tags,
      suggestion: '优先核验采购、供应、RFQ、招标、分销或寻源主体，再进入联系人研究。',
      background: enriched
        ? `公开检索发现候选页，并由 Crawl4AI 抓取正文后通过商业意图筛选（${domain}）。`
        : `公开来源包含商业意图信号（${domain}）；正文抓取失败或未覆盖，因此证据状态保持 UNKNOWN。`,
      need: evidence || '发现与采购、供货、分销或寻源相关的公开商业信号。',
      purchaseProbability: intent >= 4 ? 'medium' : 'low',
      salesStrategy: '只围绕真实交易意图继续研究，不把百科、官网介绍或泛资料页当作线索。',
      reasoning: enriched
        ? '网页正文已抓取并通过商业意图规则；仍需进一步验证主体和需求真实性。'
        : '公开摘要通过商业意图规则，但尚无成功正文抓取，因此不升级为已确认采购事实。',
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
    const rankedArticles = enrichedArticles
      .map((article) => ({ article, score: commercialScore(article) }))
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, task.m)
      .map(({ article }) => article)
    if (rankedArticles.length === 0) return false
    const results = rankedArticles.map((article, index) =>
      buildLead(article, index, task),
    )
    sendJson(response, 200, { data: results, meta: { total: results.length } })
    return true
  } catch (error) {
    console.warn(
      '[crawl4ai-fallback] commercial public-web search failed; yielding to next fallback:',
      error instanceof Error ? error.message : String(error),
    )
    return false
  }
}
