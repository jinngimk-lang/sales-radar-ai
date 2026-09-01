import { createHash } from 'node:crypto'

const TASK_PREFIX = 'sf1_'
const TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const SEARCH_TIMEOUT_MS = 8_000
const ENCYCLOPEDIA_DOMAINS = [
  'wikipedia.org',
  'wikidata.org',
  'britannica.com',
  'baike.baidu.com',
  'baike.com',
]
const SUPPORTED_PLATFORMS = new Set([
  'Website',
  'Reddit',
  'X',
  'Instagram',
  'Facebook',
  'TikTok',
  'LinkedIn',
  'Xiaohongshu',
  'YouTube',
])
const SUPPORTED_REGIONS = new Set([
  'USA',
  'Europe',
  'SoutheastAsia',
  'China',
  'MiddleEast',
])

function sendJson(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(status).json(payload)
}

function clampResultLimit(value) {
  if (value === undefined || value === null || value === '') return 10
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) return null
  return parsed
}

function readStringArray(value, allowed) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && allowed.has(item))
}

function sanitizeTaskInput(body = {}) {
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : ''
  const maxResults = clampResultLimit(body.maxResults)
  if (!keyword || maxResults === null) return null

  return {
    v: 1,
    k: keyword.slice(0, 500),
    p: readStringArray(body.platforms, SUPPORTED_PLATFORMS),
    r: readStringArray(body.regions, SUPPORTED_REGIONS),
    m: maxResults,
    t: Date.now(),
  }
}

function encodeTask(task) {
  return `${TASK_PREFIX}${Buffer.from(JSON.stringify(task)).toString('base64url')}`
}

function decodeTask(taskId) {
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
    decoded.p = readStringArray(decoded.p, SUPPORTED_PLATFORMS)
    decoded.r = readStringArray(decoded.r, SUPPORTED_REGIONS)
    return decoded
  } catch {
    return null
  }
}

function taskEnvelope(taskId, task, resultCount = 0) {
  return {
    id: taskId,
    status: 'COMPLETED',
    progress: 100,
    resultCount,
    errorCode: null,
    errorMessage: null,
  }
}

function buildStrategy(task) {
  const region = task.r[0] ?? 'Unknown'
  return {
    intent: {
      industry: 'Unknown',
      product: task.k,
      category: 'Unknown',
      region,
      country: 'Unknown',
      relationship: 'customer discovery',
      language: 'English',
      customerType: 'Company',
      businessProblem: 'Unknown',
      buyingSignals: [],
    },
    keywords: [{ language: 'English', query: task.k }],
    languages: ['English'],
    targetType: 'buyer',
    salesIntent: 'customer',
    searchDirections: ['crawler public web evidence'],
    reason:
      'Crawler gateway searches public web evidence. Commercial intent must be verified before outreach.',
  }
}

function buildPreparation(task, requestedContext) {
  const capturedAt = new Date().toISOString()
  const strategy = buildStrategy(task)
  const context =
    requestedContext && typeof requestedContext === 'object' && !Array.isArray(requestedContext)
      ? requestedContext
      : { product: task.k, region: task.r[0] }
  const productContext = {
    version: 'serverless-crawler-v2',
    capturedAt,
    source: requestedContext ? 'request' : 'inferred',
    productProfile: null,
    context,
  }
  const searchIntent = {
    version: 'serverless-crawler-v2',
    capturedAt,
    salesIntent: strategy.salesIntent,
    targetType: strategy.targetType,
    relationship: strategy.intent.relationship,
    reason: strategy.reason,
    keywords: strategy.keywords,
    languages: strategy.languages,
    searchDirections: strategy.searchDirections,
  }
  return { strategy, productContext, searchIntent }
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
  if (/singapore|thailand|vietnam|malaysia|indonesia|philippines|cambodia|laos|myanmar|brunei/.test(country)) {
    return 'SoutheastAsia'
  }
  if (/united states|usa|america/.test(country)) return 'USA'
  if (/saudi|emirates|uae|qatar|oman|bahrain|kuwait|israel|jordan/.test(country)) return 'MiddleEast'
  if (/france|germany|italy|spain|uk|united kingdom|netherlands|belgium|sweden|norway|denmark|finland|poland|austria|switzerland|ireland|portugal/.test(country)) {
    return 'Europe'
  }
  return 'USA'
}

