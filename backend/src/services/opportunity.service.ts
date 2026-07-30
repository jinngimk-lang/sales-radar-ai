import type {
  CompanyAnalysisStatus,
  PrismaClient,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'

export type CompanyResearchStatus =
  | 'NOT_STARTED'
  | CompanyAnalysisStatus

export class OpportunityService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async getDetailForUser(id: string, userId: string) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id,
        userId,
        integrityStatus: 'EVIDENCE_LINKED',
        evidence: {
          some: {},
        },
        searchTask: {
          status: 'COMPLETED',
        },
      },
      select: {
        id: true,
        searchTaskId: true,
        type: true,
        companyName: true,
        title: true,
        summary: true,
        whyItMatters: true,
        recommendedNextStep: true,
        confidence: true,
        productContextSnapshot: true,
        detectionVersion: true,
        createdAt: true,
        updatedAt: true,
        evidence: {
          select: {
            id: true,
            excerpt: true,
            isPrimary: true,
            confidence: true,
            createdAt: true,
            searchEvidence: {
              select: {
                id: true,
                rawUrl: true,
                title: true,
                provider: true,
                platform: true,
                createdAt: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        companyProfiles: {
          where: {
            companyProfile: {
              userId,
            },
          },
          select: {
            relationshipType: true,
            companyProfile: {
              select: {
                id: true,
                companyName: true,
                normalizedDomain: true,
                officialWebsite: true,
                country: true,
                region: true,
                industry: true,
                companyType: true,
                identityStatus: true,
                identityConfidence: true,
                analysisStatus: true,
                analysisVersion: true,
                currentVersion: true,
                updatedAt: true,
                currentSnapshot: {
                  select: {
                    id: true,
                    analysisStatus: true,
                    confidence: true,
                    analysisVersion: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!opportunity) {
      throw new AppError(
        404,
        'OPPORTUNITY_NOT_FOUND',
        'Opportunity not found',
      )
    }

    const { companyProfiles, ...detail } = opportunity
    const companies = companyProfiles.map(
      ({ relationshipType, companyProfile }) => ({
        ...companyProfile,
        relationshipType,
      }),
    )

    return {
      ...detail,
      companyResearchStatus: resolveCompanyResearchStatus(
        companies.map((company) => company.analysisStatus),
      ),
      companies,
    }
  }
}

function resolveCompanyResearchStatus(
  statuses: CompanyAnalysisStatus[],
): CompanyResearchStatus {
  if (statuses.length === 0) return 'NOT_STARTED'
  if (statuses.includes('READY')) return 'READY'
  if (statuses.includes('NEEDS_REVIEW')) return 'NEEDS_REVIEW'
  if (statuses.includes('DRAFT')) return 'DRAFT'
  return 'FAILED'
}

export const opportunityService = new OpportunityService()
