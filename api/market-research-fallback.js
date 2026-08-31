import { isIP } from 'node:net'

const EXA_SEARCH_ENDPOINT = 'https://api.exa.ai/search'
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_CRAWL_TIMEOUT_MS = 5_000
const DEFAULT_CRAWL_MAX_RESULTS = 6
const MAX_SOURCES = 12

const SIGNAL_FOCUS = new Set([
  'ALL',
  'FACTORY_EXPANSION',
  'INVESTMENT',
  'DIGITAL_TRANSFORMATION',
  'HIRING_SIGNAL',
  'POLICY_CHANGE',
  'INDUSTRY_TREND',
])

const COMMERCIAL_GOALS = new Set([
  'FIND_BUYERS',
  'FIND_SUPPLIERS',
  'FIND_PARTNERS',
  'FIND_DISTRIBUTORS',
  'RESEARCH_COMPETITORS',
  'EXPLORE_MARKET',
])

const REGION_LABELS = {
  USA: 'United States',
  Europe: 'Europe',
  SoutheastAsia: 'Southeast Asia',
  China: 'China',
  MiddleEast: 'Middle East',
}

const GOAL_TERMS = {
  FIND_BUYERS: 'buyer procurement purchasing sourcing RFQ RFP tender demand importer customer project 求购 采购 询价 招标 买家',
  FIND_SUPPLIERS: 'supplier manufacturer vendor factory sourcing quotation supply 供应商 制造商 厂家 供货',
  FIND_PARTNERS: 'partner distributor reseller channel dealer strategic partnership collaboration 渠道 合作 经销商 代理商',
  FIND_DISTRIBUTORS: 'distributor reseller channel dealer importer wholesaler distribution 经销商 代理商 进口商 批发商',
  RESEARCH_COMPETITORS: 'competitor manufacturer distributor customer supplier project procurement product launch',
  EXPLORE_MARKET: 'buyer supplier procurement sourcing distributor importer project demand quotation',
}

const FOCUS_TERMS = {
  ALL: 'procurement sourcing supplier buyer project RFQ quotation expansion',
  FACTORY_EXPANSION: 'factory expansion new plant capacity production line procurement equipment supplier',
  INVESTMENT: 'investment capital expenditure acquisition project procurement supplier',
  DIGITAL_TRANSFORMATION: 'digital transformation automation ERP MES AI upgrade procurement vendor',
  HIRING_SIGNAL: 'hiring procurement supply chain sourcing buyer purchasing jobs',
  POLICY_CHANGE: 'policy regulation compliance procurement tender supplier requirement',
  INDUSTRY_TREND: 'buyer demand supplier capacity procurement sourcing distribution',
}

const LOW_VALUE_DOMAINS = [
  'wikipedia.org',
  'wikimedia.org',
  'britannica.com',
  'baike.baidu.com',
  'zhihu.com',
]

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner|customer project)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu
const GENERIC_REFERENCE_PATTERN = /\b(?:wikipedia|encyclopedia|definition|overview|what is|history of|market report|industry report)\b|百科|词条|是什么|行业报告|市场报告/iu
const GENERIC_HOME_PATTERN = /\b(?:home|homepage|about us|company profile|welcome to|official site|official website)\b|官网|官方网站|公司简介|关于我们/iu

function sendJson(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(status).json(payload)
}

function text(value, maxLength = 240) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : ''
}

function normalizeTarget(body = {}) {
  const product = text(body.product, 200)
  if (product.length < 2) {
    return {
      error: {
        code: 'MARKET_RESEARCH_PRODUCT_REQUIRED',
        message: 'product must contain at least 2 characters',
      },
    }
  }

  const signalFocus = text(body.signalFocus, 40) || 'ALL'
  if (!SIGNAL_FOCUS.has(signalFocus)) {
    return {
      error: {
        code: 'MARKET_RESEARCH_SIGNAL_FOCUS_INVALID',
        message: 'signalFocus is invalid',
      },
    }
  }

  const goal = text(body.goal, 40) || 'EXPLORE_MARKET'
  if (!COMMERCIAL_GOALS.has(goal)) {
    return {
      error: {
        code: 'MARKET_RESEARCH_GOAL_INVALID',
        message: 'goal is invalid',
      },
    }
  }

  return {
    target: {
      product,
      industry: text(body.industry, 120),
      region: text(body.region, 80),
      customerType: text(body.customerType, 80),
      goal,
      signalFocus,
    },
  }
}

function buildResearchQuery(target) {
  const region = REGION_LABELS[target.region] || target.region
  return [
    target.product,
    target.industry,
    region,
    target.customerType,
    GOAL_TERMS[target.goal],
    FOCUS_TERMS[target.signalFocus],
  ]
    .filter(Boolean)
    .join(' ')
}

