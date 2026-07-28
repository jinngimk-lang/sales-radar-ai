import type {
  CompanyIntelligenceResult,
} from '../contracts/company-intelligence.contract.js'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import {
  companyIntelligence,
  type CompanyIntelligenceService,
} from './company-intelligence.service.js'
import { AppError } from '../utils/app-error.js'

interface CompanyIntelligenceAnalyzer {
  analyze(command: {
    userId: string
    opportunityId: string
    searchEvidenceId: string
  }): Promise<CompanyIntelligenceResult>
}

export class OpportunityCompanyIntelligenceService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly analyzer: CompanyIntelligenceAnalyzer =
      companyIntelligence as CompanyIntelligenceService,
  ) {}

  async research(input: {
    userId: string
    opportunityId: string
    searchEvidenceId: string
  }) {
    const result = await this.analyzer.analyze(input)

    const [profile, snapshot] = await Promise.all([
      this.db.companyProfile.findFirst({
        where: {
          id: result.companyProfileId,
          userId: input.userId,
          opportunities: {
            some: {
              opportunityId: input.opportunityId,
            },
          },
        },
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
          sources: {
            where: {
              opportunityId: input.opportunityId,
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
      }),
      this.db.companyIntelligenceSnapshot.findFirst({
        where: {
          id: result.snapshotId,
          companyProfile: {
            userId: input.userId,
          },
          opportunityId: input.opportunityId,
        },
        select: {
          id: true,
          analysisStatus: true,
          confidence: true,
          analysisVersion: true,
          provider: true,
          identitySnapshot: true,
          understandingSnapshot: true,
          relevanceAssessment: true,
          researchHints: true,
          createdAt: true,
        },
      }),
    ])

    if (!profile || !snapshot) {
      throw new AppError(
        500,
        'COMPANY_INTELLIGENCE_RESULT_NOT_AVAILABLE',
        'Company research result is not available',
      )
    }

    const { sources, ...companyProfile } = profile

    return {
      companyProfile,
      snapshot: {
        id: snapshot.id,
        status: snapshot.analysisStatus,
        confidence: snapshot.confidence,
        analysisVersion: snapshot.analysisVersion,
        provider: snapshot.provider,
        createdAt: snapshot.createdAt,
        created: result.createdSnapshot,
      },
      sources,
      researchResult: {
        identity: snapshot.identitySnapshot,
        understanding: snapshot.understandingSnapshot,
        relevance: snapshot.relevanceAssessment,
        researchHints: snapshot.researchHints,
      },
    }
  }
}

export const opportunityCompanyIntelligence =
  new OpportunityCompanyIntelligenceService()
