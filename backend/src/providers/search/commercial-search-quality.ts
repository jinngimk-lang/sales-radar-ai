import type { SearchResult } from './search-provider.interface.js'

const LOW_VALUE_DOMAINS = [
  'wikipedia.org',
  'wikimedia.org',
  'britannica.com',
  'baike.baidu.com',
  'zhihu.com',
]

const STRONG_COMMERCIAL_PATTERN = /\b(?:buyer|buying|procurement|purchasing|sourcing|rfq|rfp|tender|bid|quotation|quote|seeking|wanted|demand|importer|distributor|wholesaler|reseller|dealer|supplier|vendor|manufacturer|factory|exporter|supply partner|channel partner)\b|采购|求购|询价|招标|买家|买方|采购商|供应商|厂家|制造商|经销商|代理商|进口商|批发商|渠道商|寻源|采购需求|供应需求/iu
const TRANSACTION_PATH_PATTERN = /\/(?:procurement|purchasing|sourcing|rfq|rfp|tender|bid|supplier|vendor|distributor|dealer|partner|opportunit|marketplace|buy|sell)(?:\/|[-_?#]|$)/iu
const GENERIC_REFERENCE_PATTERN = /\b(?:wikipedia|encyclopedia|definition|overview|what is|history of|market report|industry report|market update)\b|百科|词条|是什么|行业报告|市场报告|市场概况/iu
const GENERIC_HOME_PATTERN = /\b(?:home|homepage|about us|company profile|welcome to|official site|official website)\b|官网|官方网站|公司简介|关于我们/iu

export interface CommercialSearchCandidate {
  url: string
  title?: string
  text?: string
}

export function commercialSearchQualityScore(
  candidate: CommercialSearchCandidate,
): number {
  if (isLowValueDomain(candidate.url)) return -100

  const combined = [candidate.title, candidate.text, candidate.url]
    .filter(Boolean)
    .join(' ')
  let score = 0

  if (STRONG_COMMERCIAL_PATTERN.test(combined)) score += 4
  if (TRANSACTION_PATH_PATTERN.test(candidate.url)) score += 3
  if (GENERIC_REFERENCE_PATTERN.test(combined)) score -= 4

  try {
    const parsed = new URL(candidate.url)
    const homePage = parsed.pathname === '/' || parsed.pathname === ''
    if (homePage && GENERIC_HOME_PATTERN.test(combined)) score -= 3
    if (homePage && !STRONG_COMMERCIAL_PATTERN.test(combined)) score -= 2
  } catch {
    return -100
  }

  return score
}

export function filterCommercialSearchCandidates<
  T extends CommercialSearchCandidate,
>(candidates: T[]): T[] {
  return candidates
    .map((candidate) => ({
      candidate,
      score: commercialSearchQualityScore(candidate),
    }))
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate)
}

export function isCommercialSearchResult(result: SearchResult): boolean {
  const metadata = result.metadata as Record<string, unknown> | undefined
  const title = typeof metadata?.title === 'string' ? metadata.title : ''
  return commercialSearchQualityScore({
    url: result.sourceUrl,
    title,
    text: result.rawContent,
  }) >= 2
}

function isLowValueDomain(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    return LOW_VALUE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  } catch {
    return true
  }
}
