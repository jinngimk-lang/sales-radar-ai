import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const USER_AGENT = 'SalesRadarCrawler/1.0 (+https://sales-radar-ai.vercel.app)'
const DEFAULT_TIMEOUT_MS = 8_000
const MAX_HTML_CHARS = 500_000
const MAX_REDIRECTS = 4

const LOW_VALUE_REFERENCE_DOMAINS = [
  'wikipedia.org',
  'wikidata.org',
  'wiktionary.org',
  'britannica.com',
  'baike.baidu.com',
  'baike.com',
  'merriam-webster.com',
  'dictionary.com',
  'dictionary.cambridge.org',
  'thefreedictionary.com',
  'collinsdictionary.com',
  'vocabulary.com',
  'yourdictionary.com',
  'wordnik.com',
]

const LOW_VALUE_REFERENCE_TEXT = /\b(?:dictionary|definitions?|meaning of|what does .{0,80} mean|encyclop(?:edia|aedia)|wiktionary)\b|百科|词典|字典|释义/iu

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripHtml(value) {
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function isLowValueReferenceResult(result) {
  try {
    const hostname = new URL(result.url).hostname.toLowerCase().replace(/^www\./, '')
    if (
      LOW_VALUE_REFERENCE_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      )
    ) {
      return true
    }
  } catch {
    return true
  }

  const text = `${String(result.title ?? '')} ${String(result.summary ?? '')}`
  return LOW_VALUE_REFERENCE_TEXT.test(text)
}

function keepUsefulSearchResults(results) {
  return results.filter((result) => !isLowValueReferenceResult(result))
}

function buildCommercialRetryQuery(query) {
  return [
    'procurement RFQ tender sourcing buyer supplier',
    query,
    '-dictionary -definition -meaning -wikipedia -britannica',
  ].join(' ')
}

function unwrapDuckDuckGoUrl(value) {
  const raw = decodeHtml(value).trim()
  if (!raw) return null
  try {
    const absolute = raw.startsWith('//') ? `https:${raw}` : raw
    const url = new URL(absolute)
    if (url.hostname.endsWith('duckduckgo.com') && url.pathname.startsWith('/l/')) {
      const target = url.searchParams.get('uddg')
      return target ? decodeURIComponent(target) : null
    }
    return url.toString()
  } catch {
    return null
  }
}

function unwrapBingUrl(value) {
  const raw = decodeHtml(value).trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    const hostname = url.hostname.toLowerCase()
    const isBingTracking =
      (hostname === 'bing.com' || hostname.endsWith('.bing.com')) &&
      url.pathname.startsWith('/ck/a')

    if (!isBingTracking) return isHttpUrl(url.toString()) ? url.toString() : null

    const encodedTarget = url.searchParams.get('u')
    if (!encodedTarget?.startsWith('a1')) return null
    const decodedTarget = Buffer.from(
      encodedTarget.slice(2),
      'base64url',
    ).toString('utf8')
    return isHttpUrl(decodedTarget) ? new URL(decodedTarget).toString() : null
  } catch {
    return null
  }
}

export function parseDuckDuckGoHtml(html, maxResults = 10) {
  const source = String(html ?? '')
  const anchorPattern = /<a\b[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  const results = []
  let match
  while ((match = anchorPattern.exec(source)) && results.length < maxResults) {
    const url = unwrapDuckDuckGoUrl(match[1])
    if (!url) continue
    const tail = source.slice(anchorPattern.lastIndex, anchorPattern.lastIndex + 1_500)
    const snippetMatch = tail.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div|span)>/i)
    results.push({
      url,
      title: stripHtml(match[2]),
      summary: stripHtml(snippetMatch?.[1] ?? ''),
      provider: 'embedded-html-crawler',
      metadata: { searchEngine: 'duckduckgo-html' },
    })
  }
  return results
}

