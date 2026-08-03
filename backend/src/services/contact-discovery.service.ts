import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import {
  publicWebsiteDiscovery,
  type PublicContactCandidate,
  type PublicFieldEvidence,
  type PublicOrganizationCandidate,
  type PublicWebsiteDiscoveryInput,
  type PublicWebsiteDiscoveryResult,
} from './public-business-discovery.service.js'
import { toSafeJson } from './safe-json.service.js'

export type ContactRole =
  | 'decision_maker'
  | 'influencer'
  | 'technical_contact'
  | 'unknown'

export type ContactEvidence = string | PublicFieldEvidence

export interface DiscoveredContact {
  name: string
  jobTitle: string
  company: string
  source: string
  profileUrl: string
  email: string
  phone: string
  contactRole: ContactRole
  confidence: number
  evidence: ContactEvidence[]
}

const UNKNOWN = 'Unknown'

interface ContactLead {
  company: string | null
  normalizedDomain: string | null
  jobTitle: string | null
  platform: string
  sourceUrl: string
  profileUrl: string
  sourceMetadata: Prisma.JsonValue | null
}

export interface ContactDiscoveryRepository {
  findContacts(leadId: string): Promise<unknown[]>
  findLead(leadId: string): Promise<ContactLead | null>
  createContacts(
    leadId: string,
    contacts: DiscoveredContact[],
  ): Promise<unknown[]>
}

export interface PublicContactDiscoveryProvider {
  discover(input: PublicWebsiteDiscoveryInput): Promise<PublicWebsiteDiscoveryResult>
}

const prismaContactRepository: ContactDiscoveryRepository = {
  findContacts: (leadId) =>
    prisma.contactProfile.findMany({
      where: { leadId },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
    }),
  findLead: (leadId) => prisma.lead.findUnique({ where: { id: leadId } }),
  createContacts: async (leadId, contacts) => {
    const hasObservedContact = contacts.some(
      (contact) =>
        contact.name !== UNKNOWN ||
        contact.jobTitle !== UNKNOWN ||
        contact.email !== UNKNOWN ||
        contact.phone !== UNKNOWN ||
        contact.profileUrl !== UNKNOWN,
    )
    await prisma.$transaction([
      ...(hasObservedContact
        ? [
            prisma.contactProfile.deleteMany({
              where: {
                leadId,
                name: UNKNOWN,
                jobTitle: UNKNOWN,
                profileUrl: UNKNOWN,
                email: UNKNOWN,
                phone: UNKNOWN,
              },
            }),
          ]
        : []),
      ...contacts.map((contact) =>
        prisma.contactProfile.upsert({
          where: {
            leadId_name_jobTitle_profileUrl: {
              leadId,
              name: contact.name,
              jobTitle: contact.jobTitle,
              profileUrl: contact.profileUrl,
            },
          },
          create: {
            leadId,
            ...contact,
            evidence: toSafeJson(contact.evidence),
          },
          update: {
            company: contact.company,
            source: contact.source,
            email: contact.email,
            phone: contact.phone,
            contactRole: contact.contactRole,
            confidence: contact.confidence,
            evidence: toSafeJson(contact.evidence),
          },
        }),
      ),
    ])
    return prisma.contactProfile.findMany({
      where: { leadId },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
    })
  },
}

export class ContactDiscoveryService {
  constructor(
    private readonly repository: ContactDiscoveryRepository =
      prismaContactRepository,
    private readonly publicDiscovery: PublicContactDiscoveryProvider =
      publicWebsiteDiscovery,
  ) {}

