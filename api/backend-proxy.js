import { handleMarketResearchFallback } from './market-research-fallback.js'
import { handleExaSearchResults } from './exa-fallback.js'
import { handleCrawlerSearchResults } from './crawl4ai-fallback.js'
import { handleServerlessFallback } from './serverless-fallback.js'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

function normalizeOrigin(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

function readProxyPath(value) {
  if (Array.isArray(value)) return value.join('/')
  if (typeof value === 'string') return value.replace(/^\/+/, '')
  return ''
}

function buildRequestHeaders(headers) {
  const forwarded = new Headers()

  for (const [key, value] of Object.entries(headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) forwarded.append(key, item)
    } else {
      forwarded.set(key, String(value))
    }
  }

  return forwarded
}

function buildRequestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined
  if (request.body === undefined || request.body === null) return undefined
  if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
    return request.body
  }
  return JSON.stringify(request.body)
}

export default async function handler(request, response) {
  const backendOrigin = normalizeOrigin(process.env.BACKEND_ORIGIN)
  const proxyPath = readProxyPath(request.query.path)

  if (!backendOrigin) {
    const marketHandled = await handleMarketResearchFallback(
      request,
      response,
      proxyPath,
    )
    if (marketHandled) return

    const exaHandled = await handleExaSearchResults(
      request,
      response,
      proxyPath,
    )
    if (exaHandled) return

    const crawlerHandled = await handleCrawlerSearchResults(
      request,
      response,
      proxyPath,
    )
    if (crawlerHandled) return

    const handled = await handleServerlessFallback(request, response, proxyPath)
    if (handled) return

    response.status(503).json({
      error: {
        code: 'BACKEND_NOT_CONFIGURED',
        message: 'This API capability requires the full backend runtime.',
      },
    })
    return
  }

  const target = new URL(`/api/${proxyPath}`, backendOrigin)

  for (const [key, value] of Object.entries(request.query)) {
    if (key === 'path' || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) target.searchParams.append(key, item)
    } else {
      target.searchParams.set(key, String(value))
    }
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: buildRequestHeaders(request.headers),
      body: buildRequestBody(request),
      redirect: 'manual',
    })

    response.status(upstream.status)
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        response.setHeader(key, value)
      }
    })

    const body = Buffer.from(await upstream.arrayBuffer())
    response.send(body)
  } catch (error) {
    console.error('[backend-proxy] upstream request failed', error)
    response.status(502).json({
      error: {
        code: 'BACKEND_UNAVAILABLE',
        message: 'Backend service is unavailable.',
      },
    })
  }
}
