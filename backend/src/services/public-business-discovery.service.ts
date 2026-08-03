import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export type PublicEvidenceField =
  | 'name'
  | 'jobTitle'
  | 'company'
  | 'email'
  | 'phone'
  | 'socialProfile'
  | 'website'
  | 'relationship'

export interface PublicFieldEvidence {
  field: PublicEvidenceField
  value: string
  sourceUrl: string
  extractionMethod:
    | 'mailto'
    | 'tel'
    | 'labeled_text'
    | 'link'
    | 'json_ld'
    | 'provider_metadata'
  verificationStatus: 'OBSERVED'
  observedAt: string
}

export interface PublicContactCandidate {
  name: string | null
  jobTitle: string | null
  company: string | null
  emails: string[]
  phones: string[]
  socialProfiles: string[]
  evidence: PublicFieldEvidence[]
}

export type PublicBusinessRelationship =
  | 'supplier'
  | 'distributor'
  | 'reseller'
  | 'system_integrator'
  | 'intermediary'
  | 'partner'

export interface RelatedBusinessCandidate {
  name: string
  website: string
  relationship: PublicBusinessRelationship
  evidence: PublicFieldEvidence[]
}

export interface PublicOrganizationCandidate {
  name: string | null
  website: string
  emails: string[]
  phones: string[]
  socialProfiles: string[]
  evidence: PublicFieldEvidence[]
}

export interface PublicWebsiteDiscoveryResult {
  status: 'COMPLETED' | 'PARTIAL' | 'BLOCKED' | 'NO_SEED'
  seedUrl: string | null
  pagesVisited: string[]
  organization: PublicOrganizationCandidate | null
  contacts: PublicContactCandidate[]
  relatedBusinesses: RelatedBusinessCandidate[]
  errors: Array<{ url: string; reason: string }>
}

export interface PublicBusinessPageExtraction {
  title: string
  sameOriginLinks: string[]
  organization: PublicOrganizationCandidate | null
  contacts: PublicContactCandidate[]
  relatedBusinesses: RelatedBusinessCandidate[]
}

export interface PublicWebsiteDiscoveryInput {
  seedUrls: string[]
  companyName?: string | null
}

interface DiscoveryOptions {
  fetcher?: typeof fetch
  validateUrl?: (url: URL) => Promise<void>
  now?: () => Date
  maxPages?: number
  maxBytes?: number
  timeoutMs?: number
  cacheTtlMs?: number
}

const PAGE_LINK_KEYWORDS =
  /\b(contact|about|team|leadership|management|people|company|imprint|legal|partner|dealer|distributor|reseller|supplier|vendor|integrator|representative|agent|broker|network)\b|联系|关于|团队|管理层|合作伙伴|经销商|分销商|供应商|代理商/i
const SOCIAL_HOSTS =
  /(?:^|\.)(?:linkedin\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com|wechat\.com)$/i
const NON_BUSINESS_HOSTS =
  /(?:^|\.)(?:google\.com|googleapis\.com|gstatic\.com|cloudflare\.com|cloudfront\.net|doubleclick\.net|w3\.org|schema\.org)$/i

export class PublicWebsiteDiscoveryService {
  private readonly fetcher: typeof fetch
  private readonly validateUrl: (url: URL) => Promise<void>
  private readonly now: () => Date
  private readonly maxPages: number
  private readonly maxBytes: number
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly cache = new Map<
    string,
    { expiresAt: number; result: PublicWebsiteDiscoveryResult }
  >()

  constructor(options: DiscoveryOptions = {}) {
    this.fetcher = options.fetcher ?? fetch
    this.validateUrl = options.validateUrl ?? assertPublicUrl
    this.now = options.now ?? (() => new Date())
    this.maxPages = Math.min(Math.max(options.maxPages ?? 8, 1), 12)
    this.maxBytes = Math.min(
      Math.max(options.maxBytes ?? 512 * 1024, 16 * 1024),
      1024 * 1024,
    )
    this.timeoutMs = Math.min(Math.max(options.timeoutMs ?? 8_000, 1_000), 20_000)
    this.cacheTtlMs = Math.max(options.cacheTtlMs ?? 5 * 60_000, 0)
  }

