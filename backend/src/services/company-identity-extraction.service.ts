import {
  LeadIdentityStatus,
  Platform,
} from '@prisma/client'

export interface CompanyIdentityEvidence {
  platform: Platform
  sourceUrl: string
  company: string | null
  rawContent: string
  metadata: Record<string, unknown>
}

export interface CompanyIdentityResult {
  companyName: string | null
  normalizedDomain: string | null
  website: string | null
  confidence: number
  confidenceReasoning: string[]
  identityStatus: LeadIdentityStatus
  reasons: string[]
}

const BLOCKED_HOSTS = new Set([
  'bit.ly',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'reddit.com',
  't.co',
  'tiktok.com',
  'tinyurl.com',
  'x.com',
  'youtube.com',
  'youtu.be',
])

const COMPANY_NAME_PATTERN =
  /\b([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,5}\s+(?:GmbH|AG|Ltd\.?|Limited|Inc\.?|LLC|Corporation|Corp\.?|Company|Co\.?|Industries|Industrial|Manufacturing|Technologies|Technology|Systems|Solutions|Robotics|Automation|Group|Holding|PLC|SE))\b/g

const GENERIC_COMPANY_NAMES = new Set([
  'automation technology',
  'automation solutions',
  'business solutions',
  'engineering services',
  'industrial automation',
  'industrial manufacturing',
  'industrial solutions',
  'manufacturing solutions',
  'oem manufacturing',
  'software solutions',
  'technology solutions',
])

const GENERIC_TOKENS = new Set([
  'automation',
  'business',
  'company',
  'engineering',
  'group',
  'industrial',
  'industries',
  'manufacturing',
  'oem',
  'services',
  'software',
  'solutions',
  'systems',
  'technology',
  'technologies',
])

const LEGAL_SUFFIX =
  /\b(?:GmbH|AG|Ltd\.?|Limited|Inc\.?|LLC|Corporation|Corp\.?|Co\.?|PLC|SE)\b/i

/**
 * Extracts identity only from explicit provider fields or company language in
 * official-site content. Titles and hostname prefixes are never company names.
 */
export class CompanyIdentityExtractionService {
  extract(result: CompanyIdentityEvidence): CompanyIdentityResult {
    const reasons: string[] = []
    const confidenceReasoning: string[] = []
    const sourceDomain = this.domainFromUrl(result.sourceUrl)

    if (
      result.platform !== Platform.Website ||
      !sourceDomain ||
      this.isBlockedHost(sourceDomain)
    ) {
      return {
        companyName: null,
        normalizedDomain: null,
        website: null,
        confidence: 0,
        confidenceReasoning: [
          'The source is not an official company website.',
        ],
        identityStatus: LeadIdentityStatus.REJECTED,
        reasons: ['Source is not an eligible official company website.'],
      }
    }

    confidenceReasoning.push('Source URL is an eligible company website.')
    const rawExplicitCompany =
      result.company ??
      this.readString(result.metadata, [
        'companyName',
        'organizationName',
        'organization',
        'author',
      ])
    const explicitCompany = this.meaningfulCompany(rawExplicitCompany)
    const extractedContentCompany = this.companyFromContent(result.rawContent)

    if (rawExplicitCompany && !explicitCompany) {
      reasons.push(
        `Rejected generic company identity: ${rawExplicitCompany.trim()}.`,
      )
    }
    if (explicitCompany) {
      confidenceReasoning.push(
        'Company name is explicitly supplied by provider metadata.',
      )
    } else if (extractedContentCompany) {
      confidenceReasoning.push(
        'Company name is present in official-site content, not title-only evidence.',
      )
    }
    const declaredWebsite = this.readString(result.metadata, [
      'companyWebsite',
      'website',
      'companyUrl',
    ])
    const declaredDomain = this.normalizeDomain(
      this.readString(result.metadata, ['companyDomain', 'domain']) ??
        declaredWebsite ??
        result.sourceUrl,
    )
    const websiteDomain = declaredWebsite
      ? this.normalizeDomain(declaredWebsite)
      : sourceDomain
    const domainMatchesSource =
      declaredDomain === sourceDomain && websiteDomain === sourceDomain
    const initialCompany = explicitCompany ?? extractedContentCompany
    const corroboratedBrand = this.corroboratedOfficialBrand(
      result,
      declaredDomain,
    )
    const contentCompany =
      initialCompany &&
      declaredDomain &&
      this.isBrandAligned(initialCompany, declaredDomain)
        ? initialCompany
        : corroboratedBrand

    if (corroboratedBrand && corroboratedBrand !== initialCompany) {
      confidenceReasoning.push(
        'Company brand is corroborated by official domain, page title, and repeated body content.',
      )
    }
    if (contentCompany && LEGAL_SUFFIX.test(contentCompany)) {
      confidenceReasoning.push('Company name contains a recognized legal suffix.')
    } else if (contentCompany) {
      confidenceReasoning.push(
        'Company name contains a distinctive non-category brand token.',
      )
    }

    if (!contentCompany) reasons.push('No explicit company identity in source content.')
    if (!declaredDomain) reasons.push('No valid company domain is available.')
    if (declaredDomain && !domainMatchesSource) {
      reasons.push('Declared company domain does not match the source website.')
    } else if (declaredDomain) {
      confidenceReasoning.push(
        'Normalized domain matches the source website domain.',
      )
    }

    const verified = Boolean(
      contentCompany &&
        declaredDomain &&
        domainMatchesSource &&
        this.isBrandAligned(contentCompany, declaredDomain) &&
        !this.isBlockedHost(declaredDomain),
    )
    if (
      initialCompany &&
      declaredDomain &&
      !this.isBrandAligned(initialCompany, declaredDomain) &&
      !corroboratedBrand
    ) {
      reasons.push(
        'Company identity is not aligned with the official website domain.',
      )
    } else if (contentCompany && declaredDomain) {
      confidenceReasoning.push(
        'A distinctive company token matches the official website domain.',
      )
    }

    return {
      companyName: contentCompany,
      normalizedDomain: declaredDomain,
      website: declaredDomain ? `https://${declaredDomain}` : null,
      confidence: verified ? (explicitCompany ? 95 : 85) : 0,
      confidenceReasoning,
      identityStatus: verified
        ? LeadIdentityStatus.VERIFIED
        : LeadIdentityStatus.UNVERIFIED,
      reasons,
    }
  }