function keywordTags(keyword) {
  return [...new Set(keyword.split(/[^\p{L}\p{N}]+/u).map((item) => item.trim()).filter((item) => item.length > 2))].slice(0, 8)
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

function isEncyclopediaUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return ENCYCLOPEDIA_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return true
  }
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
  const neutralScore = Math.max(30, 45 - index * 2)

  return {
    id,
    username: domain,
    displayName: title.slice(0, 180),
    avatarUrl: null,
    initials: domain.replace(/^www\./, '').slice(0, 2).toUpperCase() || 'WE',
    platform: 'Website',
    customerType: 'Company',
    postContent: String(article.summary ?? article.snippet ?? title).slice(0, 1_500),
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
      provider: 'crawler-gateway',
      discoveryProvider: article.provider ?? 'gdelt-doc',
      leadType: 'content',
      evidenceKind: 'public-web-article',
      sourceCountry: sourceCountry || null,
      language,
      commercialIntent: 'unverified',
      fallbackRuntime: true,
    },
    identityStatus: 'UNVERIFIED',
    evidenceStatus: 'UNKNOWN',
    analysis: {
      id: `${id}_analysis`,
      intentType: '公开市场信号',
      intentScore: neutralScore,
      tags,
      suggestion: '先核验来源中涉及的商业主体、角色和实际需求，再决定是否联系。',
      background: `该结果来自爬虫网关公开网页候选（${domain}）。`,
      need: '公开来源与搜索关键词相关，但不能单凭该来源确认采购需求。',
      purchaseProbability: 'low',
      salesStrategy: '先完成实体与需求核验，再进行任何销售触达。',
      reasoning: '该评分仅表示公开内容与查询的相关性，不代表已确认的购买意向。',
      needKeywords: tags,
      recommendedScript: null,
      contactAdvice: null,
    },
    contacts: [],
  }
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('search-timeout'), SEARCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SalesRadarAI/0.1 (+https://sales-radar-ai.vercel.app)',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`public search returned HTTP ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function searchGdelt(task) {
  const url = new URL(GDELT_ENDPOINT)
  url.searchParams.set('query', task.k)
  url.searchParams.set('mode', 'artlist')
  url.searchParams.set('maxrecords', String(Math.min(50, Math.max(task.m, 5))))
  url.searchParams.set('format', 'json')
  url.searchParams.set('sort', 'hybridrel')
  const payload = await fetchJson(url)
  const articles = Array.isArray(payload?.articles) ? payload.articles : []
  return articles
    .filter(
      (article) =>
        article &&
        typeof article.url === 'string' &&
        article.url &&
        typeof article.title === 'string' &&
        article.title.trim() &&
        !isEncyclopediaUrl(article.url),
    )
    .slice(0, task.m)
    .map((article) => ({ ...article, provider: 'gdelt-doc' }))
}

async function providerHealth() {
  const checkedAt = new Date().toISOString()
  const probe = { v: 1, k: 'business', p: ['Website'], r: [], m: 1, t: Date.now() }
  try {
    await searchGdelt(probe)
    return {
      provider: 'crawler-gateway',
      dependency: 'public-index+crawler',
      state: 'AVAILABLE',
      code: 'OK',
      message: 'Crawler gateway public discovery is reachable without Railway.',
      checkedAt,
    }
  } catch (error) {
    return {
      provider: 'crawler-gateway',
      dependency: 'public-index+crawler',
      state: 'UNAVAILABLE',
      code: 'CRAWLER_GATEWAY_UNAVAILABLE',
      message: `Crawler gateway is unavailable: ${error instanceof Error ? error.message : String(error)}`,
      checkedAt,
    }
  }
}