  async discover(
    input: PublicWebsiteDiscoveryInput,
  ): Promise<PublicWebsiteDiscoveryResult> {
    const seed = input.seedUrls
      .map(normalizePublicSeed)
      .find((value): value is URL => value !== null)

    if (!seed) return emptyResult('NO_SEED')

    const cacheKey = `${stripTracking(seed.href)}|${input.companyName ?? ''}`.toLowerCase()
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result

    const errors: Array<{ url: string; reason: string }> = []
    try {
      await this.validateUrl(seed)
    } catch (error) {
      return {
        ...emptyResult('BLOCKED'),
        seedUrl: seed.href,
        errors: [{ url: seed.href, reason: errorMessage(error) }],
      }
    }

    const robots = await this.readRobots(seed, errors)
    const queue = [seed.href]
    const queued = new Set(queue)
    const pagesVisited: string[] = []
    const pageExtractions: PublicBusinessPageExtraction[] = []

    while (queue.length > 0 && pagesVisited.length < this.maxPages) {
      const pageUrl = queue.shift()
      if (!pageUrl) break
      const parsed = new URL(pageUrl)

      if (!isAllowedByRobots(parsed, robots)) {
        errors.push({ url: pageUrl, reason: 'Blocked by robots.txt' })
        continue
      }

      try {
        const html = await this.fetchHtml(parsed)
        pagesVisited.push(pageUrl)
        const extraction = extractPublicBusinessPage(
          html,
          pageUrl,
          input.companyName ?? null,
          this.now().toISOString(),
        )
        pageExtractions.push(extraction)

        for (const link of extraction.sameOriginLinks) {
          if (
            queue.length + pagesVisited.length >= this.maxPages ||
            queued.has(link)
          ) {
            continue
          }
          queued.add(link)
          queue.push(link)
        }
      } catch (error) {
        errors.push({ url: pageUrl, reason: errorMessage(error) })
      }
    }

    const result: PublicWebsiteDiscoveryResult = {
      status:
        pagesVisited.length === 0
          ? 'BLOCKED'
          : errors.length > 0
            ? 'PARTIAL'
            : 'COMPLETED',
      seedUrl: seed.href,
      pagesVisited,
      organization: mergeOrganizations(
        pageExtractions.map((page) => page.organization),
        seed.href,
        input.companyName ?? null,
      ),
      contacts: mergeContacts(pageExtractions.flatMap((page) => page.contacts)),
      relatedBusinesses: mergeRelatedBusinesses(
        pageExtractions.flatMap((page) => page.relatedBusinesses),
      ),
      errors,
    }

    if (this.cacheTtlMs > 0) {
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + this.cacheTtlMs,
        result,
      })
    }
    return result
  }

  private async readRobots(
    seed: URL,
    errors: Array<{ url: string; reason: string }>,
  ): Promise<RobotsPolicy> {
    const robotsUrl = new URL('/robots.txt', seed)
    try {
      const text = await this.fetchText(robotsUrl, 'text/plain')
      return parseRobots(text)
    } catch (error) {
      errors.push({
        url: robotsUrl.href,
        reason: `robots.txt unavailable: ${errorMessage(error)}`,
      })
      return { disallow: [], allow: [] }
    }
  }

  private async fetchHtml(url: URL): Promise<string> {
    return this.fetchText(url, 'text/html')
  }

  private async fetchText(url: URL, expectedType: string): Promise<string> {
    let current = url
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      await this.validateUrl(current)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const response = await this.fetcher(current, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept:
              expectedType === 'text/html'
                ? 'text/html,application/xhtml+xml'
                : 'text/plain',
            'User-Agent':
              'SalesRadarAI-PublicEvidenceBot/1.0 (+public business evidence; respects robots.txt)',
          },
        })

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          if (!location || redirects === 3) {
            throw new Error('Unsafe or excessive redirect')
          }
          const redirected = new URL(location, current)
          if (!sameBusinessSite(redirected, url)) {
            throw new Error('Cross-origin redirects are not followed')
          }
          current = redirected
          continue
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const contentType =
          response.headers.get('content-type')?.toLowerCase() ?? ''
        if (contentType && !contentType.includes(expectedType)) {
          throw new Error(`Unsupported content type: ${contentType}`)
        }
        return await readResponseBody(response, this.maxBytes)
      } finally {
        clearTimeout(timeout)
      }
    }
    throw new Error('Unable to fetch page')
  }
}

