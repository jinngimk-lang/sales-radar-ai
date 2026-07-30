import type { PrismaClient } from '@prisma/client'
import type {
  CompanyIntelligenceCommand,
  VerifiedCompanyIntelligenceInput,
} from '../contracts/company-intelligence.contract.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'

export class CompanyIntelligenceInputService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async resolve(
    command: CompanyIntelligenceCommand,
  ): Promise<VerifiedCompanyIntelligenceInput> {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: command.opportunityId,
        userId: command.userId,
        integrityStatus: 'EVIDENCE_LINKED',
        evidence: {
          some: {},
        },
      },
      select: {
        id: true,
        companyName: true,
        productContextSnapshot: true,
        searchTaskId: true,
        searchTask: {
          select: {
            userId: true,
            productProfileId: true,
          },
        },
        evidence: {
          where: {
            searchEvidenceId: command.searchEvidenceId,
          },
          take: 1,
          select: {
            searchEvidence: {
              select: {
                id: true,
                provider: true,
                externalId: true,
                platform: true,
                rawUrl: true,
                profileUrl: true,
                title: true,
                content: true,
                rawMetadata: true,
                companyName: true,
                normalizedDomain: true,
                website: true,
                createdAt: true,
                searchTask: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!opportunity) {
      throw new AppError(
        404,
        'COMPANY_INTELLIGENCE_OPPORTUNITY_NOT_FOUND',
        'Opportunity not found',
      )
    }

    const linkedEvidence = opportunity.evidence[0]?.searchEvidence
    if (
      !linkedEvidence ||
      opportunity.searchTask.userId !== command.userId ||
      linkedEvidence.searchTask.userId !== command.userId
    ) {
      throw new AppError(
        404,
        'COMPANY_INTELLIGENCE_EVIDENCE_NOT_FOUND',
        'Search evidence is not linked to this opportunity',
      )
    }

    if (
      !isEligibleCompanyIntelligenceSource({
        provider: linkedEvidence.provider,
        sourceUrl: linkedEvidence.rawUrl,
        content: linkedEvidence.content,
      })
    ) {
      throw new AppError(
        422,
        'COMPANY_INTELLIGENCE_SOURCE_NOT_ELIGIBLE',
        'A real source URL and source content are required',
      )
    }

    return {
      userId: command.userId,
      opportunity: {
        id: opportunity.id,
        companyName: opportunity.companyName,
        productContextSnapshot: opportunity.productContextSnapshot,
        searchTaskId: opportunity.searchTaskId,
        productProfileId: opportunity.searchTask.productProfileId,
      },
      evidence: {
        id: linkedEvidence.id,
        provider: linkedEvidence.provider,
        externalId: linkedEvidence.externalId,
        platform: linkedEvidence.platform,
        sourceUrl: linkedEvidence.rawUrl,
        profileUrl: linkedEvidence.profileUrl,
        title: linkedEvidence.title,
        content: linkedEvidence.content,
        rawMetadata: linkedEvidence.rawMetadata,
        extractedCompanyName: linkedEvidence.companyName,
        extractedDomain: linkedEvidence.normalizedDomain,
        extractedWebsite: linkedEvidence.website,
        capturedAt: linkedEvidence.createdAt,
      },
    }
  }
}

export function isEligibleCompanyIntelligenceSource(input: {
  provider: string
  sourceUrl: string
  content: string
}) {
  if (
    input.provider.trim().toLowerCase() === 'mock' ||
    !input.content.trim()
  ) {
    return false
  }

  try {
    const url = new URL(input.sourceUrl)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const reservedHost =
      hostname === 'localhost' ||
      hostname === 'example.com' ||
      hostname === 'example.org' ||
      hostname === 'example.net' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.invalid') ||
      hostname.endsWith('.example')
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(hostname) &&
      !url.username &&
      !url.password &&
      !reservedHost
    )
  } catch {
    return false
  }
}

export const companyIntelligenceInput = new CompanyIntelligenceInputService()
