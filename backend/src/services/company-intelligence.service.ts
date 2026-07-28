import { createHash } from 'node:crypto'
import {
  CompanyAnalysisStatus,
  CompanyIdentityStatus,
  CompanySourceType,
  CompanyType,
  LeadIdentityStatus,
  type Prisma,
  type PrismaClient,
} from '@prisma/client'
import {
  COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
  COMPANY_OPPORTUNITY_RELATIONSHIP_TYPE,
  type CompanyIntelligenceCommand,
  type CompanyIntelligenceResult,
  type VerifiedCompanyIntelligenceInput,
} from '../contracts/company-intelligence.contract.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import {
  companyIdentityExtraction,
  type CompanyIdentityExtractionService,
} from './company-identity-extraction.service.js'
import {
  CompanyIntelligenceInputService,
  companyIntelligenceInput,
} from './company-intelligence-input.service.js'
import {
  sanitizeProviderString,
  toSafeJson,
} from './safe-json.service.js'

const IDENTITY_PROVIDER = 'company-identity-extraction'

export class CompanyIntelligenceService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly inputResolver: CompanyIntelligenceInputService =
      companyIntelligenceInput,
    private readonly identityExtractor: CompanyIdentityExtractionService =
      companyIdentityExtraction,
  ) {}

  async analyze(
    command: CompanyIntelligenceCommand,
  ): Promise<CompanyIntelligenceResult> {
    const input = await this.inputResolver.resolve(command)
    const metadata = metadataRecord(input.evidence.rawMetadata)
    const identity = this.identityExtractor.extract({
      platform: input.evidence.platform,
      sourceUrl: input.evidence.sourceUrl,
      company: input.evidence.extractedCompanyName,
      rawContent: input.evidence.content,
      metadata: {
        ...metadata,
        ...(input.evidence.title
          ? { title: input.evidence.title }
          : {}),
        ...(input.evidence.extractedCompanyName
          ? { companyName: input.evidence.extractedCompanyName }
          : {}),
        ...(input.evidence.extractedDomain
          ? { companyDomain: input.evidence.extractedDomain }
          : {}),
        ...(input.evidence.extractedWebsite
          ? { companyWebsite: input.evidence.extractedWebsite }
          : {}),
      },
    })

    if (
      identity.identityStatus !== LeadIdentityStatus.VERIFIED ||
      !identity.companyName ||
      !identity.normalizedDomain ||
      !identity.website
    ) {
      throw new AppError(
        422,
        'COMPANY_IDENTITY_NOT_VERIFIED',
        'Company identity could not be verified from this source',
        {
          reasons: identity.reasons,
        },
      )
    }

    return this.persist(input, {
      companyName: identity.companyName,
      normalizedDomain: identity.normalizedDomain,
      website: identity.website,
      confidence: identity.confidence,
      confidenceReasoning: identity.confidenceReasoning,
      reasons: identity.reasons,
    })
  }

  private async persist(
    input: VerifiedCompanyIntelligenceInput,
    identity: {
      companyName: string
      normalizedDomain: string
      website: string
      confidence: number
      confidenceReasoning: string[]
      reasons: string[]
    },
  ): Promise<CompanyIntelligenceResult> {
    return this.db.$transaction(async (transaction) => {
      const profile = await transaction.companyProfile.upsert({
        where: {
          userId_identityKey: {
            userId: input.userId,
            identityKey: identity.normalizedDomain,
          },
        },
        create: {
          userId: input.userId,
          identityKey: identity.normalizedDomain,
          companyName: identity.companyName,
          normalizedDomain: identity.normalizedDomain,
          officialWebsite: identity.website,
          companyType: CompanyType.UNKNOWN,
          identityStatus: CompanyIdentityStatus.VERIFIED,
          identityConfidence: identity.confidence,
          analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
          analysisVersion: COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
          provider: IDENTITY_PROVIDER,
        },
        update: {
          companyName: identity.companyName,
          normalizedDomain: identity.normalizedDomain,
          officialWebsite: identity.website,
          identityStatus: CompanyIdentityStatus.VERIFIED,
          identityConfidence: identity.confidence,
          analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
          analysisVersion: COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
          provider: IDENTITY_PROVIDER,
        },
      })

      const sourceHash = sha256(
        `${input.evidence.provider}:${input.evidence.id}`,
      )
      const source = await transaction.companySource.upsert({
        where: {
          companyProfileId_sourceHash: {
            companyProfileId: profile.id,
            sourceHash,
          },
        },
        create: {
          companyProfileId: profile.id,
          searchEvidenceId: input.evidence.id,
          opportunityId: input.opportunity.id,
          url: input.evidence.sourceUrl,
          title: sourceTitle(input),
          sourceType: CompanySourceType.OFFICIAL_WEBSITE,
          excerpt: sourceExcerpt(input.evidence.content),
          capturedAt: input.evidence.capturedAt,
          sourceHash,
          confidence: identity.confidence,
        },
        update: {
          opportunityId: input.opportunity.id,
          url: input.evidence.sourceUrl,
          title: sourceTitle(input),
          excerpt: sourceExcerpt(input.evidence.content),
          capturedAt: input.evidence.capturedAt,
          confidence: identity.confidence,
        },
      })

      await transaction.companyOpportunity.upsert({
        where: {
          companyProfileId_opportunityId_relationshipType: {
            companyProfileId: profile.id,
            opportunityId: input.opportunity.id,
            relationshipType: COMPANY_OPPORTUNITY_RELATIONSHIP_TYPE,
          },
        },
        create: {
          companyProfileId: profile.id,
          opportunityId: input.opportunity.id,
          relationshipType: COMPANY_OPPORTUNITY_RELATIONSHIP_TYPE,
        },
        update: {},
      })

      const analysisKey = sha256(
        [
          COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
          input.opportunity.id,
          input.evidence.id,
        ].join(':'),
      )
      const existingSnapshot =
        await transaction.companyIntelligenceSnapshot.findUnique({
          where: {
            companyProfileId_analysisKey: {
              companyProfileId: profile.id,
              analysisKey,
            },
          },
        })

      if (existingSnapshot) {
        return {
          companyProfileId: profile.id,
          companySourceId: source.id,
          snapshotId: existingSnapshot.id,
          opportunityId: input.opportunity.id,
          analysisVersion: COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
          createdSnapshot: false,
        }
      }

      const snapshotCount =
        await transaction.companyIntelligenceSnapshot.count({
          where: {
            companyProfileId: profile.id,
          },
        })
      const snapshot =
        await transaction.companyIntelligenceSnapshot.create({
          data: {
            companyProfileId: profile.id,
            opportunityId: input.opportunity.id,
            productProfileId: input.opportunity.productProfileId,
            productContextSnapshot: toSafeJson(
              input.opportunity.productContextSnapshot,
            ),
            identitySnapshot: toSafeJson({
              companyName: identity.companyName,
              normalizedDomain: identity.normalizedDomain,
              officialWebsite: identity.website,
              identityStatus: CompanyIdentityStatus.VERIFIED,
              confidence: identity.confidence,
              confidenceReasoning: identity.confidenceReasoning,
              reasons: identity.reasons,
            }),
            understandingSnapshot: toSafeJson({
              description: null,
              products: [],
              industries: [],
              businessModel: null,
              status: 'NOT_ANALYZED',
            }),
            relevanceAssessment: toSafeJson({
              relevanceScore: null,
              reasons: [],
              matchedApplications: [],
              matchedSignals: [],
              status: 'NOT_ASSESSED',
            }),
            researchHints: toSafeJson({
              suggestedDepartments: [],
              businessTopics: [],
              verificationQuestions: [],
              status: 'NOT_GENERATED',
            }),
            sourceIds: [source.id],
            analysisVersion: COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
            provider: IDENTITY_PROVIDER,
            analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
            confidence: identity.confidence,
            analysisKey,
          },
        })

      await transaction.companyProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          currentSnapshotId: snapshot.id,
          currentVersion: snapshotCount + 1,
        },
      })

      return {
        companyProfileId: profile.id,
        companySourceId: source.id,
        snapshotId: snapshot.id,
        opportunityId: input.opportunity.id,
        analysisVersion: COMPANY_INTELLIGENCE_ANALYSIS_VERSION,
        createdSnapshot: true,
      }
    })
  }
}

function metadataRecord(value: Prisma.JsonValue | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function sourceTitle(input: VerifiedCompanyIntelligenceInput) {
  if (input.evidence.title?.trim()) {
    return sanitizeProviderString(input.evidence.title.trim())
  }
  return new URL(input.evidence.sourceUrl).hostname
}

function sourceExcerpt(content: string) {
  return sanitizeProviderString(content.trim().slice(0, 1_500))
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export const companyIntelligence = new CompanyIntelligenceService()