function boundedTimeout(value, fallback = DEFAULT_TIMEOUT_MS, max = 20_000) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1_000) return fallback
  return Math.min(parsed, max)
}

function positiveInteger(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

async function fetchJson(fetcher, input, init, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('market-research-timeout'), timeoutMs)
  try {
    const response = await fetcher(input, {
      ...init,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`market research returned HTTP ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function compact(value, maxLength = 2_000) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function sourceType(url, title) {
  const value = `${url} ${title}`.toLowerCase()
  if (/rfq|rfp|tender|procurement|purchasing|sourcing|bid/.test(value)) return 'procurement'
  if (/supplier|vendor|manufacturer|factory|distributor|dealer|importer/.test(value)) return 'supplier'
  if (/career|jobs?|hiring|recruit/.test(value)) return 'jobs'
  if (/invest|funding|financ|acquisition|capital|venture/.test(value)) return 'investment'
  if (/news|press|announcement|article|media/.test(value)) return 'news'
  return 'commercial'
}

function resultText(result) {
  const crawled = compact(result?.crawlContent)
  if (crawled) return crawled
  const direct = compact(result?.text)
  if (direct) return direct
  const highlights = Array.isArray(result?.highlights)
    ? compact(result.highlights.filter((item) => typeof item === 'string').join(' '))
    : ''
  if (highlights) return highlights
  const summary = compact(result?.summary)
  if (summary) return summary
  return compact(result?.title)
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

function commercialScore(result) {
  const url = safeUrl(result?.url)
  if (!url || isLowValueDomain(url)) return -100
  const title = compact(result?.title, 500)
  const evidence = resultText(result)
  const combined = `${title} ${evidence} ${url}`
  let score = 0
  if (STRONG_COMMERCIAL_PATTERN.test(combined)) score += 4
  if (TRANSACTION_PATH_PATTERN.test(url)) score += 3
  if (GENERIC_REFERENCE_PATTERN.test(combined)) score -= 4
  try {
    const parsed = new URL(url)
    const homePage = parsed.pathname === '/' || parsed.pathname === ''
    if (homePage && GENERIC_HOME_PATTERN.test(combined)) score -= 3
    if (homePage && !STRONG_COMMERCIAL_PATTERN.test(combined)) score -= 2
  } catch {
    score -= 4
  }
  return score
}

function makeSource(result, index, accessedAt) {
  const normalizedUrl = safeUrl(result?.url)
  if (!normalizedUrl) return null
  const normalizedTitle = compact(result?.title, 300) || normalizedUrl
  const normalizedSummary = resultText(result) || normalizedTitle
  return {
    id: `source-${index + 1}`,
    url: normalizedUrl,
    title: normalizedTitle,
    summary: normalizedSummary,
    hostname: new URL(normalizedUrl).hostname.replace(/^www\./, ''),
    sourceType: sourceType(normalizedUrl, normalizedTitle),
    status: 'consulted',
    accessedAt,
  }
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
      timeoutMs: boundedTimeout(
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

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readText(value, keys) {
  if (!value) return null
  for (const key of keys) {
    const candidate = stringValue(value[key])
    if (candidate) return candidate
  }
  return null
}

function markdownText(value) {
  if (typeof value === 'string') return value
  return readText(record(value), ['fit_markdown', 'raw_markdown', 'markdown'])
}

async function crawlResult(result, config, fetcher) {
  const url = safeUrl(result?.url)
  if (!url || !isAllowedCrawlTarget(url)) return result
  try {
    const payload = await fetchJson(
      fetcher,
      `${config.baseUrl}/crawl`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
        },
        body: JSON.stringify({ urls: [url] }),
      },
      config.timeoutMs,
    )
    const root = record(payload)
    const first = record(Array.isArray(root?.results) ? root.results[0] : null)
    if (root?.success !== true || first?.success !== true) return result
    const content = markdownText(first.markdown) || stringValue(first.html)
    if (!content) return result
    const metadata = record(first.metadata) ?? {}
    return {
      ...result,
      url: stringValue(first.url) || url,
      title: readText(metadata, ['title']) || result.title,
      crawlContent: content.trim().slice(0, 20_000),
    }
  } catch {
    return result
  }
}

async function enrichResults(results, env, fetcher) {
  const config = crawlerConfig(env)
  if (!config) return results
  return Promise.all(
    results.map((result, index) =>
      index < config.maxResults ? crawlResult(result, config, fetcher) : result,
    ),
  )
}

function selectCommercialSources(results, accessedAt) {
  return results
    .map((result) => ({ result, score: commercialScore(result) }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCES)
    .map(({ result }, index) => makeSource(result, index, accessedAt))
    .filter(Boolean)
}

async function searchExa(target, env, fetcher, accessedAt) {
  const apiKey = env.EXA_API_KEY?.trim()
  if (!apiKey) return null
  const query = buildResearchQuery(target)
  const payload = await fetchJson(
    fetcher,
    EXA_SEARCH_ENDPOINT,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        type: 'fast',
        numResults: 12,
        moderation: true,
        contents: { highlights: true },
        excludeDomains: LOW_VALUE_DOMAINS,
      }),
    },
    boundedTimeout(env.EXA_SEARCH_TIMEOUT_MS),
  )
  const results = Array.isArray(payload?.results) ? payload.results : []
  const enriched = await enrichResults(results, env, fetcher)
  const sources = selectCommercialSources(enriched, accessedAt)
  return { provider: 'exa-web', model: 'exa-search', query, sources }
}

async function searchPublicWeb(target, env, fetcher, timeoutMs, accessedAt) {
  const query = buildResearchQuery(target)
  try {
    const url = new URL(GDELT_ENDPOINT)
    url.searchParams.set('query', query)
    url.searchParams.set('mode', 'artlist')
    url.searchParams.set('maxrecords', '20')
    url.searchParams.set('format', 'json')
    url.searchParams.set('sort', 'hybridrel')
    const payload = await fetchJson(
      fetcher,
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SalesRadarAI/0.1 (+https://sales-radar-ai.vercel.app)',
        },
      },
      timeoutMs,
    )
    const articles = Array.isArray(payload?.articles) ? payload.articles : []
    const normalized = articles.map((article) => ({
      ...article,
      summary: article?.summary || article?.snippet || article?.title,
    }))
    const enriched = await enrichResults(normalized, env, fetcher)
    const sources = selectCommercialSources(enriched, accessedAt)
    return {
      provider: 'public-web',
      model: sources.length > 0 ? 'gdelt-doc' : 'commercial-search-no-results',
      query,
      sources,
    }
  } catch (error) {
    console.warn(
      '[market-research-fallback] public commercial research unavailable:',
      error instanceof Error ? error.message : String(error),
    )
    return { provider: 'public-web', model: 'public-search-unavailable', query, sources: [] }
  }
}

function buildSummary(research) {
  if (research.sources.length === 0) {
    return '联网检索已完成，但没有找到可验证的买家、卖家、采购、供应或渠道商业信号。系统不会用百科、官网介绍页或模拟数据填充结果。'
  }
  if (research.provider === 'exa-web') {
    return `Exa 发现并筛选出 ${research.sources.length} 个真实公开商业来源；配置 Crawl4AI 时优先抓取页面正文核验。来源相关性仍不等于已确认采购意向。`
  }
  return `公开网页检索返回 ${research.sources.length} 个可复核商业来源。结果优先采购、供应、RFQ、招标、分销等信号，不用百科或官网介绍页补数量。`
}

function buildSession(research, startedAt, completedAt) {
  return {
    id: `serverless-market-${Date.parse(completedAt) || Date.now()}`,
    status: research.sources.length > 0 ? 'completed' : 'no_results',
    provider: research.provider,
    model: research.model,
    startedAt,
    completedAt,
    summary: buildSummary(research),
    queries: [research.query],
    sources: research.sources,
    trace: [
      {
        id: 'trace-1',
        action: 'search',
        label: `商业信号搜索：${research.query}`,
        query: research.query,
        url: null,
        status: 'completed',
      },
    ],
    signals: [],
  }
}

export async function handleMarketResearchFallback(
  request,
  response,
  path,
  options = {},
) {
  if (request.method === 'GET' && path === 'market-signals') {
    sendJson(response, 200, { data: [], meta: { total: 0 } })
    return true
  }

  if (request.method !== 'POST' || path !== 'market-signals/scan') {
    return false
  }

  const normalized = normalizeTarget(request.body)
  if (normalized.error) {
    sendJson(response, 400, { error: normalized.error })
    return true
  }

  const env = options.env ?? process.env
  const fetcher = options.fetcher ?? fetch
  const startedAt = new Date().toISOString()
  const accessedAt = startedAt
  let research = null

  if (env.EXA_API_KEY?.trim()) {
    try {
      research = await searchExa(normalized.target, env, fetcher, accessedAt)
      if (research && research.sources.length === 0) research = null
    } catch (error) {
      console.warn(
        '[market-research-fallback] Exa unavailable; using commercial public fallback:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  if (!research) {
    research = await searchPublicWeb(
      normalized.target,
      env,
      fetcher,
      boundedTimeout(env.MARKET_RESEARCH_TIMEOUT_MS),
      accessedAt,
    )
  }

  const completedAt = new Date().toISOString()
  sendJson(response, 201, {
    data: buildSession(research, startedAt, completedAt),
  })
  return true
}