  private companyFromContent(content: string) {
    const searchable = content.slice(0, 5_000)
    for (const match of searchable.matchAll(COMPANY_NAME_PATTERN)) {
      const company = this.meaningfulCompany(match[1])
      if (company) return company
    }
    return null
  }

  private meaningfulCompany(value: string | null | undefined) {
    if (!value) return null
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (
      normalized.length < 2 ||
      normalized.length > 120 ||
      normalized.includes('@') ||
      /^(unknown|website source|home|homepage|about us)$/i.test(normalized)
    ) {
      return null
    }
    const semanticName = normalized
      .toLowerCase()
      .replace(/[.,]/g, '')
      .replace(/\s+/g, ' ')
    if (GENERIC_COMPANY_NAMES.has(semanticName)) return null

    const meaningfulTokens = semanticName
      .split(/[\s&/-]+/)
      .filter(Boolean)
      .filter(
        (token) =>
          !GENERIC_TOKENS.has(token) &&
          !/^(gmbh|ag|ltd|limited|inc|llc|corp|corporation|co|plc|se)$/.test(
            token,
          ),
      )
    if (meaningfulTokens.length === 0) return null
    return normalized
  }

  private readString(metadata: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = metadata[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return null
  }

  private isBrandAligned(companyName: string, domain: string) {
    const domainIdentity = domain
      .split('.')
      .slice(0, -1)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    const tokens = companyName
      .toLowerCase()
      .split(/[\s&/.-]+/)
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean)
      .filter(
        (token) =>
          !GENERIC_TOKENS.has(token) &&
          !/^(gmbh|ag|ltd|limited|inc|llc|corp|corporation|co|plc|se|bv)$/.test(
            token,
          ),
      )

    return tokens.some(
      (token) =>
        token.length >= 2 &&
        (domainIdentity.includes(token) || token.includes(domainIdentity)),
    )
  }

  private corroboratedOfficialBrand(
    result: CompanyIdentityEvidence,
    domain: string | null,
  ) {
    if (!domain) return null
    const title =
      typeof result.metadata.title === 'string'
        ? result.metadata.title
        : ''
    if (!title) return null

    const domainTokens = domain
      .toLowerCase()
      .split('.')
      .slice(0, -1)
      .flatMap((label) => label.split(/[-_]/))
      .map((token) => token.replace(/[^a-z0-9]/g, ''))
      .filter(
        (token) =>
          token.length >= 3 &&
          !/^(www|group|groupe|global|company|industries|industrial|tech|technology)$/.test(
            token,
          ),
      )
    const content = result.rawContent.toLowerCase()

    for (const token of domainTokens) {
      const titleMatch = title.match(
        new RegExp(`\\b(${this.escapeRegExp(token)})\\b`, 'i'),
      )
      if (!titleMatch) continue
      const occurrences =
        content.match(new RegExp(`\\b${this.escapeRegExp(token)}\\b`, 'gi'))
          ?.length ?? 0
      if (occurrences < 2) continue

      const candidate = this.meaningfulCompany(titleMatch[1])
      if (candidate) return candidate
    }
    return null
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private domainFromUrl(value: string) {
    try {
      return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    } catch {
      return null
    }
  }

  private normalizeDomain(value: string | null) {
    if (!value) return null
    try {
      const url = new URL(
        /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`,
      )
      const host = url.hostname.toLowerCase().replace(/^www\./, '')
      return /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
        host,
      )
        ? host
        : null
    } catch {
      return null
    }
  }

  private isBlockedHost(host: string) {
    return [...BLOCKED_HOSTS].some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    )
  }
}

export const companyIdentityExtraction =
  new CompanyIdentityExtractionService()
