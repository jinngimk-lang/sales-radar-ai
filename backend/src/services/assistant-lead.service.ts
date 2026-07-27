import {
  LeadEvidenceStatus,
  LeadIdentityStatus,
  LeadQualificationStatus,
  Prisma,
  SearchTaskStatus,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { ensureDemoUser } from './demo-user.service.js'
import { CURRENT_QUALIFICATION_VERSION } from '../contracts/qualification-version.contract.js'

const blockedCompanyHosts = new Set([
  'bit.ly',
  'example.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'made-in-china.com',
  'reddit.com',
  'tiktok.com',
  'x.com',
  'youtube.com',
])

const assistantLeadInclude = Prisma.validator<Prisma.LeadInclude>()({
  analyses: {
    where: { status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
  searchTaskLinks: {
    include: {
      searchTask: {
        select: {
          userId: true,
          status: true,
        },
      },
    },
  },
})

export type AssistantLeadCandidate = Prisma.LeadGetPayload<{
  include: typeof assistantLeadInclude
}>

export interface AssistantLeadRepository {
  listCandidates(userId: string): Promise<AssistantLeadCandidate[]>
}

export type CurrentUserResolver = () => Promise<{ id: string }>

const prismaAssistantLeadRepository: AssistantLeadRepository = {
  listCandidates(userId) {
    return prisma.lead.findMany({
      where: {
        userId,
        provider: { not: 'mock' },
        identityStatus: LeadIdentityStatus.VERIFIED,
        evidenceStatus: LeadEvidenceStatus.VALID,
        productRelevancePassed: true,
        qualificationStatus: LeadQualificationStatus.QUALIFIED,
        qualificationVersion: CURRENT_QUALIFICATION_VERSION,
        normalizedDomain: { not: null },
        company: { not: null },
        searchTaskLinks: {
          some: {
            searchTask: {
              userId,
              status: SearchTaskStatus.COMPLETED,
            },
          },
        },
      },
      include: assistantLeadInclude,
      orderBy: [{ intentScore: 'desc' }, { updatedAt: 'desc' }],
    })
  },
}

/**
 * Production trust boundary for AI Sales Copilot leads.
 *
 * Database predicates keep the query narrow; the in-memory checks are
 * intentional defense-in-depth against malformed or legacy records.
 */
export class AssistantLeadService {
  constructor(
    private readonly repository: AssistantLeadRepository =
      prismaAssistantLeadRepository,
    private readonly resolveCurrentUser: CurrentUserResolver = ensureDemoUser,
  ) {}

  async listQualifiedLeads() {
    const currentUser = await this.resolveCurrentUser()
    return this.listQualifiedLeadsForUser(currentUser.id)
  }

  async listQualifiedLeadsForUser(userId: string) {
    const candidates = await this.repository.listCandidates(userId)

    return candidates
      .filter((candidate) => this.isTrusted(candidate, userId))
      .map(({ analyses, searchTaskLinks: _links, ...lead }) => ({
        ...lead,
        analysis: analyses[0] ?? null,
      }))
  }

  private isTrusted(candidate: AssistantLeadCandidate, userId: string) {
    if (candidate.userId !== userId) return false
    if (candidate.provider.trim().toLowerCase() === 'mock') return false
    if (/^(mock|seed|buyer_)/i.test(candidate.externalId)) return false
    if (!this.isKnownCompany(candidate.company)) return false
    if (!this.isVerifiedDomain(candidate.normalizedDomain)) return false
    if (candidate.identityStatus !== LeadIdentityStatus.VERIFIED) return false
    if (candidate.evidenceStatus !== LeadEvidenceStatus.VALID) return false
    if (!candidate.productRelevancePassed) return false
    if (
      candidate.qualificationStatus !==
      LeadQualificationStatus.QUALIFIED
    ) {
      return false
    }
    if (candidate.qualificationVersion !== CURRENT_QUALIFICATION_VERSION) {
      return false
    }
    if (!this.isHttpUrl(candidate.sourceUrl)) return false
    if (!this.hasMeaningfulEvidence(candidate.postContent)) return false

    return candidate.searchTaskLinks.some(
      (link) =>
        link.searchTask.userId === userId &&
        link.searchTask.status === SearchTaskStatus.COMPLETED &&
        this.hasStructuredEvidence(link.matchEvidence),
    )
  }

  private isKnownCompany(value: string | null) {
    if (!value) return false
    const normalized = value.trim().toLowerCase()
    return (
      normalized.length >= 2 &&
      normalized !== 'unknown' &&
      !/^(mock|buyer_|seed|test\b)/i.test(normalized)
    )
  }

  private isVerifiedDomain(value: string | null) {
    if (!value) return false
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .replace(/^www\./, '')

    if (!/^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(normalized)) {
      return false
    }

    return ![...blockedCompanyHosts].some(
      (host) => normalized === host || normalized.endsWith(`.${host}`),
    )
  }

  private isHttpUrl(value: string) {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  private hasMeaningfulEvidence(value: string) {
    const normalized = value.trim()
    return (
      normalized.length >= 30 &&
      !/\b(captcha|access denied|request blocked|page not found)\b/i.test(
        normalized,
      )
    )
  }

  private hasStructuredEvidence(value: Prisma.JsonValue | null) {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    )
  }
}

export const assistantLeadService = new AssistantLeadService()
