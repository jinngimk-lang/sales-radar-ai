import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

import { decodeFallbackTask } from './crawl4ai-fallback.js'

const EXA_SEARCH_ENDPOINT = 'https://api.exa.ai/search'
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_CRAWL_TIMEOUT_MS = 5_000
const DEFAULT_CRAWL_MAX_RESULTS = 5

const PLATFORM_DOMAINS = {
  Reddit: ['reddit.com'],
  X: ['x.com', 'twitter.com'],
  Instagram: ['instagram.com'],
  Facebook: ['facebook.com'],
  TikTok: ['tiktok.com'],
  LinkedIn: ['linkedin.com'],
  Xiaohongshu: ['xiaohongshu.com', 'xhslink.com'],
  YouTube: ['youtube.com', 'youtu.be'],
}

const REGION_LABELS = {
  USA: 'United States',
  Europe: 'Europe',
  SoutheastAsia: 'Southeast Asia',
  China: 'China',
  MiddleEast: 'Middle East',
}

const LOW_VALUE_DOMAINS = [
  'wikipedia.org',
  'wikimedia.org',
  'britannica.com',
  'baike.baidu.com',
  'zhihu.com',
]

const COMMERCIAL_QUERY_TERMS = [
  'buyer',
  'procurement',
  'purchasing',
  'sourcing',
  'RFQ',
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

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu
const GENERIC_REFERENCE_PATTERN = /\b(?:wikipedia|encyclopedia|definition|overview|what is|history of|market report|industry report)\b|百科|词条|是什么|行业报告|市场报告/iu
const GENERIC_HOME_PATTERN = /\b(?:home|homepage|about us|company profile|welcome to|official site|official website)\b|官网|官方网站|公司简介|关于我们/iu

function sendJson(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(status).json(payload)
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

function buildQuery(task) {
  const region = task.r
    .map((item) => REGION_LABELS[item])
    .filter(Boolean)
    .join(' OR ')
  return [
    task.k.trim(),
    region ? `(${region})` : '',
    `(${COMMERCIAL_QUERY_TERMS})`,
  ]
    .filter(Boolean)
    .join(' ')
}

function includeDomainsForTask(task) {
  if (!Array.isArray(task.p) || task.p.length === 0 || task.p.includes('Website')) {
    return []
  }
  return [
    ...new Set(
      task.p.flatMap((platform) => PLATFORM_DOMAINS[platform] ?? []),
    ),
  ]
}

async function searchExa(task, apiKey, fetcher, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('exa-search-timeout'), timeoutMs)
  const includeDomains = includeDomainsForTask(task)
  const body = {
    query: buildQuery(task),
    type: 'fast',
    numResults: task.m,
    moderation: true,
    contents: { highlights: true },
    ...(includeDomains.length > 0
      ? { includeDomains }
      : { excludeDomains: LOW_VALUE_DOMAINS }),
  }

  try {
    const response = await fetcher(EXA_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Exa search returned HTTP ${response.status}`)
    }
    const payload = await response.json()
    return Array.isArray(payload?.results) ? payload.results : []
  } finally {
    clearTimeout(timeout)
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
    if (
      ipVersion === 6 &&
      (hostname === '::1' ||
        hostname.startsWith('fc') ||
        hostname.startsWith('fd') ||
        hostname.startsWith('fe80:'))
    ) {
      return false
    }
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
    const text = stringValue(value[key])
    if (text) return text
  }
  return null
}

function markdownText(value) {
  if (typeof value === 'string') return value
  return readText(record(value), ['fit_markdown', 'raw_markdown', 'markdown'])
}

async function crawlResult(result, config, fetcher) {
  const url = safeHttpUrl(result?.url)
  if (!url || !isAllowedCrawlTarget(url)) return result

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('crawl4ai-timeout'), config.timeoutMs)
  try {
    const response = await fetcher(`${config.baseUrl}/crawl`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
      },
      body: JSON.stringify({ urls: [url] }),
      signal: controller.signal,
    })
    if (!response.ok) return result
    const payload = await response.json()
    const root = record(payload)
    const crawled = record(Array.isArray(root?.results) ? root.results[0] : null)
    if (root?.success !== true || crawled?.success !== true) return result
    const content = markdownText(crawled.markdown) || stringValue(crawled.html)
    if (!content) return result
    const metadata = record(crawled.metadata) ?? {}
    return {
      ...result,
      title: readText(metadata, ['title']) || result.title,
      url: stringValue(crawled.url) || url,
      crawlContent: content.trim().slice(0, 20_000),
      crawlStatus: 'ENRICHED',
    }
  } catch {
    return result
  } finally {
    clearTimeout(timeout)
  }
}

async function enrichWithCrawler(results, config, fetcher) {
  if (!config) return results
  return Promise.all(
    results.map((result, index) =>
      index < config.maxResults ? crawlResult(result, config, fetcher) : result,
    ),
  )
}

function safeHttpUrl(value) {
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

function inferPlatform(url) {
  let hostname = ''
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'Website'
  }
  if (hostname === 'reddit.com' || hostname.endsWith('.reddit.com')) return 'Reddit'
  if (hostname === 'x.com' || hostname.endsWith('.x.com') || hostname === 'twitter.com' || hostname.endsWith('.twitter.com')) return 'X'
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'Instagram'
  if (hostname === 'facebook.com' || hostname.endsWith('.facebook.com')) return 'Facebook'
  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'TikTok'
  if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) return 'LinkedIn'
  if (hostname === 'xiaohongshu.com' || hostname.endsWith('.xiaohongshu.com') || hostname === 'xhslink.com' || hostname.endsWith('.xhslink.com')) return 'Xiaohongshu'
  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') return 'YouTube'
  return 'Website'
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

function inferRegion(task) {
  return task.r[0] ?? 'USA'
}

function domainForUrl(url) {
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

function compactText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resultEvidence(result) {
  const crawled = compactText(result.crawlContent)
  if (crawled) return crawled.slice(0, 1_500)
  const directText = compactText(result.text)
  if (directText) return directText.slice(0, 1_500)
  const highlights = Array.isArray(result.highlights)
    ? result.highlights.map(compactText).filter(Boolean).join(' ')
    : ''
  if (highlights) return highlights.slice(0, 1_500)
  const summary = compactText(result.summary)
  if (summary) return summary.slice(0, 1_500)
  return compactText(result.title).slice(0, 1_500)
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

function commercialIntentScore(result) {
  const url = safeHttpUrl(result.url)
  if (!url || isLowValueDomain(url)) return -100
  const title = compactText(result.title)
  const evidence = resultEvidence(result)
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

function buildLead(result, index, task) {
  const url = safeHttpUrl(result.url)
  if (!url) return null
  const title = compactText(result.title) || url
  const domain = domainForUrl(url)
  const platform = inferPlatform(url)
  const evidence = resultEvidence(result)
  const intent = commercialIntentScore(result)
  const tags = keywordTags(task.k)
  const idSeed = typeof result.id === 'string' && result.id.trim()
    ? result.id.trim()
    : url
  const id = `fallback_${createHash('sha256').update(`exa:${idSeed}`).digest('hex').slice(0, 20)}`
  const intentScore = Math.min(95, Math.max(55, 68 + intent * 4 - index * 2))
  const publishedAt = typeof result.publishedDate === 'string'
    ? result.publishedDate
    : null

  return {
    id,
    username: domain,
    displayName: title.slice(0, 180),
    avatarUrl:
      typeof result.image === 'string' && /^https?:\/\//i.test(result.image)
        ? result.image
        : null,
    initials: domain.replace(/^www\./, '').slice(0, 2).toUpperCase() || 'EX',
    platform,
    customerType: 'Company',
    postContent: evidence || title,
    postedAt: publishedAt,
    country: 'Unknown',
    region: inferRegion(task),
    industry: inferIndustry(`${task.k} ${title} ${evidence}`),
    jobTitle: null,
    company: null,
    sourceUrl: url,
    profileUrl: homeUrl(url),
    interestTags: tags,
    intentScore,
    recommendedAction: intent >= 4 ? 'research-contact' : 'monitor',
    updatedAt: new Date().toISOString(),
    sourceMetadata: {
      provider: 'exa',
      searchEngine: 'exa',
      providerResultId:
        typeof result.id === 'string' && result.id.trim() ? result.id.trim() : null,
      leadType: platform === 'Website' ? 'commercial-page' : 'person',
      evidenceKind: result.crawlStatus === 'ENRICHED'
        ? 'crawler-backed-public-web-content'
        : 'exa-public-web-content',
      contentAcquisition: result.crawlStatus === 'ENRICHED' ? 'CRAWL4AI' : 'EXA',
      author:
        typeof result.author === 'string' && result.author.trim()
          ? result.author.trim()
          : null,
      highlights: Array.isArray(result.highlights)
        ? result.highlights.filter((item) => typeof item === 'string').slice(0, 5)
        : [],
      commercialIntent: intent >= 4 ? 'high' : 'medium',
      fallbackRuntime: true,
    },
    identityStatus: 'UNVERIFIED',
    evidenceStatus: 'VALID',
    analysis: {
      id: `${id}_analysis`,
      intentType: intent >= 4 ? '买家/卖家商业信号' : '潜在商业信号',
      intentScore,
      tags,
      suggestion: '优先核验采购/供货角色、需求量、时间窗口和公开联系人，再决定是否触达。',
      background: `该结果来自公开网页检索（${domain}），并按买家/卖家商业意图筛选。`,
      need: evidence || '发现了与采购、供货、分销或寻源相关的公开商业信号。',
      purchaseProbability: intent >= 4 ? 'medium' : 'low',
      salesStrategy: '围绕真实采购、供货、RFQ、招标、渠道或寻源证据推进，不把官网介绍或百科资料当作线索。',
      reasoning: result.crawlStatus === 'ENRICHED'
        ? 'Crawl4AI 已抓取候选页面正文，结果通过商业意图规则后才进入列表。'
        : 'Exa 用于发现候选 URL；结果通过商业意图规则后才进入列表。',
      needKeywords: tags,
      recommendedScript: null,
      contactAdvice: null,
    },
    contacts: [],
  }
}

export async function handleExaSearchResults(
  request,
  response,
  path,
  options = {},
) {
  if (request.method !== 'GET') return false
  const taskId = readResultTaskId(path)
  if (!taskId) return false

  const env = options.env ?? process.env
  const apiKey = env.EXA_API_KEY?.trim()
  if (!apiKey) return false

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

  const timeoutMs = positiveInteger(
    env.EXA_SEARCH_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    20_000,
  )
  const fetcher = options.fetcher ?? fetch

  try {
    const rawResults = await searchExa(task, apiKey, fetcher, timeoutMs)
    const enrichedResults = await enrichWithCrawler(
      rawResults,
      crawlerConfig(env),
      fetcher,
    )
    const rankedResults = enrichedResults
      .map((result) => ({ result, score: commercialIntentScore(result) }))
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)
      .map(({ result }) => result)
    const results = rankedResults
      .map((result, index) => buildLead(result, index, task))
      .filter(Boolean)
    if (results.length === 0) return false
    sendJson(response, 200, { data: results, meta: { total: results.length } })
    return true
  } catch (error) {
    console.warn(
      '[exa-fallback] Exa search failed; yielding to public fallback:',
      error instanceof Error ? error.message : String(error),
    )
    return false
  }
}
