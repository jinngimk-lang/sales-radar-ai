import {
  enrichCrawlerResults,
  isEncyclopediaUrl,
  searchCrawlerGateway,
} from '../api/crawler-gateway-client.js'

const queries = [
  'industrial automation procurement supplier Europe',
  'industrial pump RFQ supplier Europe',
  'battery storage procurement supplier Europe',
]

let discovery = null
let usedQuery = null
let lastError = null

for (const keyword of queries) {
  try {
    const candidate = await searchCrawlerGateway({
      keyword,
      platforms: ['Website'],
      regions: ['Europe'],
      maxResults: 8,
      env: {},
    })
    if (candidate.configured && candidate.results.length > 0) {
      discovery = candidate
      usedQuery = keyword
      break
    }
  } catch (error) {
    lastError = error
  }
}

if (!discovery || discovery.results.length === 0) {
  throw new Error(
    `embedded crawler live discovery returned no public results${lastError ? `: ${lastError instanceof Error ? lastError.message : String(lastError)}` : ''}`,
  )
}

const encyclopedia = discovery.results.filter((result) =>
  isEncyclopediaUrl(result.url),
)
if (encyclopedia.length > 0) {
  throw new Error(
    `embedded crawler leaked encyclopedia results: ${encyclopedia.map((item) => item.url).join(', ')}`,
  )
}

console.log(
  'embedded-crawler-discovery',
  JSON.stringify({
    query: usedQuery,
    resultCount: discovery.results.length,
    results: discovery.results.slice(0, 6).map((item) => ({
      url: item.url,
      provider: item.provider,
    })),
  }),
)

let enriched = null
const crawlDiagnostics = []
for (const result of discovery.results.slice(0, 6)) {
  const [candidate] = await enrichCrawlerResults([result], { env: {} })
  crawlDiagnostics.push({
    url: result.url,
    status: candidate?.crawlStatus ?? null,
    provider: candidate?.crawlProvider ?? null,
    reason: candidate?.crawlReason ?? null,
    error: candidate?.crawlError ?? null,
    contentLength: candidate?.crawlContent?.length ?? 0,
  })
  if (candidate?.crawlStatus === 'ENRICHED' && candidate.crawlContent?.length >= 120) {
    enriched = candidate
    break
  }
}

console.log('embedded-crawler-crawl', JSON.stringify(crawlDiagnostics))

if (!enriched) {
  throw new Error('embedded crawler discovered URLs but could not crawl usable text from the first six public results')
}

console.log(
  JSON.stringify(
    {
      ok: true,
      query: usedQuery,
      discoveryProvider: discovery.results[0]?.provider ?? null,
      resultCount: discovery.results.length,
      sampleDomains: discovery.results.slice(0, 5).map((item) => new URL(item.url).hostname),
      crawledDomain: new URL(enriched.url).hostname,
      crawledCharacters: enriched.crawlContent.length,
      crawlProvider: enriched.crawlProvider,
    },
    null,
    2,
  ),
)
