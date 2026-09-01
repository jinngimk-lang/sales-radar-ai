import type { SearchResult } from './search-provider.interface.js'

const ENCYCLOPEDIA_DOMAINS = [
  'wikipedia.org',
  'wikidata.org',
  'britannica.com',
  'baike.baidu.com',
  'baike.com',
]

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu

export interface CommercialSearchCandidate {
  url: string
  title?: string
  text?: string
}

/**
 * Commercial signals affect ordering only. Ordinary public pages remain
 * reviewable; only invalid URLs and explicit encyclopedia domains are blocked.
 */
export function commercialSearchQualityScore(
  candidate: CommercialSearchCandidate,
): number {
  if (isEncyclopediaDomain(candidate.url)) return -100

  try {
    new URL(candidate.url)
  } catch {
    return -100
  }

  const combined = [candidate.title, candidate.text, candidate.url]
    .filter(Boolean)
    .join(' ')
  let score = 0

  if (STRONG_COMMERCIAL_PATTERN.test(combined)) score += 4
  if (TRANSACTION_PATH_PATTERN.test(candidate.url)) score += 3
  return score
}

export function filterCommercialSearchCandidates<
  T extends CommercialSearchCandidate,
>(candidates: T[]): T[] {
  return candidates
    .map((candidate, originalIndex) => ({
      candidate,
      originalIndex,
      score: commercialSearchQualityScore(candidate),
    }))
    .filter(({ score }) => score > -100)
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map(({ candidate }) => candidate)
}

export function isCommercialSearchResult(result: SearchResult): boolean {
  const metadata = result.metadata as Record<string, unknown> | undefined
  const title = typeof metadata?.title === 'string' ? metadata.title : ''
  return commercialSearchQualityScore({
    url: result.sourceUrl,
    title,
    text: result.rawContent,
  }) > -100
}

function isEncyclopediaDomain(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return ENCYCLOPEDIA_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return true
  }
}