  async discover(leadId: string, refresh = false) {
    const existing = await this.repository.findContacts(leadId)
    if (existing.length > 0 && !refresh) return existing

    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')

    const metadataContacts = this.extract({
      company: lead.company,
      jobTitle: lead.jobTitle,
      platform: lead.platform,
      sourceUrl: lead.sourceUrl,
      profileUrl: lead.profileUrl,
      sourceMetadata: lead.sourceMetadata,
    }).filter((contact) => !this.isEmptyPlaceholder(contact))
    const seedUrls = this.publicSeedUrls(lead)
    const publicResult = await this.safePublicDiscovery({
      seedUrls,
      companyName: lead.company,
    })
    const publicContacts = this.toPublicContacts(publicResult, lead.company)
    const candidates = this.uniqueContacts([
      ...metadataContacts,
      ...publicContacts,
    ])

    if (candidates.length > 0) {
      return this.repository.createContacts(leadId, candidates)
    }
    if (existing.length > 0) return existing

    return this.repository.createContacts(leadId, [
      this.unknownContact(lead, publicResult),
    ])
  }

  list(leadId: string) {
    return this.repository.findContacts(leadId)
  }

  extract(input: {
    company: string | null
    jobTitle: string | null
    platform: string
    sourceUrl: string
    profileUrl: string
    sourceMetadata: Prisma.JsonValue | null
  }): DiscoveredContact[] {
    const metadata = this.record(input.sourceMetadata)
    const rawContacts = Array.isArray(metadata.contacts)
      ? metadata.contacts.filter(
          (value): value is Record<string, unknown> =>
            Boolean(value) &&
            typeof value === 'object' &&
            !Array.isArray(value),
        )
      : []
    const sources = rawContacts.length > 0 ? rawContacts : [metadata]
    const contacts = sources
      .map((source) => this.toContact(input, source))
      .filter(
        (contact) =>
          contact.name !== UNKNOWN ||
          contact.jobTitle !== UNKNOWN ||
          contact.email !== UNKNOWN ||
          contact.phone !== UNKNOWN ||
          contact.profileUrl !== UNKNOWN,
      )

    if (contacts.length > 0) return this.uniqueContacts(contacts)
    return [this.unknownContact(input, null)]
  }

  private toContact(
    input: {
      company: string | null
      jobTitle: string | null
      platform: string
      sourceUrl: string
      profileUrl: string
    },
    source: Record<string, unknown>,
  ): DiscoveredContact {
    const name =
      this.read(source, ['name', 'contactName', 'personName', 'fullName', 'author']) ??
      UNKNOWN
    const jobTitle =
      this.read(source, ['jobTitle', 'position', 'role']) ??
      input.jobTitle ??
      UNKNOWN
    const company =
      this.read(source, ['company', 'companyName', 'organization']) ??
      input.company ??
      UNKNOWN
    const profileUrl =
      this.read(source, ['profileUrl', 'linkedinUrl', 'linkedin']) ??
      (name !== UNKNOWN && this.isPersonProfile(input.profileUrl)
        ? input.profileUrl
        : UNKNOWN)
    const email = this.read(source, ['email', 'contactEmail']) ?? UNKNOWN
    const phone = this.read(source, ['phone', 'telephone']) ?? UNKNOWN
    const observedAt = new Date().toISOString()
    const evidence = [
      name !== UNKNOWN
        ? this.providerEvidence('name', name, input.sourceUrl, observedAt)
        : null,
      jobTitle !== UNKNOWN
        ? this.providerEvidence('jobTitle', jobTitle, input.sourceUrl, observedAt)
        : null,
      company !== UNKNOWN
        ? this.providerEvidence('company', company, input.sourceUrl, observedAt)
        : null,
      profileUrl !== UNKNOWN
        ? this.providerEvidence(
            'socialProfile',
            profileUrl,
            input.sourceUrl,
            observedAt,
          )
        : null,
      email !== UNKNOWN
        ? this.providerEvidence('email', email, input.sourceUrl, observedAt)
        : null,
      phone !== UNKNOWN
        ? this.providerEvidence('phone', phone, input.sourceUrl, observedAt)
        : null,
    ].filter((value): value is PublicFieldEvidence => value !== null)
    const confidence = Math.min(
      100,
      (name !== UNKNOWN ? 30 : 0) +
        (jobTitle !== UNKNOWN ? 25 : 0) +
        (profileUrl !== UNKNOWN ? 15 : 0) +
        (email !== UNKNOWN ? 15 : 0) +
        (phone !== UNKNOWN ? 15 : 0),
    )

    return {
      name,
      jobTitle,
      company,
      source: `${input.platform}: ${input.sourceUrl}`,
      profileUrl,
      email,
      phone,
      contactRole: this.classifyRole(jobTitle),
      confidence,
      evidence,
    }
  }