function runtimeCapabilities() {
  return {
    marketResearch: {
      enabled: true,
      provider: 'crawler-gateway',
      model: null,
    },
    salesAI: {
      enabled: true,
      provider: 'rule-based',
      model: 'rules-v1',
      fallback: {
        enabled: true,
        provider: 'rule-based',
        model: 'rules-v1',
        cost: 'local-zero-api-cost',
      },
    },
    salesAgent: {
      enabled: false,
      provider: null,
      model: null,
      reason: 'missing_api_key',
      models: [],
      verification: null,
    },
    agentRuntime: {
      provider: 'crawler-gateway',
      enabled: true,
      transport: 'serverless',
    },
    publicContactDiscovery: {
      enabled: false,
      provider: null,
      model: null,
    },
    salesDiscovery: {
      enabled: true,
      provider: 'crawler-gateway',
      model: null,
    },
  }
}

function readTaskId(path, suffix = '') {
  const pattern = suffix
    ? new RegExp(`^search-task/([^/]+)/${suffix}$`)
    : /^search-task\/([^/]+)$/
  const match = path.match(pattern)
  return match ? decodeURIComponent(match[1]) : null
}

function sendTaskNotFound(response) {
  sendJson(response, 404, {
    error: {
      code: 'SEARCH_TASK_NOT_FOUND',
      message: 'Search task not found or expired.',
    },
  })
}

export async function handleServerlessFallback(request, response, path) {
  if (request.method === 'GET' && path === 'health') {
    sendJson(response, 200, { status: 'ok' })
    return true
  }

  if (request.method === 'GET' && path === 'health/capabilities') {
    sendJson(response, 200, { data: runtimeCapabilities() })
    return true
  }

  if (request.method === 'GET' && path === 'search/providers/health') {
    sendJson(response, 200, { data: await providerHealth() })
    return true
  }

  if (request.method === 'POST' && path === 'search/intent') {
    const query = typeof request.body?.query === 'string' ? request.body.query.trim() : ''
    if (!query) {
      sendJson(response, 400, {
        error: { code: 'VALIDATION_ERROR', message: 'query is required' },
      })
      return true
    }
    const task = sanitizeTaskInput({ keyword: query })
    sendJson(response, 200, { data: buildStrategy(task) })
    return true
  }

  if (request.method === 'POST' && path === 'search-task') {
    const task = sanitizeTaskInput(request.body)
    if (!task) {
      sendJson(response, 400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'keyword is required and maxResults must be an integer between 1 and 50',
        },
      })
      return true
    }
    const taskId = encodeTask(task)
    const preparation = buildPreparation(task, request.body?.productContext)
    sendJson(response, 202, {
      data: taskEnvelope(taskId, task),
      ...preparation,
    })
    return true
  }

  const resultTaskId = readTaskId(path, 'results')
  if (request.method === 'GET' && resultTaskId) {
    const task = decodeTask(resultTaskId)
    if (!task) {
      sendTaskNotFound(response)
      return true
    }
    try {
      const articles = await searchGdelt(task)
      const results = articles.map((article, index) => buildLead(article, index, task))
      sendJson(response, 200, { data: results, meta: { total: results.length } })
    } catch (error) {
      sendJson(response, 503, {
        error: {
          code: 'SEARCH_PROVIDER_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Crawler gateway search failed.',
          provider: 'crawler-gateway',
          providerState: 'UNAVAILABLE',
          retryable: true,
        },
      })
    }
    return true
  }

  const opportunityTaskId = readTaskId(path, 'opportunities')
  if (request.method === 'GET' && opportunityTaskId) {
    const task = decodeTask(opportunityTaskId)
    if (!task) {
      sendTaskNotFound(response)
      return true
    }
    sendJson(response, 200, { data: [], meta: { total: 0 } })
    return true
  }

  const taskId = readTaskId(path)
  if (request.method === 'GET' && taskId) {
    const task = decodeTask(taskId)
    if (!task) {
      sendTaskNotFound(response)
      return true
    }
    sendJson(response, 200, { data: taskEnvelope(taskId, task) })
    return true
  }

  if (request.method === 'GET' && path === 'radar/assessments') {
    const requestedTaskId = Array.isArray(request.query?.searchTaskId)
      ? request.query.searchTaskId[0]
      : request.query?.searchTaskId
    if (requestedTaskId && !decodeTask(String(requestedTaskId))) {
      sendTaskNotFound(response)
      return true
    }
    sendJson(response, 200, { data: [], meta: { total: 0 } })
    return true
  }

  return false
}
