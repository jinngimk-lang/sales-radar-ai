import { crawlerSearchRuntime } from './crawler-gateway-client.js'

const TASK_PREFIX = 'sf1_'
const TASK_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

function taskEnvelope(taskId, resultCount = 0) {
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
      'Crawler search collects public-web evidence. Commercial intent must be verified before outreach.',
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
    version: 'serverless-crawler-v4',
    capturedAt,
    source: requestedContext ? 'request' : 'inferred',
    productProfile: null,
    context,
  }
  const searchIntent = {
    version: 'serverless-crawler-v4',
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

export function runtimeCapabilities(env = process.env) {
  const crawler = crawlerSearchRuntime(env)
  const crawlerEnabled = crawler.available
  const provider = crawlerEnabled ? crawler.provider : null
  return {
    marketResearch: {
      enabled: crawlerEnabled,
      provider,
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
      provider,
      enabled: crawlerEnabled,
      transport: crawler.mode === 'embedded' ? 'embedded-serverless' : 'serverless',
    },
    publicContactDiscovery: {
      enabled: false,
      provider: null,
      model: null,
    },
    salesDiscovery: {
      enabled: crawlerEnabled,
      provider,
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
      data: taskEnvelope(taskId),
      ...preparation,
    })
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
    sendJson(response, 200, { data: taskEnvelope(taskId) })
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
