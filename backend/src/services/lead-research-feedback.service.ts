import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { ensureDemoUser } from './demo-user.service.js'

export const LEAD_RESEARCH_FEEDBACK_TYPES = [
  'accurate',
  'inaccurate',
  'useful',
  'not_useful',
] as const

export type LeadResearchFeedbackType =
  (typeof LEAD_RESEARCH_FEEDBACK_TYPES)[number]

export interface LeadResearchFeedbackInput {
  rating: number
  feedbackType: LeadResearchFeedbackType
  comment?: string
}

export interface FeedbackResearch {
  id: string
}

export interface LeadResearchFeedbackRepository {
  findOwnedResearch(
    leadId: string,
    userId: string,
  ): Promise<FeedbackResearch | null>
  upsert(
    leadResearchId: string,
    userId: string,
    input: LeadResearchFeedbackInput,
  ): Promise<unknown>
}

const prismaRepository: LeadResearchFeedbackRepository = {
  findOwnedResearch: (leadId, userId) =>
    prisma.leadResearch.findFirst({
      where: {
        leadId,
        lead: { userId },
      },
      select: { id: true },
    }),
  upsert: (leadResearchId, userId, input) =>
    prisma.leadResearchFeedback.upsert({
      where: {
        leadResearchId_userId: { leadResearchId, userId },
      },
      create: {
        leadResearchId,
        userId,
        rating: input.rating,
        feedbackType: input.feedbackType,
        comment: input.comment,
      },
      update: {
        rating: input.rating,
        feedbackType: input.feedbackType,
        comment: input.comment,
      },
    }),
}

type UserResolver = () => Promise<{ id: string }>

export class LeadResearchFeedbackService {
  constructor(
    private readonly repository: LeadResearchFeedbackRepository =
      prismaRepository,
    private readonly resolveUser: UserResolver = ensureDemoUser,
  ) {}

  async submit(
    leadId: string,
    input: LeadResearchFeedbackInput,
  ): Promise<unknown> {
    this.validate(input)
    const user = await this.resolveUser()
    const research = await this.repository.findOwnedResearch(leadId, user.id)

    if (!research) {
      throw new AppError(
        404,
        'LEAD_RESEARCH_NOT_FOUND',
        'Lead research not found',
      )
    }

    return this.repository.upsert(research.id, user.id, {
      ...input,
      comment: this.cleanComment(input.comment),
    })
  }

  private validate(input: LeadResearchFeedbackInput): void {
    if (
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'rating must be an integer between 1 and 5',
      )
    }

    if (!LEAD_RESEARCH_FEEDBACK_TYPES.includes(input.feedbackType)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Unsupported feedbackType',
      )
    }
  }

  private cleanComment(comment?: string): string | undefined {
    if (typeof comment !== 'string') return undefined
    const cleaned = comment.trim()
    return cleaned ? cleaned.slice(0, 1000) : undefined
  }
}

export const leadResearchFeedback = new LeadResearchFeedbackService()
