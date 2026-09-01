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

const COMMERCIAL_PATTERN = /\b(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|buyer|supplier|vendor|manufacturer|distributor|importer|wholesaler|reseller|dealer|project|factory expansion)\b|采购|求购|询价|招标|买家|采购商|供应商|厂家|经销商|代理商|进口商|寻源/iu
const COMMERCIAL_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu

function hasCommercialValue(result) {
  return (
    COMMERCIAL_PATH_PATTERN.test(String(result.url ?? '')) ||
    COMMERCIAL_PATTERN.test(
      `${String(result.title ?? '')} ${String(result.summary ?? '')} ${String(result.url ?? '')}`,
    )
  )
}

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
    if (
      candidate.configured &&
      candidate.results.some((result) => hasCommercialValue(result))
    ) {
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
    `embedded crawler live discovery returned no commercially useful public results${lastError ? `: ${lastError instanceof Error ? lastError.message : String(lastError)}` : ''}`,
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

const commercialResults = discovery.results.filter((result) => hasCommercialValue(result))
if (commercialResults.length === 0) {
  throw new Error('embedded crawler returned public URLs but none contained commercial buyer/supplier/procurement value')
}

console.log(
  'embedded-crawler-discovery',
  JSON.stringify({
    query: usedQuery,
    resultCount: discovery.results.length,
    commercialResultCount: commercialResults.length,
    results: discovery.results.slice(0, 8).map((item) => ({
      url: item.url,
      title: item.title,
      provider: item.provider,
      commercial: hasCommercialValue(item),
    })),
  }),
)

let enriched = null
const crawlDiagnostics = []
for (const result of commercialResults.slice(0, 6)) {
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
  throw new Error('embedded crawler found commercial URLs but could not crawl usable text from the first six commercial results')
}

console.log(
  JSON.stringify(
    {
      ok: true,
      query: usedQuery,
      discoveryProvider: commercialResults[0]?.provider ?? null,
      resultCount: discovery.results.length,
      commercialResultCount: commercialResults.length,
      sampleDomains: commercialResults.slice(0, 5).map((item) => new URL(item.url).hostname),
      crawledDomain: new URL(enriched.url).hostname,
      crawledCharacters: enriched.crawlContent.length,
      crawlProvider: enriched.crawlProvider,
    },
    null,
    2,
  ),
)
