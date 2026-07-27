import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'

export interface RankableContact {
  id: string
  name: string
  jobTitle: string
  contactRole: string
  confidence: number
  source: string
  profileUrl: string
  evidence: Prisma.JsonValue
}

interface RankingLead {
  id: string
  postContent: string
  sourceMetadata: Prisma.JsonValue | null
  research: {
    companyType: string
    buyingSignals: Prisma.JsonValue
    buyingSignalDetails: Prisma.JsonValue | null
    salesAngle: Prisma.JsonValue | null
  } | null
  contacts: RankableContact[]
}

export interface ContactRankingResult extends RankableContact {
  contactScore: number
  priorityRank: number
  recommendationReason: string
}

export interface ContactRankingRepository {
  findLead(leadId: string): Promise<RankingLead | null>
  listRanked(leadId: string): Promise<unknown[]>
  updateRankings(
    rankings: Array<{
      id: string
      contactScore: number
      priorityRank: number
      recommendationReason: string
    }>,
  ): Promise<unknown[]>
}

const prismaRankingRepository: ContactRankingRepository = {
  findLead: (leadId) =>
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        postContent: true,
        sourceMetadata: true,
        research: {
          select: {
            companyType: true,
            buyingSignals: true,
            buyingSignalDetails: true,
            salesAngle: true,
          },
        },
        contacts: {
          select: {
            id: true,
            name: true,
            jobTitle: true,
            contactRole: true,
            confidence: true,
            source: true,
            profileUrl: true,
            evidence: true,
          },
        },
      },
    }),
  listRanked: (leadId) =>
    prisma.contactProfile.findMany({
      where: { leadId },
      orderBy: [
        { priorityRank: { sort: 'asc', nulls: 'last' } },
        { contactScore: { sort: 'desc', nulls: 'last' } },
        { confidence: 'desc' },
      ],
    }),
  updateRankings: (rankings) =>
    prisma.$transaction(
      rankings.map((ranking) =>
        prisma.contactProfile.update({
          where: { id: ranking.id },
          data: {
            contactScore: ranking.contactScore,
            priorityRank: ranking.priorityRank,
            recommendationReason: ranking.recommendationReason,
          },
        }),
      ),
    ),
}

export class ContactRankingService {
  constructor(
    private readonly repository: ContactRankingRepository =
      prismaRankingRepository,
  ) {}

  async rank(leadId: string): Promise<unknown[]> {
    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
    if (lead.contacts.length === 0) return []

    const ranked = this.calculate(lead)
    return this.repository.updateRankings(
      ranked.map(
        ({
          id,
          contactScore,
          priorityRank,
          recommendationReason,
        }) => ({
          id,
          contactScore,
          priorityRank,
          recommendationReason,
        }),
      ),
    )
  }

  list(leadId: string): Promise<unknown[]> {
    return this.repository.listRanked(leadId)
  }

  calculate(lead: RankingLead): ContactRankingResult[] {
    const context = this.contextText(lead)
    const hasProcurementSignal =
      /\b(looking for|seeking|supplier|vendor|procure|purchas|buyer|tender|rfq|quotation|project requirement)\b/i.test(
        context,
      )
    const hasTechnicalSignal =
      /\b(engineer|technical|equipment|automation|integration|upgrade|retrofit|production line|compatib|efficien)\b/i.test(
        context,
      )
    const hasPartnershipSignal =
      /\b(partner|partnership|distributor|strategic|cooperat)\b/i.test(context)
    const companySize = this.explicitCompanySize(lead)

    return lead.contacts
      .map((contact) => {
        const title = contact.jobTitle
        const procurement =
          /\b(procurement|purchasing|buyer|sourcing|supply chain)\b/i.test(title)
        const procurementDirector =
          /\b(procurement director|purchasing director|head of procurement)\b/i.test(
            title,
          )
        const technical =
          /\b(engineer|engineering|technical|automation|plant|operations|maintenance)\b/i.test(
            title,
          )
        const technicalLeader =
          /\b(engineering manager|technical director|head of engineering|chief engineer)\b/i.test(
            title,
          )
        const owner =
          /\b(ceo|founder|owner|president|managing director)\b/i.test(title)
        const reasons: string[] = []
        let score = Math.round(contact.confidence * 0.3)

        if (contact.name === 'Unknown' || title === 'Unknown') {
          score -= 35
          reasons.push('No verified name or job title')
        }
        if (procurement) {
          score += procurementDirector ? 30 : 25
          reasons.push('Verified procurement responsibility')
        } else if (technical) {
          score += technicalLeader ? 27 : 20
          reasons.push('Verified technical responsibility')
        } else if (owner) {
          score += 18
          reasons.push('Verified company leadership role')
        } else if (title !== 'Unknown') {
          score += 5
          reasons.push('Verified role, but limited buying authority evidence')
        }

        if (hasProcurementSignal && procurement) {
          score += 30
          reasons.push('Role matches supplier or purchasing evidence')
        }
        if (hasTechnicalSignal && technical) {
          score += 28
          reasons.push('Role matches the documented technical requirement')
        }
        if (hasPartnershipSignal && owner) {
          score += 22
          reasons.push('Leadership role matches the partnership context')
        }
        if (companySize === 'small' && owner) {
          score += 20
          reasons.push('Explicit small-company evidence favors the owner')
        }
        if (
          companySize === 'large' &&
          (procurement || technical)
        ) {
          score += 15
          reasons.push('Explicit large-company evidence favors a functional lead')
        }

        if (this.isTrustedSource(contact)) {
          score += 10
          reasons.push('Contact has a traceable first-party or professional source')
        } else {
          score -= 8
          reasons.push('Source confidence is limited')
        }

        return {
          ...contact,
          contactScore: Math.max(0, Math.min(100, score)),
          priorityRank: 0,
          recommendationReason:
            reasons.length > 0 ? reasons.join('; ') : 'Insufficient evidence',
        }
      })
      .sort(
        (a, b) =>
          b.contactScore - a.contactScore ||
          b.confidence - a.confidence ||
          a.id.localeCompare(b.id),
      )
      .map((contact, index) => ({ ...contact, priorityRank: index + 1 }))
  }

  private contextText(lead: RankingLead): string {
    return [
      lead.postContent,
      lead.research?.companyType,
      JSON.stringify(lead.research?.buyingSignals ?? []),
      JSON.stringify(lead.research?.buyingSignalDetails ?? []),
      JSON.stringify(lead.research?.salesAngle ?? {}),
    ].join(' ')
  }

  private explicitCompanySize(lead: RankingLead): 'small' | 'large' | null {
    const metadata = this.record(lead.sourceMetadata)
    const evidence = [
      metadata.companySize,
      metadata.employeeCount,
      lead.research?.companyType,
    ]
      .filter((value): value is string | number =>
        typeof value === 'string' || typeof value === 'number',
      )
      .join(' ')
    if (/\b(small|startup|micro|sme|1-50|under 50)\b/i.test(evidence)) {
      return 'small'
    }
    if (/\b(large|enterprise|corporation|1000\+|over 1000)\b/i.test(evidence)) {
      return 'large'
    }
    return null
  }

  private isTrustedSource(contact: RankableContact): boolean {
    const source = `${contact.source} ${contact.profileUrl}`
    return (
      /linkedin\.com\/in\/|official|company website|corporate website/i.test(
        source,
      ) && Array.isArray(contact.evidence) && contact.evidence.length > 0
    )
  }

  private record(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }
}

export const contactRanking = new ContactRankingService()
