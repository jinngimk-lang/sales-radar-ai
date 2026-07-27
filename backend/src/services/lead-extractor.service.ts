import {
  CustomerType,
  Industry,
  Platform,
  RecommendedAction,
} from '@prisma/client'
import { createHash } from 'node:crypto'
import type { SearchResult } from '../providers/search/search-provider.interface.js'

export type ExtractedCustomerType = 'Buyer' | 'Influencer' | 'Company'

export interface ExtractedLead {
  company: string | null
  customerName: string
  companyDomain: string | null
  industry: Industry
  customerType: ExtractedCustomerType
  buyingSignal: string
  painPoints: string[]
  intentScore: number
  recommendedAction: RecommendedAction
}

const PLATFORM_HOSTS = new Set([
  'reddit.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'linkedin.com',
  'xiaohongshu.com',
])

const COMPANY_SUFFIX =
  '(?:Automation|Systems?|Industries|Industrial|Manufacturing|Technologies|Technology|Robotics|Solutions|Engineering|Controls?|Group|Corporation|Corp\\.?|Company|Co\\.?|Inc\\.?|LLC|Ltd\\.?|GmbH|AG)'

const COMPANY_PATTERN = new RegExp(
  `\\b([A-Z][A-Za-z0-9&.'-]*(?:\\s+[A-Z][A-Za-z0-9&.'-]*){0,4}\\s+${COMPANY_SUFFIX})\\b`,
  'g',
)

const BUYING_SIGNALS: Array<[RegExp, string, number]> = [
  [/\b(request(?:ing)? (?:a )?quote|rfq|quotation)\b/i, 'Requesting a quote', 28],
  [/\b(looking for|seeking|need|require)\b.{0,80}\b(supplier|vendor|partner|solution|system)\b/i, 'Actively looking for a supplier or solution', 25],
  [/\b(evaluating|comparing|shortlisting)\b.{0,80}\b(supplier|vendor|solution|system)\b/i, 'Evaluating suppliers or solutions', 22],
  [/\b(procurement|purchase|buying|sourcing)\b/i, 'Procurement or sourcing activity detected', 18],
  [/\b(expand|upgrade|replace|moderni[sz]e|new project)\b/i, 'Upcoming expansion or modernization project', 14],
]

const PAIN_POINT_RULES: Array<[RegExp, string]> = [
  [/\b(delay|lead time|delivery|on[- ]time|availability)\b/i, 'Delivery and lead-time risk'],
  [/\b(price|pricing|cost|budget|expensive)\b/i, 'Pricing or budget pressure'],
  [/\b(quality|reliable|reliability|failure|downtime)\b/i, 'Reliability and quality concerns'],
  [/\b(documentation|compliance|certificate|certification|regulation)\b/i, 'Documentation and compliance requirements'],
  [/\b(integration|compatible|compatibility|legacy)\b/i, 'System integration and compatibility'],
  [/\b(support|service|maintenance|spare parts)\b/i, 'After-sales service and maintenance'],
]

export class LeadExtractorService {
  extract(result: SearchResult): ExtractedLead[] {
    const text = `${this.readTitle(result)}\n${result.rawContent}`.trim()
    const companies = this.extractCompanies(result, text)
    const buyingSignal = this.extractBuyingSignal(text)
    const painPoints = this.extractPainPoints(text)
    const customerType = this.classifyCustomerType(
      result,
      Boolean(buyingSignal),
      companies.length > 0,
    )
    const intentScore = this.scoreIntent(
      text,
      buyingSignal,
      painPoints,
      customerType,
    )
    const recommendedAction = this.recommend(intentScore)
    const companyDomain = this.extractCompanyDomain(result, text)
    const candidates = companies.length > 0 ? companies : [null]

    return candidates.map((company) => ({
      company,
      customerName: this.extractCustomerName(result, company, customerType),
      companyDomain: candidates.length === 1 ? companyDomain : null,
      industry: this.inferIndustry(text, result.industry),
      customerType,
      buyingSignal: buyingSignal || 'No explicit buying signal detected',
      painPoints,
      intentScore,
      recommendedAction,
    }))
  }

  extractMany(results: SearchResult[]): SearchResult[] {
    return results.flatMap((result) => {
      const candidates = this.extract(result)
      return candidates.map((candidate, candidateIndex) =>
        this.toSearchResult(
          result,
          candidate,
          candidateIndex,
          candidates.length,
        ),
      )
    })
  }

