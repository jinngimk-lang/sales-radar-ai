import {
  CustomerType,
  LeadEvidenceStatus,
  LeadIdentityStatus,
  Prisma,
  SearchTaskStatus,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { ensureDemoUser } from './demo-user.service.js'

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
  contacts: {
    orderBy: [{ priorityRank: 'asc' }, { confidence: 'desc' }],
    take: 12,
  },
  channelProfile: true,
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
 * Production visibility boundary for AI Sales Copilot candidates.
 * Qualification is returned as a score/readiness label instead of being used
 * as a display filter, so real people are not discarded for lacking a domain.
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
      .filter((candidate) => this.isVisible(candidate, userId))
      .map((candidate) => {
        const { analyses, searchTaskLinks: _links, ...lead } = candidate
        return {
          ...lead,
          analysis: analyses[0] ?? null,
          communicationProfile: deriveCommunicationProfile(lead),
          audienceType: this.classifyAudience(candidate),
          contactReadiness: this.contactReadiness(candidate),
          assistantScores: this.scoreCandidate(candidate),
        }
      })
  }

  private isVisible(candidate: AssistantLeadCandidate, userId: string) {
    if (candidate.userId !== userId) return false
    if (candidate.provider.trim().toLowerCase() === 'mock') return false
    if (/^(mock|seed|buyer_)/i.test(candidate.externalId)) return false
    if (!this.isHttpUrl(candidate.sourceUrl)) return false
    if (!this.hasMeaningfulEvidence(candidate.postContent)) return false

    return candidate.searchTaskLinks.some(
      (link) =>
        link.searchTask.userId === userId &&
        link.searchTask.status === SearchTaskStatus.COMPLETED,
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
      normalized.length > 0 &&
      !/\b(captcha|access denied|request blocked|page not found)\b/i.test(
        normalized,
      )
    )
  }

  private classifyAudience(candidate: AssistantLeadCandidate) {
    const metadata = this.record(candidate.sourceMetadata)
    const leadType = this.string(metadata.leadType).toLowerCase()
    const channelType = candidate.channelProfile?.channelType.toLowerCase() ?? ''
    const combined = `${leadType} ${channelType}`

    if (
      candidate.customerType === CustomerType.Individual ||
      leadType === 'person'
    ) {
      return 'person' as const
    }
    if (/supplier|vendor|manufacturer|factory/.test(combined)) {
      return 'supplier' as const
    }
    if (
      candidate.customerType === CustomerType.Agent ||
      /agent|broker|intermediar|distributor|partner|reseller/.test(combined)
    ) {
      return 'intermediary' as const
    }
    return 'company' as const
  }

  private contactReadiness(candidate: AssistantLeadCandidate) {
    const actionable = candidate.contacts.some((contact) =>
      [contact.email, contact.phone, contact.profileUrl].some(
        (value) => this.isKnownValue(value),
      ),
    )
    if (actionable) return 'ready' as const
    if (
      candidate.identityStatus === LeadIdentityStatus.REJECTED ||
      candidate.evidenceStatus === LeadEvidenceStatus.INVALID
    ) {
      return 'review' as const
    }
    return 'research' as const
  }

  private scoreCandidate(candidate: AssistantLeadCandidate) {
    const identity =
      candidate.identityStatus === LeadIdentityStatus.VERIFIED
        ? 100
        : candidate.identityStatus === LeadIdentityStatus.UNVERIFIED
          ? 55
          : 20
    const evidence =
      candidate.evidenceStatus === LeadEvidenceStatus.VALID
        ? 100
        : candidate.evidenceStatus === LeadEvidenceStatus.UNKNOWN
          ? 55
          : 20
    const contact = candidate.contacts.reduce(
      (highest, item) =>
        Math.max(highest, item.contactScore ?? item.confidence ?? 0),
      0,
    )
    const intent = this.clamp(candidate.intentScore)
    return {
      overall: this.clamp(
        intent * 0.45 + identity * 0.2 + evidence * 0.2 + contact * 0.15,
      ),
      intent,
      identity,
      evidence,
      contact: this.clamp(contact),
    }
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  private isKnownValue(value: string) {
    const normalized = value.trim().toLowerCase()
    return Boolean(normalized && normalized !== 'unknown' && normalized !== 'n/a')
  }

  private record(value: Prisma.JsonValue | null) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private string(value: unknown) {
    return typeof value === 'string' ? value.trim() : ''
  }
}

export function deriveCommunicationProfile(lead: {
  postContent: string
  platform: string
  interestTags: string[]
}) {
  const content = lead.postContent.replace(/\s+/g, ' ').trim()
  const hasChinese = /[\u3400-\u9fff]/.test(content)
  const hasEnglish = /[A-Za-z]{3,}/.test(content)
  const language = hasChinese && hasEnglish
    ? 'mixed'
    : hasChinese
      ? 'zh'
      : hasEnglish
        ? 'en'
        : 'unknown'
  const technical =
    /\b(api|saas|erp|mes|automation|engineering|technical|specification|integration)\b|技术|参数|自动化|系统集成/i.test(
      content,
    )
  const tone = technical
    ? 'technical'
    : content.length <= 280
      ? 'concise'
      : content.length >= 900
        ? 'detailed'
        : 'conversational'

  return {
    language,
    tone,
    preferredPlatform: lead.platform,
    observedTopics: lead.interestTags.slice(0, 8),
    evidenceExcerpt:
      content.length <= 360 ? content : `${content.slice(0, 359).trimEnd()}…`,
    basis: 'Observed public source content',
  }
}

export const assistantLeadService = new AssistantLeadService()
