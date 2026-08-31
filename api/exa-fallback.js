import { createHash } from 'node:crypto'

import { decodeFallbackTask } from './crawl4ai-fallback.js'

const EXA_SEARCH_ENDPOINT = 'https://api.exa.ai/search'
const DEFAULT_TIMEOUT_MS = 8_000

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
  return [task.k.trim(), region ? `(${region})` : ''].filter(Boolean).join(' ')
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
    ...(includeDomains.length > 0 ? { includeDomains } : {}),
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

function buildLead(result, index, task) {
  const url = safeHttpUrl(result.url)
  if (!url) return null
  const title = compactText(result.title) || url
  const domain = domainForUrl(url)
  const platform = inferPlatform(url)
  const evidence = resultEvidence(result)
  const tags = keywordTags(task.k)
  const idSeed = typeof result.id === 'string' && result.id.trim()
    ? result.id.trim()
    : url
  const id = `fallback_${createHash('sha256').update(`exa:${idSeed}`).digest('hex').slice(0, 20)}`
  const neutralScore = Math.max(35, 50 - index * 2)
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
    intentScore: neutralScore,
    recommendedAction: 'monitor',
    updatedAt: new Date().toISOString(),
    sourceMetadata: {
      provider: 'exa',
      searchEngine: 'exa',
      providerResultId:
        typeof result.id === 'string' && result.id.trim() ? result.id.trim() : null,
      leadType: platform === 'Website' ? 'content' : 'person',
      evidenceKind: 'exa-public-web-content',
      author:
        typeof result.author === 'string' && result.author.trim()
          ? result.author.trim()
          : null,
      highlights: Array.isArray(result.highlights)
        ? result.highlights.filter((item) => typeof item === 'string').slice(0, 5)
        : [],
      commercialIntent: 'unverified',
      fallbackRuntime: true,
    },
    identityStatus: 'UNVERIFIED',
    evidenceStatus: 'VALID',
    analysis: {
      id: `${id}_analysis`,
      intentType: 'Exa 实时网页信号',
      intentScore: neutralScore,
      tags,
      suggestion: '先核验网页中的主体、角色、需求和时间窗口，再决定是否销售触达。',
      background: `该结果由 Exa 实时网页搜索返回（${domain}），来源链接可直接复核。`,
      need: evidence || 'Exa 返回了与搜索条件相关的公开网页证据。',
      purchaseProbability: 'low',
      salesStrategy: '先验证需求真实性与采购角色，再进入联系人研究和触达。',
      reasoning: 'Exa 提供真实网页检索与内容证据；当前分数仍只表示搜索相关性，不等同于已确认采购意图。',
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
    const results = rawResults
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