  private toSearchResult(
    source: SearchResult,
    candidate: ExtractedLead,
    candidateIndex: number,
    candidateCount: number,
  ): SearchResult {
    const externalId =
      candidateIndex === 0
        ? source.externalId
        : createHash('sha256')
            .update(`${source.externalId}:${candidate.company ?? candidateIndex}`)
            .digest('hex')
    const storedCustomerType =
      candidate.customerType === 'Influencer'
        ? CustomerType.Agent
        : candidate.customerType

    return {
      ...source,
      externalId,
      company: candidate.company,
      customerName: candidate.customerName,
      industry: candidate.industry,
      metadata: {
        ...source.metadata,
        companyDomain: candidate.companyDomain,
        customerType: storedCustomerType,
        extractedCustomerType: candidate.customerType,
        buyingSignal: candidate.buyingSignal,
        painPoints: candidate.painPoints,
        initialIntentScore: candidate.intentScore,
        recommendedAction: candidate.recommendedAction,
        extraction: {
          candidateIndex,
          candidateCount,
          sourceExternalId: source.externalId,
        },
      },
    }
  }

  private extractCompanies(result: SearchResult, text: string): string[] {
    const candidates: string[] = []
    const metadataCompanies = result.metadata.companies
    if (Array.isArray(metadataCompanies)) {
      candidates.push(
        ...metadataCompanies.filter(
          (value): value is string => typeof value === 'string',
        ),
      )
    }

    if (result.company && !this.isPlatformTitle(result.company, result)) {
      candidates.push(result.company)
    }

    // Search snippets mention brands and suppliers that are not necessarily
    // the subject of the result. AgentReach entities must be provider-declared.
    if (result.metadata.provider === 'agent-reach') {
      return [...new Set(candidates.map((value) => this.cleanCompany(value)))]
        .filter(Boolean)
        .filter((value) => !this.isPlatformTitle(value, result))
        .slice(0, 10)
    }

    for (const match of text.matchAll(COMPANY_PATTERN)) {
      candidates.push(match[1])
    }

    for (const segment of text.split(/[,;]|\band\b/)) {
      const candidate = segment
        .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.&'-]+$/g, '')
        .trim()
      if (
        candidate.length >= 3 &&
        candidate.length <= 80 &&
        /[A-Z]/.test(candidate) &&
        new RegExp(`\\b${COMPANY_SUFFIX}\\b`).test(candidate)
      ) {
        candidates.push(candidate)
      }
    }

    for (const line of text.split(/\r?\n|[.!?]\s+/)) {
      if (
        !new RegExp(
          `\\b(?:companies|company|suppliers?|vendors?|manufacturers?|integrators?|${COMPANY_SUFFIX})\\b`,
          'i',
        ).test(line)
      ) {
        continue
      }
      const list = line
        .split(',')
        .map((value) => this.cleanCompany(value))
        .filter(
          (value) =>
            value.length >= 3 &&
            value.length <= 80 &&
            /^(?:[A-Z][A-Za-z0-9&.'-]*)(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,4}$/.test(
              value,
            ),
        )
      if (list.length >= 2) candidates.push(...list)
    }

    const unique = [
      ...new Set(candidates.map((value) => this.cleanCompany(value))),
    ]
      .filter(Boolean)
      .filter((value) => !this.isPlatformTitle(value, result))
    return unique
      .filter(
        (value) =>
          !unique.some(
            (other) =>
              other !== value &&
              other.toLowerCase().startsWith(`${value.toLowerCase()} `),
          ),
      )
      .slice(0, 10)
  }

  private isPlatformTitle(value: string, result: SearchResult): boolean {
    const title = this.readTitle(result)
    if (
      (result.platform === Platform.Reddit ||
        result.platform === Platform.YouTube) &&
      title &&
      value.trim().toLowerCase() === title.trim().toLowerCase()
    ) {
      return true
    }
    return /^(reddit|youtube|x|twitter)$/i.test(value.trim())
  }

  private cleanCompany(value: string): string {
    return value
      .replace(/^[\s"'([{]+|[\s"')\]}.,:;]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private extractCustomerName(
    result: SearchResult,
    company: string | null,
    customerType: ExtractedCustomerType,
  ): string {
    const author = this.readString(result.metadata, 'author')
    const username = this.readString(result.metadata, 'username')
    if (author) return author
    if (username) return username
    if (customerType === 'Company' && company) return company
    return result.customerName || company || 'Unknown'
  }

  private extractCompanyDomain(
    result: SearchResult,
    text: string,
  ): string | null {
    const metadataDomain = this.readString(result.metadata, 'companyDomain')
    if (metadataDomain) return this.normalizeDomain(metadataDomain)
    const companyWebsite = this.readString(
      result.metadata,
      'companyWebsite',
    )
    if (companyWebsite) return this.normalizeDomain(companyWebsite)

    const urls = text.match(/https?:\/\/[^\s)\]}>,]+/gi) ?? []
    for (const value of urls) {
      const domain = this.normalizeDomain(value)
      if (domain && !this.isPlatformHost(domain)) return domain
    }
    return null
  }