export function extractPublicBusinessPage(
  html: string,
  pageUrl: string,
  fallbackCompany: string | null = null,
  observedAt = new Date().toISOString(),
): PublicBusinessPageExtraction {
  const page = new URL(pageUrl)
  const title = decodeHtml(
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '',
  ).replace(/\s+/g, ' ').trim()
  const links = extractLinks(html, page)
  const jsonLd = extractJsonLd(html)
  const jsonLdPeople = collectJsonLdNodes(jsonLd, 'Person')
  const jsonLdOrganizations = collectJsonLdNodes(jsonLd, 'Organization')
  const contacts: PublicContactCandidate[] = jsonLdPeople.map((person) =>
    contactFromJsonLd(person, pageUrl, fallbackCompany, observedAt),
  )

  const mailLinks = links
    .filter((link) => link.kind === 'email')
    .map((link) => link.value)
  const phoneLinks = links
    .filter((link) => link.kind === 'phone')
    .map((link) => link.value)
  const socialLinks = links
    .filter((link) => link.kind === 'social')
    .map((link) => link.value)
  const visibleText = htmlToVisibleText(html)
  const visibleEmails = extractVisibleEmails(visibleText)
  const visiblePhones = extractLabeledPhones(visibleText)
  const emails = unique([...mailLinks, ...visibleEmails])
  const phones = unique([...phoneLinks, ...visiblePhones])
  const socialProfiles = unique(socialLinks)
  let pageContactEvidence: PublicFieldEvidence[] = []

  if (emails.length > 0 || phones.length > 0 || socialProfiles.length > 0) {
    pageContactEvidence = [
      ...emails.map((value) =>
        fieldEvidence(
          'email',
          value,
          pageUrl,
          mailLinks.includes(value) ? 'mailto' : 'labeled_text',
          observedAt,
        ),
      ),
      ...phones.map((value) =>
        fieldEvidence(
          'phone',
          value,
          pageUrl,
          phoneLinks.includes(value) ? 'tel' : 'labeled_text',
          observedAt,
        ),
      ),
      ...socialProfiles.map((value) =>
        fieldEvidence('socialProfile', value, pageUrl, 'link', observedAt),
      ),
    ]
    contacts.push({
      name: null,
      jobTitle: null,
      company: fallbackCompany,
      emails,
      phones,
      socialProfiles,
      evidence: pageContactEvidence,
    })
  }

  const organization = organizationFromPage(
    jsonLdOrganizations[0],
    pageUrl,
    fallbackCompany,
    pageContactEvidence,
    observedAt,
  )
  const relationship = relationshipFromPage(pageUrl, title, visibleText)
  const relatedBusinesses = relationship
    ? links
        .filter(
          (link) =>
            link.kind === 'web' &&
            !sameBusinessSite(new URL(link.value), page) &&
            !SOCIAL_HOSTS.test(new URL(link.value).hostname) &&
            !NON_BUSINESS_HOSTS.test(new URL(link.value).hostname) &&
            isBusinessAnchor(link.label),
        )
        .slice(0, 30)
        .map((link) => ({
          name: link.label,
          website: link.value,
          relationship,
          evidence: [
            fieldEvidence(
              'relationship',
              relationship,
              pageUrl,
              'link',
              observedAt,
            ),
            fieldEvidence('website', link.value, pageUrl, 'link', observedAt),
            fieldEvidence('company', link.label, pageUrl, 'link', observedAt),
          ],
        }))
    : []

  const sameOriginLinks = links
    .filter(
      (link) =>
        link.kind === 'web' &&
        sameBusinessSite(new URL(link.value), page) &&
        PAGE_LINK_KEYWORDS.test(`${link.label} ${new URL(link.value).pathname}`),
    )
    .map((link) => stripTracking(link.value))

  return {
    title,
    sameOriginLinks: unique(sameOriginLinks),
    organization,
    contacts: mergeContacts(contacts),
    relatedBusinesses: mergeRelatedBusinesses(relatedBusinesses),
  }
}

