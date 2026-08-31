const EXA_SEARCH_ENDPOINT = 'https://api.exa.ai/search'
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const DEFAULT_TIMEOUT_MS = 8_000
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
  FIND_BUYERS: 'buyer procurement purchasing demand customer project',
  FIND_SUPPLIERS: 'supplier manufacturer vendor sourcing supply',
  FIND_PARTNERS: 'partner strategic partnership collaboration alliance',
  FIND_DISTRIBUTORS: 'distributor reseller channel dealer distribution',
  RESEARCH_COMPETITORS: 'competitor manufacturer market share product launch',
  EXPLORE_MARKET: 'market demand growth company investment expansion',
}

const FOCUS_TERMS = {
  ALL: 'company expansion investment digital transformation hiring market change',
  FACTORY_EXPANSION: 'factory expansion new plant capacity production line',
  INVESTMENT: 'investment funding capital expenditure acquisition',
  DIGITAL_TRANSFORMATION: 'digital transformation automation ERP MES AI upgrade',
  HIRING_SIGNAL: 'hiring jobs recruitment expansion',
  POLICY_CHANGE: 'policy regulation government compliance change',
  INDUSTRY_TREND: 'industry trend market report demand growth',
}

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

function boundedTimeout(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1_000) return DEFAULT_TIMEOUT_MS
  return Math.min(parsed, 20_000)
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

function sourceType(url, title, provider) {
  const value = `${url} ${title}`.toLowerCase()
  if (/career|jobs?|hiring|recruit/.test(value)) return 'jobs'
  if (/invest|funding|financ|acquisition|capital|venture/.test(value)) return 'investment'
  if (/policy|regulat|government|\.gov\b|industry report|market report|association/.test(value)) {
    return 'industry'
  }
  if (/news|press|announcement|article|media/.test(value)) return 'news'
  if (provider === 'wikipedia-public') return 'industry'
  try {
    const parsed = new URL(url)
    if (parsed.pathname === '/' || parsed.pathname === '') return 'company'
  } catch {
    // ignored
  }
  return 'other'
}

function makeSource({ url, title, summary, provider, index, accessedAt }) {
  const normalizedUrl = safeUrl(url)
  if (!normalizedUrl) return null
  const normalizedTitle = compact(title, 300) || normalizedUrl
  const normalizedSummary = compact(summary, 2_000) || normalizedTitle
  return {
    id: `source-${index + 1}`,
    url: normalizedUrl,
    title: normalizedTitle,
    summary: normalizedSummary,
    hostname: new URL(normalizedUrl).hostname.replace(/^www\./, ''),
    sourceType: sourceType(normalizedUrl, normalizedTitle, provider),
    status: 'consulted',
    accessedAt,
  }
}

function resultText(result) {
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
        numResults: 10,
        moderation: true,
        contents: { highlights: true },
      }),
    },
    boundedTimeout(env.EXA_SEARCH_TIMEOUT_MS),
  )
  const results = Array.isArray(payload?.results) ? payload.results : []
  const sources = results
    .map((result, index) =>
      makeSource({
        url: result?.url,
        title: result?.title,
        summary: resultText(result),
        provider: 'exa-web',
        index,
        accessedAt,
      }),
    )
    .filter(Boolean)
    .slice(0, MAX_SOURCES)
  return { provider: 'exa-web', model: 'exa-search', query, sources }
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/u.test(value)
}

async function searchPublicWeb(target, fetcher, timeoutMs, accessedAt) {
  const query = buildResearchQuery(target)
  let gdeltFailure = null
  try {
    const url = new URL(GDELT_ENDPOINT)
    url.searchParams.set('query', query)
    url.searchParams.set('mode', 'artlist')
    url.searchParams.set('maxrecords', '12')
    url.searchParams.set('format', 'json')
    url.searchParams.set('sort', 'hybridrel')
    const payload = await fetchJson(fetcher, url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SalesRadarAI/0.1 (+https://sales-radar-ai.vercel.app)',
      },
    }, timeoutMs)
    const articles = Array.isArray(payload?.articles) ? payload.articles : []
    const sources = articles
      .map((article, index) =>
        makeSource({
          url: article?.url,
          title: article?.title,
          summary: article?.summary || article?.title,
          provider: 'gdelt-public',
          index,
          accessedAt,
        }),
      )
      .filter(Boolean)
      .slice(0, MAX_SOURCES)
    if (sources.length > 0) {
      return { provider: 'public-web', model: 'gdelt-doc', query, sources }
    }
  } catch (error) {
    gdeltFailure = error
  }

  try {
    const wikiHost = containsCjk(target.product)
      ? 'https://zh.wikipedia.org/w/api.php'
      : 'https://en.wikipedia.org/w/api.php'
    const url = new URL(wikiHost)
    url.searchParams.set('action', 'query')
    url.searchParams.set('list', 'search')
    url.searchParams.set('srsearch', target.product)
    url.searchParams.set('utf8', '1')
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    url.searchParams.set('srlimit', '10')
    const payload = await fetchJson(fetcher, url, {}, timeoutMs)
    const items = Array.isArray(payload?.query?.search) ? payload.query.search : []
    const base = containsCjk(target.product)
      ? 'https://zh.wikipedia.org/'
      : 'https://en.wikipedia.org/'
    const sources = items
      .map((item, index) =>
        makeSource({
          url: `${base}?curid=${encodeURIComponent(String(item?.pageid ?? ''))}`,
          title: item?.title,
          summary: item?.snippet || item?.title,
          provider: 'wikipedia-public',
          index,
          accessedAt,
        }),
      )
      .filter(Boolean)
      .slice(0, MAX_SOURCES)
    return { provider: 'public-web', model: 'wikipedia-search', query, sources }
  } catch (wikiFailure) {
    console.warn(
      '[market-research-fallback] public research sources unavailable:',
      gdeltFailure instanceof Error ? gdeltFailure.message : String(gdeltFailure ?? ''),
      wikiFailure instanceof Error ? wikiFailure.message : String(wikiFailure),
    )
    return { provider: 'public-web', model: 'public-search-unavailable', query, sources: [] }
  }
}

function buildSummary(research) {
  if (research.sources.length === 0) {
    return '联网检索已完成，但没有找到可验证的相关来源。系统没有用模拟网页或虚构市场信号替代结果。'
  }
  if (research.provider === 'exa-web') {
    return `Exa 返回 ${research.sources.length} 个真实公开来源。页面展示的是来源证据与摘录，不代表已经确认采购意向。`
  }
  return `公开网页检索返回 ${research.sources.length} 个可复核来源。当前未使用付费搜索密钥，页面只展示来源事实，不把相关性当成采购确认。`
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
        label: `搜索：${research.query}`,
        query: research.query,
        url: null,
        status: 'completed',
      },
    ],
    // The stateless runtime deliberately does not claim persistence. Market
    // signals remain empty until a persistent backend/database is available.
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
        '[market-research-fallback] Exa unavailable; using public fallback:',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  if (!research) {
    research = await searchPublicWeb(
      normalized.target,
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