  private normalizeDomain(value: string): string | null {
    try {
      const url = new URL(
        value.includes('://') ? value : `https://${value}`,
      )
      return url.hostname.toLowerCase().replace(/^www\./, '')
    } catch {
      return null
    }
  }

  private isPlatformHost(hostname: string): boolean {
    return [...PLATFORM_HOSTS].some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  }

  private classifyCustomerType(
    result: SearchResult,
    hasBuyingSignal: boolean,
    hasCompany: boolean,
  ): ExtractedCustomerType {
    if (
      result.platform === Platform.YouTube &&
      hasCompany &&
      /\b(official|company|corporate|manufacturer|factory|product demo)\b/i.test(
        `${this.readTitle(result)} ${result.rawContent}`,
      )
    ) {
      return 'Company'
    }
    if (result.platform === Platform.Reddit || result.platform === Platform.X) {
      return hasBuyingSignal ? 'Buyer' : 'Influencer'
    }
    return hasCompany ? 'Company' : hasBuyingSignal ? 'Buyer' : 'Influencer'
  }

  private extractBuyingSignal(text: string): string {
    return BUYING_SIGNALS.find(([pattern]) => pattern.test(text))?.[1] ?? ''
  }

  private extractPainPoints(text: string): string[] {
    return PAIN_POINT_RULES.filter(([pattern]) => pattern.test(text)).map(
      ([, label]) => label,
    )
  }

  private scoreIntent(
    text: string,
    buyingSignal: string,
    painPoints: string[],
    customerType: ExtractedCustomerType,
  ): number {
    const signalWeight =
      BUYING_SIGNALS.find(([, label]) => label === buyingSignal)?.[2] ?? 0
    let score = 35 + signalWeight + Math.min(painPoints.length * 5, 20)
    if (customerType === 'Buyer') score += 10
    if (customerType === 'Company') score += 5
    if (/\b(now|urgent|immediate|this quarter|this month)\b/i.test(text)) {
      score += 10
    }
    return Math.max(0, Math.min(100, score))
  }

  private recommend(intentScore: number): RecommendedAction {
    if (intentScore >= 75) return RecommendedAction.contact_now
    if (intentScore >= 55) return RecommendedAction.follow_up
    if (intentScore >= 40) return RecommendedAction.nurture
    return RecommendedAction.monitor
  }

  private inferIndustry(text: string, fallback: Industry): Industry {
    if (/\b(automation|robot|manufactur|factory|cnc|plc)\b/i.test(text)) {
      return Industry.IndustrialManufacturing
    }
    if (/\b(medical|health|hospital|pharma)\b/i.test(text)) {
      return Industry.MedicalHealth
    }
    if (/\b(saas|software|cloud|api)\b/i.test(text)) {
      return Industry.SaaSSoftware
    }
    if (/\b(electronics|semiconductor|hardware)\b/i.test(text)) {
      return Industry.ConsumerElectronics
    }
    if (/\b(export|import|wholesale|trade)\b/i.test(text)) {
      return Industry.TradeExport
    }
    if (/\b(beauty|cosmetic|skincare)\b/i.test(text)) {
      return Industry.BeautyIndustry
    }
    return fallback
  }

  private readTitle(result: SearchResult): string {
    return this.readString(result.metadata, 'title') ?? ''
  }

  private readString(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }
}

export const leadExtractor = new LeadExtractorService()
