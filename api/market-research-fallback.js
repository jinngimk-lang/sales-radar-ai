import {
  enrichCrawlerResults,
  searchCrawlerGateway,
} from './crawler-gateway-client.js'

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
  FIND_BUYERS:
    'buyer procurement purchasing sourcing RFQ RFP tender demand importer customer project 求购 采购 询价 招标 买家',
  FIND_SUPPLIERS:
    'supplier manufacturer vendor factory sourcing quotation supply 供应商 制造商 厂家 供货',
  FIND_PARTNERS:
    'partner distributor reseller channel dealer strategic partnership collaboration 渠道 合作 经销商 代理商',
  FIND_DISTRIBUTORS:
    'distributor reseller channel dealer importer wholesaler distribution 经销商 代理商 进口商 批发商',
  RESEARCH_COMPETITORS:
    'competitor manufacturer distributor customer supplier project procurement product launch',
  EXPLORE_MARKET:
    'buyer supplier procurement sourcing distributor importer project demand quotation',
}

const FOCUS_TERMS = {
  ALL: 'procurement sourcing supplier buyer project RFQ quotation expansion',
  FACTORY_EXPANSION:
    'factory expansion new plant capacity production line procurement equipment supplier',
  INVESTMENT:
    'investment capital expenditure acquisition project procurement supplier',
  DIGITAL_TRANSFORMATION:
    'digital transformation automation ERP MES AI upgrade procurement vendor',
  HIRING_SIGNAL:
    'hiring procurement supply chain sourcing buyer purchasing jobs',
  POLICY_CHANGE:
    'policy regulation compliance procurement tender supplier requirement',
  INDUSTRY_TREND:
    'buyer demand supplier capacity procurement sourcing distribution',
}

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner|customer project)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu

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

function compact(value, maxLength = 2_000) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
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

function sourceType(url, title) {
  const value = `${url} ${title}`.toLowerCase()
  if (/career|jobs?|hiring|recruit/.test(value)) return 'jobs'
  if (/invest|funding|financ|acquisition|capital|venture/.test(value)) {
    return 'investment'
  }
  if (
    /news|press|announcement|article|media|rfq|rfp|tender|procurement|purchasing|sourcing|bid/.test(
      value,
    )
  ) {
    return 'news'
  }
  if (/policy|regulation|government|industry|market|report|research/.test(value)) {
    return 'industry'
  }
  return 'company'
}

function resultText(result) {
  const crawled = compact(result?.crawlContent)
  if (crawled) return crawled
  const content = compact(result?.content)
  if (content) return content
  const direct = compact(result?.text)
  if (direct) return direct
  const summary = compact(result?.summary)
  if (summary) return summary
  return compact(result?.title)
}

function commercialScore(result) {
  const url = safeUrl(result?.url)
  if (!url) return -100
  const title = compact(result?.title, 500)
  const evidence = resultText(result)
  const combined = `${title} ${evidence} ${url}`
  let score = 0
  if (STRONG_COMMERCIAL_PATTERN.test(combined)) score += 4
  if (TRANSACTION_PATH_PATTERN.test(url)) score += 3
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

function selectSources(results, accessedAt) {
  return results
    .map((result, originalIndex) => ({
      result,
      originalIndex,
      score: commercialScore(result),
    }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .slice(0, MAX_SOURCES)
    .map(({ result }, index) => makeSource(result, index, accessedAt))
    .filter(Boolean)
}

async function runCrawlerResearch(target, env, fetcher, accessedAt) {
  const query = buildResearchQuery(target)

  try {
    const discovery = await searchCrawlerGateway({
      keyword: query,
      platforms: ['Website'],
      regions: target.region ? [target.region] : [],
      maxResults: MAX_SOURCES,
      env,
      fetcher,
    })

    if (!discovery.configured) {
      return {
        provider: 'crawler-gateway',
        model: 'crawler-gateway-unconfigured',
        query,
        sources: [],
      }
    }

    const enriched = await enrichCrawlerResults(discovery.results, {
      env,
      fetcher,
    })

    return {
      provider: 'crawler-gateway',
      model: enriched.some((result) => result.crawlProvider === 'crawl4ai')
        ? 'crawler-mcp-search+crawl4ai'
        : 'crawler-mcp-search',
      query,
      sources: selectSources(enriched, accessedAt),
    }
  } catch (error) {
    console.warn(
      '[market-research-fallback] crawler gateway unavailable:',
      error instanceof Error ? error.message : String(error),
    )
    return {
      provider: 'crawler-gateway',
      model: 'crawler-gateway-unavailable',
      query,
      sources: [],
    }
  }
}

function buildSummary(research) {
  if (research.sources.length === 0) {
    return 'Crawler/MCP 检索没有返回可复核的公开来源。系统不会改用百科、Exa、GDELT 或模拟数据填充结果。'
  }
  return `Crawler/MCP 返回 ${research.sources.length} 个可复核公开来源。百科类页面已在网关结果进入证据层前过滤；官网、新闻、报告、论坛、招聘、采购与 B2B 页面均可保留，商业意图只影响排序。`
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
        label: `Crawler/MCP 公开网页搜索：${research.query}`,
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
  const research = await runCrawlerResearch(
    normalized.target,
    env,
    fetcher,
    accessedAt,
  )

  const completedAt = new Date().toISOString()
  sendJson(response, 201, {
    data: buildSession(research, startedAt, completedAt),
  })
  return true
}