  private toPublicContacts(
    result: PublicWebsiteDiscoveryResult,
    fallbackCompany: string | null,
  ): DiscoveredContact[] {
    const candidates: PublicContactCandidate[] = [...result.contacts]
    if (result.organization) {
      candidates.push(this.organizationContact(result.organization))
    }

    return candidates
      .filter(
        (candidate) =>
          candidate.name ||
          candidate.jobTitle ||
          candidate.emails.length > 0 ||
          candidate.phones.length > 0 ||
          candidate.socialProfiles.length > 0,
      )
      .map((candidate) => {
        const name = candidate.name ?? UNKNOWN
        const jobTitle = candidate.jobTitle ?? UNKNOWN
        const profileUrl =
          candidate.socialProfiles.find((url) =>
            /linkedin\.com\/in\//i.test(url),
          ) ?? candidate.socialProfiles[0] ?? UNKNOWN
        const sourceUrl = candidate.evidence[0]?.sourceUrl ?? result.seedUrl ?? UNKNOWN
        const confidence = Math.min(
          100,
          (name !== UNKNOWN ? 30 : 0) +
            (jobTitle !== UNKNOWN ? 25 : 0) +
            (candidate.emails.length > 0 ? 15 : 0) +
            (candidate.phones.length > 0 ? 15 : 0) +
            (candidate.socialProfiles.length > 0 ? 10 : 0) +
            (sourceUrl !== UNKNOWN ? 5 : 0),
        )
        return {
          name,
          jobTitle,
          company: candidate.company ?? fallbackCompany ?? UNKNOWN,
          source: `Company website: ${sourceUrl}`,
          profileUrl,
          email: candidate.emails[0] ?? UNKNOWN,
          phone: candidate.phones[0] ?? UNKNOWN,
          contactRole: this.classifyRole(jobTitle),
          confidence,
          evidence: candidate.evidence,
        }
      })
  }

  private organizationContact(
    organization: PublicOrganizationCandidate,
  ): PublicContactCandidate {
    return {
      name: null,
      jobTitle: null,
      company: organization.name,
      emails: organization.emails,
      phones: organization.phones,
      socialProfiles: organization.socialProfiles,
      evidence: organization.evidence.filter((item) =>
        ['email', 'phone', 'socialProfile'].includes(item.field),
      ),
    }
  }