interface ExtractedLink {
  kind: 'email' | 'phone' | 'social' | 'web'
  value: string
  label: string
}

function extractLinks(html: string, page: URL): ExtractedLink[] {
  const links: ExtractedLink[] = []
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1] ?? match[2] ?? match[3] ?? '').trim()
    const label = htmlToVisibleText(match[4] ?? '').replace(/\s+/g, ' ').trim()
    if (!href || /^(?:javascript|data):/i.test(href)) continue
    if (/^mailto:/i.test(href)) {
      const email = normalizeEmail(href.slice(7).split('?')[0] ?? '')
      if (email) links.push({ kind: 'email', value: email, label })
      continue
    }
    if (/^tel:/i.test(href)) {
      const phone = normalizePhone(href.slice(4).split('?')[0] ?? '')
      if (phone) links.push({ kind: 'phone', value: phone, label })
      continue
    }
    try {
      const url = new URL(href, page)
      if (!['http:', 'https:'].includes(url.protocol)) continue
      const value = stripTracking(url.href)
      links.push({
        kind: SOCIAL_HOSTS.test(url.hostname) ? 'social' : 'web',
        value,
        label,
      })
    } catch {
      // Ignore malformed public links.
    }
  }
  return links
}

function extractJsonLd(html: string): unknown[] {
  const values: unknown[] = []
  const pattern = /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(pattern)) {
    const raw = decodeHtml(match[1] ?? '').trim()
    if (!raw) continue
    try {
      values.push(JSON.parse(raw) as unknown)
    } catch {
      // Invalid JSON-LD is not evidence.
    }
  }
  return values
}

function collectJsonLdNodes(
  values: unknown[],
  expectedType: 'Person' | 'Organization',
): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const type = record['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.some((item) => item === expectedType)) nodes.push(record)
    Object.values(record).forEach(visit)
  }
  values.forEach(visit)
  return nodes
}

function contactFromJsonLd(
  person: Record<string, unknown>,
  sourceUrl: string,
  fallbackCompany: string | null,
  observedAt: string,
): PublicContactCandidate {
  const name = readString(person.name)
  const jobTitle = readString(person.jobTitle)
  const worksFor =
    person.worksFor && typeof person.worksFor === 'object'
      ? readString((person.worksFor as Record<string, unknown>).name)
      : null
  const company = worksFor ?? fallbackCompany
  const emails = unique(readStrings(person.email).map(normalizeEmail).filter(isString))
  const phones = unique(
    readStrings(person.telephone).map(normalizePhone).filter(isString),
  )
  const socialProfiles = unique(
    readStrings(person.sameAs).filter((value) => isSocialUrl(value)),
  )
  const evidence = [
    name ? fieldEvidence('name', name, sourceUrl, 'json_ld', observedAt) : null,
    jobTitle
      ? fieldEvidence('jobTitle', jobTitle, sourceUrl, 'json_ld', observedAt)
      : null,
    worksFor
      ? fieldEvidence('company', worksFor, sourceUrl, 'json_ld', observedAt)
      : null,
    ...emails.map((value) =>
      fieldEvidence('email', value, sourceUrl, 'json_ld', observedAt),
    ),
    ...phones.map((value) =>
      fieldEvidence('phone', value, sourceUrl, 'json_ld', observedAt),
    ),
    ...socialProfiles.map((value) =>
      fieldEvidence('socialProfile', value, sourceUrl, 'json_ld', observedAt),
    ),
  ].filter((value): value is PublicFieldEvidence => value !== null)
  return { name, jobTitle, company, emails, phones, socialProfiles, evidence }
}

