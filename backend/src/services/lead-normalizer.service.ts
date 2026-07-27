import {
  CustomerType,
  Platform,
  Prisma,
  RecommendedAction,
  type Industry,
  type Region,
} from '@prisma/client'
import type { SearchResult } from '../providers/search/search-provider.interface.js'
import { leadScoring } from './lead-scoring.service.js'
import { leadClassifier } from './lead-classifier.service.js'
import {
  sanitizeProviderString,
  toSafeJson,
} from './safe-json.service.js'

export interface NormalizedLead {
  provider: string
  externalId: string
  sourceMetadata: Prisma.InputJsonValue
  username: string
  displayName: string
  initials: string
  platform: Platform
  customerType: CustomerType
  postContent: string
  postedAt: Date | null
  country: string
  region: Region
  industry: Industry
  jobTitle?: string
  company?: string
  sourceUrl: string
  profileUrl: string
  interestTags: string[]
  intentScore: number
  recommendedAction: RecommendedAction
}

const CUSTOMER_TYPES = new Set<string>(Object.values(CustomerType))

export class LeadNormalizerService {
  normalize(result: SearchResult, provider = 'mock'): NormalizedLead {
    const providerUsername = this.readPreferredString(result.metadata, [
      'author',
      'contactName',
      'personName',
      'authorUsername',
      'username',
    ])
    const username =
      providerUsername && !this.isSyntheticIdentity(providerUsername)
        ? providerUsername
        : this.createSourceIdentity(result, provider)
    const customerTypeValue = this.readString(
      result.metadata,
      'customerType',
    )
    const customerType = CUSTOMER_TYPES.has(customerTypeValue ?? '')
      ? (customerTypeValue as CustomerType)
      : CustomerType.Buyer
    const fallbackIntentScore = this.clampScore(
      this.readNumber(result.metadata, 'initialIntentScore') ?? 50,
    )
    const jobTitle = this.readPreferredString(result.metadata, [
      'jobTitle',
      'position',
      'role',
    ])
    const providerContactName = this.readPreferredString(result.metadata, [
      'contactName',
      'personName',
      'fullName',
      'author',
    ])
    const website = this.readPreferredString(result.metadata, [
      'companyWebsite',
      'website',
      'companyUrl',
    ])
    const domain =
      this.normalizeDomain(
        this.readPreferredString(result.metadata, [
          'companyDomain',
          'domain',
        ]) ?? website ?? '',
      ) ?? null
    const company = this.resolveCompany(result, domain, website)
    const contactName =
      result.platform === Platform.YouTube && !jobTitle
        ? null
        : providerContactName
    const relatedCompanies = this.extractRelatedCompanies(result)
    const leadType = leadClassifier.classify(result, {
      company,
      contactName,
      jobTitle,
      website,
    })
    const location =
      this.readPreferredString(result.metadata, [
        'location',
        'country',
        'countryName',
      ]) ?? result.country
    const scoringMetadata = {
      ...result.metadata,
      companyWebsite: website,
      companyDomain: domain,
      jobTitle,
      location,
      leadType,
      relatedCompanies,
    }
    const scoring = leadScoring.score({
      platform: result.platform,
      sourceUrl: result.sourceUrl,
      rawContent: result.rawContent,
      sourceMetadata: scoringMetadata,
      customerType,
      fallbackIntentScore,
    })
    const sourceMetadata = {
      ...result.metadata,
      buyingSignal: scoring.buyingSignal,
      urgencyLevel: scoring.urgencyLevel,
      scoringConfidence: scoring.confidence,
      companyName: company,
      website,
      domain,
      contactName,
      jobTitle,
      sourceUrl: result.sourceUrl,
      sourcePlatform: result.platform,
      location,
      buyingIntent: scoring.buyingSignal,
      leadType,
      relatedCompanies,
    }
    const displayName =
      (result.platform === Platform.YouTube && leadType === 'company'
        ? company
        : null) ||
      contactName ||
      (!this.isSyntheticIdentity(result.customerName)
        ? result.customerName
        : null) ||
      company ||
      'Unknown'

    return {
      provider,
      externalId: result.externalId,
      sourceMetadata: this.toJsonValue(sourceMetadata),
      username,
      displayName,
      initials: this.createInitials(displayName),
      platform: result.platform,
      customerType,
      postContent: sanitizeProviderString(result.rawContent),
      postedAt:
        this.readDate(result.metadata, 'postedAt') ??
        this.readDate(result.metadata, 'publishedAt'),
      country:
        this.readPreferredString(result.metadata, [
          'country',
          'countryName',
          'location',
        ]) ?? result.country,
      region: result.region,
      industry: result.industry,
      jobTitle: jobTitle ?? undefined,
      company: company ?? undefined,
      sourceUrl: result.sourceUrl,
      profileUrl: result.profileUrl,
      interestTags: this.readStringArray(result.metadata, 'interestTags'),
      intentScore: scoring.intentScore,
      recommendedAction: scoring.recommendedAction,
    }
  }

