import { LeadOutcomeStatus } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { ensureDemoUser } from './demo-user.service.js'

export interface LeadOutcomeInput {
  status: LeadOutcomeStatus
  note?: string
}

export interface OutcomeLead {
  id: string
}

export interface StoredLeadOutcome {
  id: string
  leadId: string
  userId: string
  status: LeadOutcomeStatus
  note: string | null
}

export interface LeadOutcomeRepository {
  findOwnedLead(leadId: string, userId: string): Promise<OutcomeLead | null>
  findByLead(
    leadId: string,
    userId: string,
  ): Promise<StoredLeadOutcome | null>
  create(
    leadId: string,
    userId: string,
    input: LeadOutcomeInput,
  ): Promise<unknown>
  update(id: string, input: LeadOutcomeInput): Promise<unknown>
}

const prismaRepository: LeadOutcomeRepository = {
  findOwnedLead: (leadId, userId) =>
    prisma.lead.findFirst({
      where: { id: leadId, userId },
      select: { id: true },
    }),
  findByLead: (leadId, userId) =>
    prisma.leadOutcome.findFirst({ where: { leadId, userId } }),
  create: (leadId, userId, input) =>
    prisma.leadOutcome.create({
      data: {
        leadId,
        userId,
        status: input.status,
        note: input.note,
      },
    }),
  update: (id, input) =>
    prisma.leadOutcome.update({
      where: { id },
      data: {
        status: input.status,
        note: input.note,
      },
    }),
}

type UserResolver = () => Promise<{ id: string }>

export class LeadOutcomeService {
  constructor(
    private readonly repository: LeadOutcomeRepository = prismaRepository,
    private readonly resolveUser: UserResolver = ensureDemoUser,
  ) {}

  async create(leadId: string, input: LeadOutcomeInput): Promise<unknown> {
    const cleaned = this.validate(input)
    const user = await this.resolveUser()
    await this.requireOwnedLead(leadId, user.id)
    const existing = await this.repository.findByLead(leadId, user.id)

    if (existing) {
      throw new AppError(
        409,
        'LEAD_OUTCOME_EXISTS',
        'Lead outcome already exists',
      )
    }

    return this.repository.create(leadId, user.id, cleaned)
  }

  async get(leadId: string): Promise<StoredLeadOutcome | null> {
    const user = await this.resolveUser()
    await this.requireOwnedLead(leadId, user.id)
    return this.repository.findByLead(leadId, user.id)
  }

  async update(leadId: string, input: LeadOutcomeInput): Promise<unknown> {
    const cleaned = this.validate(input)
    const user = await this.resolveUser()
    await this.requireOwnedLead(leadId, user.id)
    const existing = await this.repository.findByLead(leadId, user.id)

    if (!existing) {
      throw new AppError(
        404,
        'LEAD_OUTCOME_NOT_FOUND',
        'Lead outcome not found',
      )
    }

    return this.repository.update(existing.id, cleaned)
  }

  private async requireOwnedLead(
    leadId: string,
    userId: string,
  ): Promise<void> {
    if (!(await this.repository.findOwnedLead(leadId, userId))) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
    }
  }

  private validate(input: LeadOutcomeInput): LeadOutcomeInput {
    if (!Object.values(LeadOutcomeStatus).includes(input.status)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Unsupported outcome status',
      )
    }

    const note =
      typeof input.note === 'string' && input.note.trim()
        ? input.note.trim().slice(0, 2000)
        : undefined

    return { status: input.status, note }
  }
}

export const leadOutcomes = new LeadOutcomeService()
