import type {
  CompanyAnalysisStatus,
  PrismaClient,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { isEligibleCompanyIntelligenceSource } from './company-intelligence-input.service.js'

export type WorkspaceResearchStatus =
  | 'NOT_STARTED'
  | CompanyAnalysisStatus

export class CompanyIntelligenceWorkspaceService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async getForUser(opportunityId: string, userId: string) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        userId,
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
                provider: true,
                platform: true,
                rawUrl: true,
                title: true,
                content: true,
                extractionStatus: true,
                identityStatus: true,
                evidenceStatus: true,
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
            createdAt: true,
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
                description: true,
                products: true,
                industries: true,
                businessModel: true,
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
                    identitySnapshot: true,
                    understandingSnapshot: true,
                    relevanceAssessment: true,
                    researchHints: true,
                    createdAt: true,
                  },
                },
                sources: {
                  where: {
                    opportunityId,
                  },
                  select: {
                    id: true,
                    searchEvidenceId: true,
                    url: true,
                    title: true,
                    sourceType: true,
                    excerpt: true,
                    capturedAt: true,
                    confidence: true,
                    createdAt: true,
                  },
                  orderBy: {
                    capturedAt: 'desc',
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
        'COMPANY_INTELLIGENCE_WORKSPACE_NOT_FOUND',
        'Company research workspace not found',
      )
    }

    const primaryCompanyLink =
      opportunity.companyProfiles.find(
        (link) => link.relationshipType === 'EVENT_SUBJECT',
      ) ?? opportunity.companyProfiles[0]
    const linkedCompany = primaryCompanyLink?.companyProfile ?? null
    const eligibleEvidence = opportunity.evidence.find(({ searchEvidence }) =>
      isEligibleCompanyIntelligenceSource({
        provider: searchEvidence.provider,
        sourceUrl: searchEvidence.rawUrl,
        content: searchEvidence.content,
      }),
    )

    const searchEvidence = opportunity.evidence.map(
      ({ searchEvidence: evidence, ...link }) => ({
        ...link,
        searchEvidence: {
          id: evidence.id,
          provider: evidence.provider,
          platform: evidence.platform,
          sourceUrl: evidence.rawUrl,
          title: evidence.title,
          extractionStatus: evidence.extractionStatus,
          identityStatus: evidence.identityStatus,
          evidenceStatus: evidence.evidenceStatus,
          createdAt: evidence.createdAt,
        },
      }),
    )

    const {
      evidence: _evidence,
      companyProfiles: _companyProfiles,
      productContextSnapshot,
      ...opportunitySummary
    } = opportunity

    if (!linkedCompany) {
      return {
        opportunity: opportunitySummary,
        productContextSnapshot,
        searchEvidence,
        companyProfile: null,
        companySources: [],
        research: {
          status: 'NOT_STARTED' as const,
          currentSnapshot: null,
          lastUpdatedAt: null,
        },
        permissions: {
          canResearch: Boolean(eligibleEvidence),
          canRefresh: false,
          reason: permissionReason(
            opportunity.evidence.length,
            eligibleEvidence,
          ),
          eligibleSearchEvidenceId:
            eligibleEvidence?.searchEvidence.id ?? null,
        },
      }
    }

    const {
      sources,
      currentSnapshot,
      analysisStatus,
      updatedAt,
      ...companyProfile
    } = linkedCompany

    return {
      opportunity: opportunitySummary,
      productContextSnapshot,
      searchEvidence,
      companyProfile: {
        ...companyProfile,
        analysisStatus,
        updatedAt,
        relationshipType: primaryCompanyLink.relationshipType,
      },
      companySources: sources,
      research: {
        status: analysisStatus,
        currentSnapshot,
        lastUpdatedAt: updatedAt,
      },
      permissions: {
        canResearch: false,
        canRefresh: Boolean(eligibleEvidence),
        reason: permissionReason(
          opportunity.evidence.length,
          eligibleEvidence,
        ),
        eligibleSearchEvidenceId:
          eligibleEvidence?.searchEvidence.id ?? null,
      },
    }
  }
}

function permissionReason(
  evidenceCount: number,
  eligibleEvidence:
    | {
        searchEvidence: {
          id: string
        }
      }
    | undefined,
) {
  if (evidenceCount === 0) return 'NO_LINKED_EVIDENCE'
  if (!eligibleEvidence) return 'NO_ELIGIBLE_SOURCE'
  return null
}

export const companyIntelligenceWorkspace =
  new CompanyIntelligenceWorkspaceService()