  normalizeMany(
    results: SearchResult[],
    provider = 'mock',
  ): NormalizedLead[] {
    return results.map((result) => this.normalize(result, provider))
  }

  private createInitials(name: string): string {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')

    return initials || 'NA'
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  private createSourceIdentity(
    result: SearchResult,
    provider: string,
  ): string {
    if (provider !== 'agent-reach') {
      return this.isSyntheticIdentity(result.externalId)
        ? 'Unknown'
        : result.externalId
    }

    try {
      const segments = new URL(result.sourceUrl).pathname
        .split('/')
        .filter(Boolean)
      const communityIndex = segments.findIndex(
        (segment) => segment.toLowerCase() === 'r',
      )
      if (communityIndex >= 0 && segments[communityIndex + 1]) {
        return `r/${segments[communityIndex + 1]}`
      }
      const socialHandle = segments.find((segment) => segment.startsWith('@'))
      if (socialHandle) return socialHandle
      if (segments[0] && !['watch', 'shorts'].includes(segments[0])) {
        return segments[0]
      }
    } catch {
      // Fall back to a stable, provider-specific identity below.
    }

    return 'Unknown'
  }

  private isSyntheticIdentity(value: string): boolean {
    const candidate = value.trim()
    return (
      !candidate ||
      /^(?:buyer|mock)[_-]/i.test(candidate) ||
      /^(?:[a-f0-9]{24,}|[a-z]+-[a-f0-9]{8,})$/i.test(candidate)
    )
  }

  private resolveCompany(
    result: SearchResult,
    domain: string | null,
    website: string | null,
  ): string | null {
    if (result.platform === Platform.YouTube) {
      const caseCompany = this.extractYouTubeCaseCompany(result)
      if (caseCompany) return caseCompany
    }

    const declared =
      result.company ||
      this.readPreferredString(result.metadata, [
        'company',
        'companyName',
        'organization',
        'organizationName',
      ])
    if (declared && !this.isContentTitle(declared, result)) return declared

    const host = domain ?? this.normalizeDomain(website ?? '')
    if (host && !this.isSocialDomain(host)) {
      const label = host.split('.')[0]?.replace(/[-_]+/g, ' ').trim()
      if (label) {
        return label.replace(/\b\w/g, (letter) => letter.toUpperCase())
      }
    }
    return null
  }

  private extractYouTubeCaseCompany(result: SearchResult): string | null {
    const title = this.readString(result.metadata, 'title') ?? ''
    const spotlight = title.match(
      /\bcustomer\s+(?:spotlight|story|case)\s*[:|—-]?\s*([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3})\b/i,
    )
    if (spotlight?.[1]) return this.cleanCompanyCandidate(spotlight[1])

    const uppercaseNames = [
      ...title.matchAll(/\b[A-Z][A-Z0-9&-]{2,}(?:\s+[A-Z][A-Z0-9&-]{2,}){0,2}\b/g),
    ]
      .map((match) => this.cleanCompanyCandidate(match[0]))
      .filter(
        (value) =>
          value &&
          !/^(?:TOP|USA|B2B|UV|AI|PLC|CNC|OEM)$/i.test(value),
      )
    if (
      uppercaseNames.length >= 2 &&
      /\b(customer|case|application|products?|cobots?|automation|packaging)\b/i.test(
        title,
      )
    ) {
      return uppercaseNames.at(-1) ?? null
    }
    return null
  }

  private extractRelatedCompanies(result: SearchResult): string[] {
    if (result.platform !== Platform.YouTube) {
      return result.company ? [result.company] : []
    }
    const title = this.readString(result.metadata, 'title') ?? ''
    const values = [
      result.company,
      this.extractYouTubeCaseCompany(result),
      ...[...title.matchAll(/\b[A-Z][A-Z0-9&-]{2,}\b/g)].map(
        (match) => match[0],
      ),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.cleanCompanyCandidate(value))
      .filter(
        (value) =>
          Boolean(value) &&
          !/^(?:TOP|USA|B2B|UV|AI|PLC|CNC|OEM)$/i.test(value),
      )
    return [...new Set(values)]
  }

  private cleanCompanyCandidate(value: string): string {
    return value
      .replace(/\s+(?:video|case study|customer story)$/i, '')
      .replace(/^[\s:|—-]+|[\s:|—-]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private isContentTitle(value: string, result: SearchResult): boolean {
    const title = this.readString(result.metadata, 'title')
    return Boolean(
      title &&
        value.trim().toLowerCase() === title.toLowerCase() &&
        (result.platform === Platform.YouTube ||
          result.platform === Platform.Reddit),
    )
  }

  private isSocialDomain(hostname: string): boolean {
    return /(?:^|\.)(?:reddit|youtube|youtu|x|twitter|facebook|instagram|tiktok|linkedin|xiaohongshu)\.(?:com|be)$/i.test(
      hostname,
    )
  }

  private readPreferredString(
    metadata: Record<string, unknown>,
    keys: string[],
  ): string | null {
    const sources: Record<string, unknown>[] = [metadata]
    const original = metadata.originalMetadata
    if (original && typeof original === 'object' && !Array.isArray(original)) {
      sources.push(original as Record<string, unknown>)
      const nestedData = (original as Record<string, unknown>).data
      if (
        nestedData &&
        typeof nestedData === 'object' &&
        !Array.isArray(nestedData)
      ) {
        sources.push(nestedData as Record<string, unknown>)
      }
    }

    for (const key of keys) {
      for (const source of sources) {
        const value = this.readString(source, key)
        if (
          value &&
          !/^(?:n\/?a|none|null|unknown|not available|anonymous|-+)$/i.test(
            value,
          )
        ) {
          return value
        }
      }
    }
    return null
  }

  private readString(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private readNumber(
    metadata: Record<string, unknown>,
    key: string,
  ): number | null {
    const value = metadata[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }

  private readStringArray(
    metadata: Record<string, unknown>,
    key: string,
  ): string[] {
    const value = metadata[key]
    if (!Array.isArray(value)) return []
    return value.filter(
      (item): item is string => typeof item === 'string' && Boolean(item.trim()),
    )
  }

  private readDate(
    metadata: Record<string, unknown>,
    key: string,
  ): Date | null {
    const value = metadata[key]
    if (typeof value !== 'string') return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  private toJsonValue(metadata: Record<string, unknown>): Prisma.InputJsonValue {
    try {
      const sanitized = toSafeJson(metadata) as Record<string, unknown>
      const companyDomain = sanitized.companyDomain
      if (typeof companyDomain === 'string') {
        sanitized.companyDomain = this.normalizeDomain(companyDomain)
      }
      return sanitized as Prisma.InputJsonValue
    } catch {
      return {}
    }
  }

  private normalizeDomain(value: string): string | null {
    const candidate = value.trim().toLowerCase()
    if (!candidate) return null

    try {
      const url = new URL(
        candidate.includes('://') ? candidate : `https://${candidate}`,
      )
      return url.hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  }
}

export const leadNormalizer = new LeadNormalizerService()
