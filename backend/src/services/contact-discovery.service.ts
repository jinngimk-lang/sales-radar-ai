import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { toSafeJson } from './safe-json.service.js'

export type ContactRole =
  | 'decision_maker'
  | 'influencer'
  | 'technical_contact'
  | 'unknown'

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
  evidence: string[]
}

const UNKNOWN = 'Unknown'

interface ContactLead {
  company: string | null
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

const prismaContactRepository: ContactDiscoveryRepository = {
  findContacts: (leadId) =>
    prisma.contactProfile.findMany({
      where: { leadId },
      orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
    }),
  findLead: (leadId) => prisma.lead.findUnique({ where: { id: leadId } }),
  createContacts: (leadId, contacts) =>
    prisma.$transaction(
      contacts.map((contact) =>
        prisma.contactProfile.create({
          data: {
            leadId,
            ...contact,
            evidence: toSafeJson(contact.evidence),
          },
        }),
      ),
    ),
}

export class ContactDiscoveryService {
  constructor(
    private readonly repository: ContactDiscoveryRepository =
      prismaContactRepository,
  ) {}

  async discover(leadId: string) {
    const existing = await this.repository.findContacts(leadId)
    if (existing.length > 0) return existing

    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')

    const candidates = this.extract({
      company: lead.company,
      jobTitle: lead.jobTitle,
      platform: lead.platform,
      sourceUrl: lead.sourceUrl,
      profileUrl: lead.profileUrl,
      sourceMetadata: lead.sourceMetadata,
    })

    return this.repository.createContacts(leadId, candidates)
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
      ? metadata.contacts
          .filter(
            (value): value is Record<string, unknown> =>
              Boolean(value) &&
              typeof value === 'object' &&
              !Array.isArray(value),
          )
      : []
    const sources = rawContacts.length > 0 ? rawContacts : [metadata]
    const contacts = sources
      .map((source) => this.toContact(input, source))
      .filter((contact) => contact.name !== UNKNOWN || contact.jobTitle !== UNKNOWN)

    if (contacts.length > 0) return this.uniqueContacts(contacts)
    return [
      {
        name: UNKNOWN,
        jobTitle: UNKNOWN,
        company: input.company ?? UNKNOWN,
        source: `${input.platform}: ${input.sourceUrl}`,
        profileUrl: UNKNOWN,
        email: UNKNOWN,
        phone: UNKNOWN,
        contactRole: 'unknown',
        confidence: 0,
        evidence: ['No verified contact name or job title was present in the Lead source.'],
      },
    ]
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
    const evidence = [
      name !== UNKNOWN ? `Source name: ${name}` : null,
      jobTitle !== UNKNOWN ? `Source job title: ${jobTitle}` : null,
      profileUrl !== UNKNOWN ? `Source profile: ${profileUrl}` : null,
      email !== UNKNOWN ? `Source email: ${email}` : null,
      phone !== UNKNOWN ? `Source phone: ${phone}` : null,
    ].filter((value): value is string => Boolean(value))
    const confidence = Math.min(
      100,
      (name !== UNKNOWN ? 35 : 0) +
        (jobTitle !== UNKNOWN ? 30 : 0) +
        (profileUrl !== UNKNOWN ? 15 : 0) +
        (email !== UNKNOWN ? 10 : 0) +
        (phone !== UNKNOWN ? 10 : 0),
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
    const seen = new Set<string>()
    return contacts.filter((contact) => {
      const key = `${contact.name}|${contact.jobTitle}|${contact.profileUrl}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
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