function organizationFromPage(
  organization: Record<string, unknown> | undefined,
  sourceUrl: string,
  fallbackCompany: string | null,
  pageContactEvidence: PublicFieldEvidence[],
  observedAt: string,
): PublicOrganizationCandidate {
  const observedName = readString(organization?.name)
  const name = observedName ?? fallbackCompany
  const observedWebsite = readString(organization?.url)
  const website = observedWebsite?.match(/^https?:\/\//i)
    ? observedWebsite
    : new URL(sourceUrl).origin
  const jsonLdEmails = unique(
    readStrings(organization?.email).map(normalizeEmail).filter(isString),
  )
  const jsonLdPhones = unique(
    readStrings(organization?.telephone).map(normalizePhone).filter(isString),
  )
  const jsonLdSocials = unique(
    readStrings(organization?.sameAs).filter((value) => isSocialUrl(value)),
  )
  const emails = unique([
    ...jsonLdEmails,
    ...pageContactEvidence
      .filter((item) => item.field === 'email')
      .map((item) => item.value),
  ])
  const phones = unique([
    ...jsonLdPhones,
    ...pageContactEvidence
      .filter((item) => item.field === 'phone')
      .map((item) => item.value),
  ])
  const socialProfiles = unique([
    ...jsonLdSocials,
    ...pageContactEvidence
      .filter((item) => item.field === 'socialProfile')
      .map((item) => item.value),
  ])
  const evidence: PublicFieldEvidence[] = uniqueEvidence([
    ...(observedName
      ? [fieldEvidence('company', observedName, sourceUrl, 'json_ld', observedAt)]
      : []),
    fieldEvidence(
      'website',
      website,
      sourceUrl,
      observedWebsite ? 'json_ld' : 'link',
      observedAt,
    ),
    ...jsonLdEmails.map((value) =>
      fieldEvidence('email', value, sourceUrl, 'json_ld', observedAt),
    ),
    ...jsonLdPhones.map((value) =>
      fieldEvidence('phone', value, sourceUrl, 'json_ld', observedAt),
    ),
    ...jsonLdSocials.map((value) =>
      fieldEvidence('socialProfile', value, sourceUrl, 'json_ld', observedAt),
    ),
    ...pageContactEvidence,
  ])
  return { name, website, emails, phones, socialProfiles, evidence }
}

function extractVisibleEmails(text: string): string[] {
  return unique(
    [...text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)]
      .map((match) => normalizeEmail(match[0]))
      .filter(isString),
  )
}