  private async safePublicDiscovery(
    input: PublicWebsiteDiscoveryInput,
  ): Promise<PublicWebsiteDiscoveryResult> {
    try {
      return await this.publicDiscovery.discover(input)
    } catch (error) {
      return {
        status: 'BLOCKED',
        seedUrl: input.seedUrls[0] ?? null,
        pagesVisited: [],
        organization: null,
        contacts: [],
        relatedBusinesses: [],
        errors: [
          {
            url: input.seedUrls[0] ?? 'Unknown',
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
      }
    }
  }

  private publicSeedUrls(lead: ContactLead): string[] {
    const metadata = this.record(lead.sourceMetadata)
    const seeds = [
      this.read(metadata, ['companyWebsite', 'website', 'companyUrl']),
      this.read(metadata, ['companyDomain', 'domain']),
      lead.normalizedDomain,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => (value.includes('://') ? value : `https://${value}`))
    return [...new Set(seeds)]
  }

  private unknownContact(
    input: {
      company: string | null
      platform: string
      sourceUrl: string
    },
    result: PublicWebsiteDiscoveryResult | null,
  ): DiscoveredContact {
    const publicStatus = result
      ? ` Public website discovery status: ${result.status}.`
      : ''
    const errors = result?.errors.length
      ? ` ${result.errors.map((error) => `${error.url}: ${error.reason}`).join(' | ')}`
      : ''
    return {
      name: UNKNOWN,
      jobTitle: UNKNOWN,
      company: input.company ?? UNKNOWN,
      source: `${input.platform}: ${input.sourceUrl}`,
      profileUrl: UNKNOWN,
      email: UNKNOWN,
      phone: UNKNOWN,
      contactRole: 'unknown',
      confidence: 0,
      evidence: [
        `No observed contact name, job title, email, phone, or social profile was present in the provider payload or permitted public website pages.${publicStatus}${errors}`,
      ],
    }
  }

  private providerEvidence(
    field: PublicFieldEvidence['field'],
    value: string,
    sourceUrl: string,
    observedAt: string,
  ): PublicFieldEvidence {
    return {
      field,
      value,
      sourceUrl,
      extractionMethod: 'provider_metadata',
      verificationStatus: 'OBSERVED',
      observedAt,
    }
  }

  private classifyRole(jobTitle: string): ContactRole {
    if (
      /\b(ceo|founder|owner|president|managing director|procurement director|purchasing director|head of procurement)\b/i.test(
        jobTitle,
      )
    ) {
      return 'decision_maker'
    }
    if (
      /\b(engineer|engineering|technical|automation|plant|operations|maintenance)\b/i.test(
        jobTitle,
      )
    ) {
      return 'technical_contact'
    }
    if (/\b(procurement|purchasing|sourcing|buyer|supply chain)\b/i.test(jobTitle)) {
      return 'influencer'
    }
    return 'unknown'
  }

  private uniqueContacts(contacts: DiscoveredContact[]): DiscoveredContact[] {
    const merged = new Map<string, DiscoveredContact>()
    for (const contact of contacts) {
      const key = `${contact.name}|${contact.jobTitle}|${contact.profileUrl}`.toLowerCase()
      const current = merged.get(key)
      if (!current) {
        merged.set(key, contact)
        continue
      }
      const evidence = [...current.evidence, ...contact.evidence]
      const evidenceKeys = new Set<string>()
      current.evidence = evidence.filter((item) => {
        const keyValue =
          typeof item === 'string'
            ? item
            : `${item.field}|${item.value}|${item.sourceUrl}`
        if (evidenceKeys.has(keyValue)) return false
        evidenceKeys.add(keyValue)
        return true
      })
      if (current.email === UNKNOWN && contact.email !== UNKNOWN) {
        current.email = contact.email
      }
      if (current.phone === UNKNOWN && contact.phone !== UNKNOWN) {
        current.phone = contact.phone
      }
      current.confidence = Math.max(current.confidence, contact.confidence)
    }
    return [...merged.values()]
  }

  private isEmptyPlaceholder(contact: DiscoveredContact): boolean {
    return (
      contact.name === UNKNOWN &&
      contact.jobTitle === UNKNOWN &&
      contact.profileUrl === UNKNOWN &&
      contact.email === UNKNOWN &&
      contact.phone === UNKNOWN
    )
  }

  private isPersonProfile(url: string): boolean {
    return /linkedin\.com\/in\/|\/user\/|\/@/i.test(url)
  }

  private record(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private read(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key]
      if (
        typeof value === 'string' &&
        value.trim() &&
        !/^(?:unknown|n\/?a|none|null|anonymous|-+)$/i.test(value.trim())
      ) {
        return value.trim()
      }
    }
    return null
  }
}

export const contactDiscovery = new ContactDiscoveryService()