export function parseBingHtml(html, maxResults = 10) {
  const source = String(html ?? '')
  const blockPattern = /<li\b[^>]*class=["'][^"']*b_algo[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi
  const results = []
  let block
  while ((block = blockPattern.exec(source)) && results.length < maxResults) {
    const anchor = block[1].match(/<h2[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    if (!anchor) continue
    const url = unwrapBingUrl(anchor[1])
    if (!url) continue
    const snippet = block[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    results.push({
      url,
      title: stripHtml(anchor[2]),
      summary: stripHtml(snippet?.[1] ?? ''),
      provider: 'embedded-html-crawler',
      metadata: { searchEngine: 'bing-html' },
    })
  }
  return results
}

async function fetchText(fetcher, url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('crawler-timeout'), timeoutMs)
  try {
    const response = await fetcher(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'manual',
    })
    if (!response.ok) return { response, text: '' }
    return { response, text: (await response.text()).slice(0, MAX_HTML_CHARS) }
  } finally {
    clearTimeout(timer)
  }
}

async function searchOneQuery(fetcher, query, maxResults) {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const ddg = await fetchText(fetcher, ddgUrl)
  let results = keepUsefulSearchResults(parseDuckDuckGoHtml(ddg.text, maxResults))
  if (results.length > 0) return results

  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${Math.min(Math.max(maxResults, 1), 20)}`
  const bing = await fetchText(fetcher, bingUrl)
  results = keepUsefulSearchResults(parseBingHtml(bing.text, maxResults))
  return results
}

export async function searchEmbeddedHtml({
  keyword,
  regions = [],
  maxResults = 10,
  fetcher = fetch,
}) {
  const regionText = Array.isArray(regions) && regions.length > 0 ? ` ${regions.join(' ')}` : ''
  const query = `${String(keyword ?? '').trim()}${regionText}`.trim()
  if (!query) return []

  let results = await searchOneQuery(fetcher, query, maxResults)
  if (results.length > 0) return results

  results = await searchOneQuery(
    fetcher,
    buildCommercialRetryQuery(query),
    maxResults,
  )
  return results
}

function isNonPublicIpv4(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b, c] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isNonPublicIp(address) {
  const version = isIP(address)
  if (version === 4) return isNonPublicIpv4(address)
  if (version === 6) {
    const value = address.toLowerCase()
    return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')
  }
  return true
}

async function assertPublicDns(url, resolver) {
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, '')
  if (isIP(hostname)) {
    if (isNonPublicIp(hostname)) throw new Error('crawler target resolved to a non-public address')
    return
  }
  const resolved = await resolver(hostname, { all: true, verbatim: true })
  const records = Array.isArray(resolved) ? resolved : [resolved]
  if (records.length === 0 || records.some((entry) => !entry?.address || isNonPublicIp(entry.address))) {
    throw new Error('crawler target resolved to a non-public address')
  }
}

export async function crawlEmbeddedPage(
  inputUrl,
  {
    fetcher = fetch,
    resolver = dnsLookup,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    allowUrl = isHttpUrl,
  } = {},
) {
  let current = new URL(inputUrl).toString()
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!allowUrl(current)) throw new Error('crawler target is not allowed')
    await assertPublicDns(current, resolver)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort('crawler-timeout'), timeoutMs)
    let response
    try {
      response = await fetcher(current, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
          'Accept-Language': 'en-US,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'manual',
      })
    } finally {
      clearTimeout(timer)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('crawler redirect missing location')
      current = new URL(location, current).toString()
      continue
    }
    if (!response.ok) throw new Error(`crawler page returned HTTP ${response.status}`)

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType && !/(text\/html|application\/xhtml\+xml|text\/plain)/.test(contentType)) {
      throw new Error(`crawler page content type is unsupported: ${contentType}`)
    }
    const html = (await response.text()).slice(0, MAX_HTML_CHARS)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const content = stripHtml(html).slice(0, 20_000)
    if (!content) throw new Error('crawler page did not contain usable text')
    return {
      url: current,
      title: stripHtml(titleMatch?.[1] ?? '') || null,
      content,
      metadata: { crawler: 'embedded-html-crawler' },
      statusCode: response.status,
    }
  }
  throw new Error('crawler redirect limit exceeded')
}
