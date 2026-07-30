import {
  OpportunityIntegrityStatus,
  type PrismaClient,
} from '@prisma/client'
import type { SearchProductContext } from '../contracts/product-context.contract.js'
import type { OpportunityDetectionResult } from '../contracts/opportunity.contract.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { toSafeJson } from './safe-json.service.js'

export interface PersistOpportunityInput {
  userId: string
  searchTaskId: string
  searchEvidenceId: string
  productContext: SearchProductContext
  detection: OpportunityDetectionResult
}

export class OpportunityPersistenceService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async persist(input: PersistOpportunityInput) {
    return this.db.$transaction(async (transaction) => {
      const evidence = await transaction.searchEvidence.findFirst({
        where: {
          id: input.searchEvidenceId,
          searchTaskId: input.searchTaskId,
          searchTask: {
            userId: input.userId,
          },
        },
        select: { id: true },
      })

      if (!evidence) {
        throw new AppError(
          404,
          'OPPORTUNITY_EVIDENCE_NOT_FOUND',
          'Search evidence is not available for this opportunity',
        )
      }

      const opportunity = await transaction.opportunity.upsert({
        where: {
          searchTaskId_dedupeKey: {
            searchTaskId: input.searchTaskId,
            dedupeKey: input.detection.dedupeKey,
          },
        },
        create: {
          userId: input.userId,
          searchTaskId: input.searchTaskId,
          integrityStatus: OpportunityIntegrityStatus.LEGACY_INVALID,
          type: input.detection.type,
          dedupeKey: input.detection.dedupeKey,
          companyName: input.detection.companyName,
          title: input.detection.title,
          summary: input.detection.summary,
          whyItMatters: input.detection.whyItMatters,
          recommendedNextStep: input.detection.recommendedNextStep,
          confidence: input.detection.confidence,
          productContextSnapshot: toSafeJson(input.productContext),
          detectionVersion: input.detection.detectionVersion,
        },
        update: {
          type: input.detection.type,
          companyName: input.detection.companyName,
          title: input.detection.title,
          summary: input.detection.summary,
          whyItMatters: input.detection.whyItMatters,
          recommendedNextStep: input.detection.recommendedNextStep,
          confidence: input.detection.confidence,
          productContextSnapshot: toSafeJson(input.productContext),
          detectionVersion: input.detection.detectionVersion,
        },
      })

      await transaction.opportunityEvidence.upsert({
        where: {
          opportunityId_searchEvidenceId: {
            opportunityId: opportunity.id,
            searchEvidenceId: evidence.id,
          },
        },
        create: {
          opportunityId: opportunity.id,
          searchEvidenceId: evidence.id,
          excerpt: input.detection.evidenceExcerpt,
          isPrimary: true,
          confidence: input.detection.confidence,
        },
        update: {
          excerpt: input.detection.evidenceExcerpt,
          isPrimary: true,
          confidence: input.detection.confidence,
        },
      })

      return transaction.opportunity.update({
        where: { id: opportunity.id },
        data: {
          integrityStatus: OpportunityIntegrityStatus.EVIDENCE_LINKED,
        },
      })
    })
  }
}

export const opportunityPersistence = new OpportunityPersistenceService()