function extractLabeledPhones(text: string): string[] {
  const values: string[] = []
  const pattern = /(?:phone|telephone|tel|mobile|whatsapp|contact|fax|电话|手機|手机|传真)\s*[:：]?\s*(\+?[\d][\d\s()./-]{6,}[\d])/gi
  for (const match of text.matchAll(pattern)) {
    const phone = normalizePhone(match[1] ?? '')
    if (phone) values.push(phone)
  }
  return unique(values)
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().replace(/^mailto:/i, '').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return null
  if (/\.(?:png|jpe?g|gif|svg|webp)$/i.test(email)) return null
  if (/@(?:example|test|localhost)\./i.test(email)) return null
  return email
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim().replace(/^tel:/i, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return `${trimmed.startsWith('+') ? '+' : ''}${digits}`
}

function relationshipFromPage(
  url: string,
  title: string,
  text: string,
): PublicBusinessRelationship | null {
  const haystack = `${new URL(url).pathname} ${title} ${text.slice(0, 20_000)}`
  if (/\b(system integrator|systems integrator|integration partner)\b/i.test(haystack)) {
    return 'system_integrator'
  }
  if (/\b(distributors?|dealers?|stockists?)\b|经销商|分销商/i.test(haystack)) {
    return 'distributor'
  }
  if (/\b(reseller|value-added reseller|\bvar\b)\b/i.test(haystack)) {
    return 'reseller'
  }
  if (/\b(suppliers?|vendors?|manufacturers?)\b|供应商|制造商/i.test(haystack)) {
    return 'supplier'
  }
  if (/\b(broker|commercial agent|sales agent|representative|intermediary|sourcing agent)\b|代理商|中介/i.test(haystack)) {
    return 'intermediary'
  }
  if (/\b(partner|alliance)\b|合作伙伴/i.test(haystack)) return 'partner'
  return null
}

function mergeOrganizations(
  organizations: Array<PublicOrganizationCandidate | null>,
  seedUrl: string,
  fallbackCompany: string | null,
): PublicOrganizationCandidate {
  const available = organizations.filter(
    (value): value is PublicOrganizationCandidate => value !== null,
  )
  return {
    name: available.find((value) => value.name)?.name ?? fallbackCompany,
    website: available.find((value) => value.website)?.website ?? seedUrl,
    emails: unique(available.flatMap((value) => value.emails)),
    phones: unique(available.flatMap((value) => value.phones)),
    socialProfiles: unique(available.flatMap((value) => value.socialProfiles)),
    evidence: uniqueEvidence(available.flatMap((value) => value.evidence)),
  }
}

function mergeContacts(contacts: PublicContactCandidate[]): PublicContactCandidate[] {
  const merged = new Map<string, PublicContactCandidate>()
  for (const contact of contacts) {
    const key = [
      contact.name ?? 'unknown',
      contact.jobTitle ?? 'unknown',
      contact.company ?? 'unknown',
    ]
      .join('|')
      .toLowerCase()
    const current = merged.get(key)
    if (!current) {
      merged.set(key, contact)
      continue
    }
    current.emails = unique([...current.emails, ...contact.emails])
    current.phones = unique([...current.phones, ...contact.phones])
    current.socialProfiles = unique([
      ...current.socialProfiles,
      ...contact.socialProfiles,
    ])
    current.evidence = uniqueEvidence([...current.evidence, ...contact.evidence])
  }
  return [...merged.values()]
}

function mergeRelatedBusinesses(
  businesses: RelatedBusinessCandidate[],
): RelatedBusinessCandidate[] {
  const merged = new Map<string, RelatedBusinessCandidate>()
  for (const business of businesses) {
    const key = `${business.relationship}|${stripTracking(business.website)}`.toLowerCase()
    const current = merged.get(key)
    if (!current) {
      merged.set(key, business)
      continue
    }
    current.evidence = uniqueEvidence([...current.evidence, ...business.evidence])
  }
  return [...merged.values()]
}

interface RobotsPolicy {
  allow: string[]
  disallow: string[]
}

export function parseRobots(
  content: string,
  userAgent = 'salesradarai-publicevidencebot',
): RobotsPolicy {
  const groups: Array<RobotsPolicy & { agents: string[] }> = []
  let current: RobotsPolicy & { agents: string[] } = {
    agents: [],
    allow: [],
    disallow: [],
  }
  const flush = () => {
    if (current.agents.length > 0) groups.push(current)
    current = { agents: [], allow: [], disallow: [] }
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) {
      if (current.allow.length > 0 || current.disallow.length > 0) flush()
      continue
    }
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (key === 'user-agent') {
      if (current.allow.length > 0 || current.disallow.length > 0) flush()
      if (value) current.agents.push(value.toLowerCase())
      continue
    }
    if (current.agents.length === 0 || !value.startsWith('/')) continue
    if (key === 'allow') current.allow.push(value)
    if (key === 'disallow' && value) current.disallow.push(value)
  }
  flush()

  const normalizedAgent = userAgent.toLowerCase()
  const exactGroups = groups.filter((group) =>
    group.agents.some(
      (agent) => agent !== '*' && normalizedAgent.includes(agent),
    ),
  )
  const selected =
    exactGroups.length > 0
      ? exactGroups
      : groups.filter((group) => group.agents.includes('*'))
  return {
    allow: unique(selected.flatMap((group) => group.allow)),
    disallow: unique(selected.flatMap((group) => group.disallow)),
  }
}

