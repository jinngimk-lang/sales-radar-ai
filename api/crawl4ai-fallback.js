import { createHash } from 'node:crypto'
import {
  crawlerGatewayConfig,
  enrichCrawlerResults,
  searchCrawlerGateway,
} from './crawler-gateway-client.js'

const TASK_PREFIX = 'sf1_'
const TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu

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

function compactEvidence(result, title) {
  return String(
    result.crawlContent ||
      result.content ||
      result.summary ||
      result.snippet ||
      title,
  )
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1_500)
}

function commercialScore(result) {
  const url = String(result.url ?? '')
  const title = String(result.title ?? '').trim()
  const evidence = compactEvidence(result, title)
  const text = `${title} ${evidence} ${url}`
  let score = 0
  if (STRONG_COMMERCIAL_PATTERN.test(text)) score += 4
  if (TRANSACTION_PATH_PATTERN.test(url)) score += 3
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

function inferRegion(task, sourceCountry = '', explicitRegion = '') {
  if (task.r[0]) return task.r[0]
  if (explicitRegion) return explicitRegion
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

function buildLead(result, index, task) {
  const url = String(result.url ?? '')
  const title = String(result.title ?? '').trim() || url
  const domain = safeDomain(result.domain, url)
  const sourceCountry = String(
    result.sourcecountry ?? result.sourceCountry ?? result.country ?? '',
  ).trim()
  const explicitRegion = String(result.region ?? '').trim()
  const language = String(result.language ?? 'Unknown').trim()
  const publishedAt = parseSeenDate(result.seendate ?? result.publishedAt)
  const tags = keywordTags(task.k)
  const id = `fallback_${createHash('sha256').update(url || `${title}:${index}`).digest('hex').slice(0, 20)}`
  const enriched = result.crawlStatus === 'ENRICHED'
  const evidence = compactEvidence(result, title)
  const intent = commercialScore(result)
  const intentScore = Math.min(95, Math.max(45, 58 + intent * 4 - index * 2))
  const crawlProvider = result.crawlProvider ?? null

  return {
    id,
    username: domain,
    displayName: title.slice(0, 180),
    avatarUrl:
      typeof result.socialimage === 'string' && /^https?:\/\//i.test(result.socialimage)
        ? result.socialimage
        : null,
    initials: domain.replace(/^www\./, '').slice(0, 2).toUpperCase() || 'WE',
    platform: 'Website',
    customerType: 'Company',
    postContent: evidence || title,
    postedAt: publishedAt,
    country: sourceCountry || 'Unknown',
    region: inferRegion(task, sourceCountry, explicitRegion),
    industry: inferIndustry(task.k),
    jobTitle: null,
    company: typeof result.company === 'string' ? result.company : null,
    sourceUrl: url,
    profileUrl: homeUrl(url),
    interestTags: tags,
    intentScore,
    recommendedAction: 'monitor',
    updatedAt: new Date().toISOString(),
    sourceMetadata: {
      provider: 'crawler-gateway',
      discoveryProvider: result.provider ?? 'crawler-mcp',
      leadType: 'content',
      evidenceKind: enriched ? 'crawler-web-content' : 'crawler-search-result',
      sourceCountry: sourceCountry || null,
      language,
      commercialIntent:
        intent >= 4 ? 'high' : intent > 0 ? 'medium' : 'unverified',
      fallbackRuntime: true,
      contentAcquisition: result.crawlStatus ?? 'SKIPPED',
      contentAcquisitionProvider: crawlProvider,
      contentAcquisitionReason: result.crawlReason ?? null,
      crawlStatusCode: result.crawlStatusCode ?? null,
    },
    identityStatus: 'UNVERIFIED',
    evidenceStatus: enriched ? 'VALID' : 'UNKNOWN',
    analysis: {
      id: `${id}_analysis`,
      intentType: '公开网页商业信号',
      intentScore,
      tags,
      suggestion: '先核验公开页面中的主体、角色和真实需求，再决定是否进入联系人研究。',
      background: enriched
        ? `Crawler/MCP 已获取网页正文（${domain}）。`
        : `Crawler/MCP 发现候选页（${domain}），但正文尚未成功获取。`,
      need: evidence || '发现与当前搜索关键词相关的公开网页内容。',
      purchaseProbability: intent >= 4 ? 'medium' : 'low',
      salesStrategy: '保留普通公开网页，只排除百科类来源；商业意图作为排序而不是隐藏条件。',
      reasoning: enriched
        ? '网页正文已抓取；相关性与商业意图仍需在后续判断中验证。'
        : '只有 crawler 搜索结果摘要，不能升级为已确认采购事实。',
      needKeywords: tags,
      recommendedScript: null,
      contactAdvice: null,
    },
    contacts: [],
  }
}

function providerHealth(env) {
  const checkedAt = new Date().toISOString()
  const config = crawlerGatewayConfig(env)
  if (!config) {
    return {
      provider: 'crawler-gateway',
      dependency: 'crawler-mcp-gateway',
      state: 'UNAVAILABLE',
      code: 'CRAWLER_GATEWAY_NOT_CONFIGURED',
      message: 'Crawler/MCP search gateway is not configured.',
      checkedAt,
    }
  }
  return {
    provider: 'crawler-gateway',
    dependency: 'crawler-mcp-gateway',
    state: 'AVAILABLE',
    code: 'OK',
    message: 'Crawler/MCP search gateway is configured.',
    checkedAt,
  }
}

export async function handleCrawlerSearchResults(
  request,
  response,
  path,
  options = {},
) {
  const env = options.env ?? process.env

  if (request.method === 'GET' && path === 'search/providers/health') {
    sendJson(response, 200, { data: providerHealth(env) })
    return true
  }

  if (request.method !== 'GET') return false
  const taskId = readResultTaskId(path)
  if (!taskId) return false

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
    const discovery = await searchCrawlerGateway({
      keyword: task.k,
      platforms: task.p.length > 0 ? task.p : ['Website'],
      regions: task.r,
      maxResults: Math.min(50, Math.max(task.m * 3, 10)),
      env,
      fetcher,
    })

    if (!discovery.configured) {
      sendJson(response, 200, { data: [], meta: { total: 0 } })
      return true
    }

    const enriched = await enrichCrawlerResults(discovery.results, {
      env,
      fetcher,
    })
    const ranked = enriched
      .map((result, originalIndex) => ({
        result,
        originalIndex,
        score: commercialScore(result),
      }))
      .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
      .slice(0, task.m)
      .map(({ result }) => result)

    const results = ranked.map((result, index) => buildLead(result, index, task))
    sendJson(response, 200, { data: results, meta: { total: results.length } })
    return true
  } catch (error) {
    console.warn(
      '[crawler-gateway] search/crawl failed:',
      error instanceof Error ? error.message : String(error),
    )
    sendJson(response, 200, { data: [], meta: { total: 0 } })
    return true
  }
}
