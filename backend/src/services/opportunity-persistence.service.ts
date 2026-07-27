import type { Prisma } from '@prisma/client'
import type { SearchProductContext } from '../contracts/product-context.contract.js'
import type { OpportunityDetectionResult } from '../contracts/opportunity.contract.js'
import { prisma } from '../prisma/client.js'
import { toSafeJson } from './safe-json.service.js'

export interface PersistOpportunityInput {
  userId: string
  searchTaskId: string
  searchEvidenceId: string
  productContext: SearchProductContext
  detection: OpportunityDetectionResult
}

type OpportunityTransaction = Pick<
  Prisma.TransactionClient,
  'opportunity' | 'opportunityEvidence'
>

export class OpportunityPersistenceService {
  async persist(
    input: PersistOpportunityInput,
    client: OpportunityTransaction = prisma,
  ) {
    const opportunity = await client.opportunity.upsert({
      where: {
        searchTaskId_dedupeKey: {
          searchTaskId: input.searchTaskId,
          dedupeKey: input.detection.dedupeKey,
        },
      },
      create: {
        userId: input.userId,
        searchTaskId: input.searchTaskId,
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

    await client.opportunityEvidence.upsert({
      where: {
        opportunityId_searchEvidenceId: {
          opportunityId: opportunity.id,
          searchEvidenceId: input.searchEvidenceId,
        },
      },
      create: {
        opportunityId: opportunity.id,
        searchEvidenceId: input.searchEvidenceId,
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

    return opportunity
  }
}

export const opportunityPersistence = new OpportunityPersistenceService()