function isAllowedByRobots(url: URL, policy: RobotsPolicy): boolean {
  const path = `${url.pathname}${url.search}`
  const longestAllow = Math.max(
    0,
    ...policy.allow
      .filter((rule) => robotsRuleMatches(path, rule))
      .map(robotsRuleSpecificity),
  )
  const longestDisallow = Math.max(
    0,
    ...policy.disallow
      .filter((rule) => robotsRuleMatches(path, rule))
      .map(robotsRuleSpecificity),
  )
  return longestAllow >= longestDisallow
}

function robotsRuleMatches(path: string, rule: string): boolean {
  const anchoredAtEnd = rule.endsWith('$')
  const pattern = (anchoredAtEnd ? rule.slice(0, -1) : rule)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${pattern}${anchoredAtEnd ? '$' : ''}`).test(path)
}

function robotsRuleSpecificity(rule: string): number {
  return rule.replace(/\*/g, '').replace(/\$$/, '').length
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only public HTTP(S) URLs are supported')
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Private host is blocked')
  }
  const literalType = isIP(hostname)
  if (literalType > 0 && isPrivateAddress(hostname)) {
    throw new Error('Private network address is blocked')
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('Host resolves to a private or unavailable address')
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  if (normalized === '::1' || normalized === '::') return true
  if (/^(?:fc|fd|fe[89ab])/.test(normalized)) return true
  if (normalized.startsWith('::ffff:')) {
    return true
  }
  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function normalizePublicSeed(value: string): URL | null {
  const candidate = value.trim()
  if (!candidate) return null
  try {
    const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (SOCIAL_HOSTS.test(url.hostname) || NON_BUSINESS_HOSTS.test(url.hostname)) return null
    url.hash = ''
    return url
  } catch {
    return null
  }
}

function htmlToVisibleText(html: string): string {
  return decodeHtml(
    html
      .replace(/<(?:script|style|noscript|template)\b[\s\S]*?<\/(?:script|style|noscript|template)>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, digits: string) =>
      String.fromCodePoint(Number(digits)),
    )
}

function stripTracking(value: string): string {
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
        url.searchParams.delete(key)
      }
    }
    url.hash = ''
    return url.href
  } catch {
    return value
  }
}

function sameBusinessSite(left: URL, right: URL): boolean {
  const normalizeHost = (hostname: string) =>
    hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  return normalizeHost(left.hostname) === normalizeHost(right.hostname)
}

function isBusinessAnchor(label: string): boolean {
  const cleaned = label.replace(/\s+/g, ' ').trim()
  return (
    cleaned.length >= 2 &&
    cleaned.length <= 100 &&
    !/^(?:learn more|read more|visit|website|home|contact|click here|privacy|terms|cookie|login|sign in|facebook|linkedin|instagram|youtube|x|twitter)$/i.test(
      cleaned,
    )
  )
}

function fieldEvidence(
  field: PublicEvidenceField,
  value: string,
  sourceUrl: string,
  extractionMethod: PublicFieldEvidence['extractionMethod'],
  observedAt: string,
): PublicFieldEvidence {
  return {
    field,
    value,
    sourceUrl,
    extractionMethod,
    verificationStatus: 'OBSERVED',
    observedAt,
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function uniqueEvidence(values: PublicFieldEvidence[]): PublicFieldEvidence[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = `${value.field}|${value.value}|${value.sourceUrl}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(isString).map((item) => item.trim())
  const single = readString(value)
  return single ? [single] : []
}

function isString(value: string | null): value is string {
  return value !== null
}

function isSocialUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      SOCIAL_HOSTS.test(url.hostname)
    )
  } catch {
    return false
  }
}

async function readResponseBody(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`Response exceeds ${maxBytes} bytes`)
  }
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let output = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`Response exceeds ${maxBytes} bytes`)
    }
    output += decoder.decode(value, { stream: true })
  }
  return output + decoder.decode()
}

function emptyResult(
  status: PublicWebsiteDiscoveryResult['status'],
): PublicWebsiteDiscoveryResult {
  return {
    status,
    seedUrl: null,
    pagesVisited: [],
    organization: null,
    contacts: [],
    relatedBusinesses: [],
    errors: [],
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const publicWebsiteDiscovery = new PublicWebsiteDiscoveryService()
