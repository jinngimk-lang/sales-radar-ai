import { Industry, LeadOutcomeStatus } from '@prisma/client'
import type { RequestHandler } from 'express'
import { analyzeLead } from '../services/ai-analysis.service.js'
import { contactDiscovery } from '../services/contact-discovery.service.js'
import { contactRanking } from '../services/contact-ranking.service.js'
import { channelDiscovery } from '../services/channel-discovery.service.js'
import { getLeadById, listLeads } from '../services/lead.service.js'
import { leadResearch } from '../services/lead-research.service.js'
import { leadOutcomes } from '../services/lead-outcome.service.js'
import {
  leadResearchFeedback,
  LEAD_RESEARCH_FEEDBACK_TYPES,
  type LeadResearchFeedbackType,
} from '../services/lead-research-feedback.service.js'
import { outreachAgent } from '../services/outreach-agent.service.js'
import { AppError } from '../utils/app-error.js'

function readSingleQuery(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export const listLeadsController: RequestHandler = async (
  request,
  response,
) => {
  const industryValue = readSingleQuery(request.query.industry)
  const allowedIndustries = Object.values(Industry)

  if (
    industryValue &&
    !allowedIndustries.includes(industryValue as Industry)
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Unsupported industry')
  }

  const sort = readSingleQuery(request.query.sort)
  if (sort && sort !== 'asc' && sort !== 'desc') {
    throw new AppError(400, 'VALIDATION_ERROR', 'sort must be asc or desc')
  }

  const leads = await listLeads({
    keyword:
      readSingleQuery(request.query.keyword) ??
      readSingleQuery(request.query.q),
    industry: industryValue as Industry | undefined,
    country: readSingleQuery(request.query.country),
    intentSort: sort === 'asc' ? 'asc' : 'desc',
  })

  response.json({
    data: leads,
    meta: { total: leads.length },
  })
}

export const getLeadController: RequestHandler = async (request, response) => {
  const lead = await getLeadById(request.params.id)

  if (!lead) {
    throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
  }

  response.json({ data: lead })
}

export const analyzeLeadController: RequestHandler = async (
  request,
  response,
) => {
  const analysis = await analyzeLead(request.params.id)
  response.status(201).json({ data: analysis })
}

export const getLeadResearchController: RequestHandler = async (
  request,
  response,
) => {
  const research = await leadResearch.get(request.params.id)
  response.json({ data: research })
}

export const researchLeadController: RequestHandler = async (
  request,
  response,
) => {
  const productProfileId =
    typeof request.body?.productProfileId === 'string' &&
    request.body.productProfileId.trim()
      ? request.body.productProfileId.trim()
      : undefined
  const research = await leadResearch.researchAI(
    request.params.id,
    productProfileId,
  )
  response.json({ data: research })
}

interface LeadResearchFeedbackSubmitter {
  submit(
    leadId: string,
    input: {
      rating: number
      feedbackType: LeadResearchFeedbackType
      comment?: string
    },
  ): Promise<unknown>
}

export function createSubmitLeadResearchFeedbackController(
  service: LeadResearchFeedbackSubmitter = leadResearchFeedback,
): RequestHandler {
  return async (request, response) => {
  const rating = request.body?.rating
  const feedbackType = request.body?.feedbackType

  if (
    typeof rating !== 'number' ||
    typeof feedbackType !== 'string' ||
    !LEAD_RESEARCH_FEEDBACK_TYPES.includes(
      feedbackType as LeadResearchFeedbackType,
    )
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'rating and a supported feedbackType are required',
    )
  }

  const feedback = await service.submit(request.params.id, {
    rating,
    feedbackType: feedbackType as LeadResearchFeedbackType,
    comment:
      typeof request.body?.comment === 'string'
        ? request.body.comment
        : undefined,
  })

  response.status(201).json({ data: feedback })
  }
}

export const submitLeadResearchFeedbackController =
  createSubmitLeadResearchFeedbackController()

function readLeadOutcomeInput(body: unknown): {
  status: LeadOutcomeStatus
  note?: string
} {
  const input =
    body && typeof body === 'object'
      ? (body as { status?: unknown; note?: unknown })
      : {}

  if (
    typeof input.status !== 'string' ||
    !Object.values(LeadOutcomeStatus).includes(
      input.status as LeadOutcomeStatus,
    )
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'A supported outcome status is required',
    )
  }

  return {
    status: input.status as LeadOutcomeStatus,
    note: typeof input.note === 'string' ? input.note : undefined,
  }
}

export const createLeadOutcomeController: RequestHandler = async (
  request,
  response,
) => {
  const outcome = await leadOutcomes.create(
    request.params.id,
    readLeadOutcomeInput(request.body),
  )
  response.status(201).json({ data: outcome })
}

export const getLeadOutcomeController: RequestHandler = async (
  request,
  response,
) => {
  response.json({ data: await leadOutcomes.get(request.params.id) })
}

export const updateLeadOutcomeController: RequestHandler = async (
  request,
  response,
) => {
  response.json({
    data: await leadOutcomes.update(
      request.params.id,
      readLeadOutcomeInput(request.body),
    ),
  })
}

export const generateOutreachController: RequestHandler = async (
  request,
  response,
) => {
  const contactId =
    typeof request.body?.contactId === 'string' && request.body.contactId.trim()
      ? request.body.contactId.trim()
      : undefined
  const outreachType =
    request.body?.outreachType === 'channel' ? 'channel' : 'buyer'
  const generation = await outreachAgent.generate(
    request.params.id,
    contactId,
    outreachType,
  )
  response.status(201).json({ data: generation })
}

export const listOutreachHistoryController: RequestHandler = async (
  request,
  response,
) => {
  const messages = await outreachAgent.history(request.params.id)
  response.json({ data: messages, meta: { total: messages.length } })
}

export const discoverContactsController: RequestHandler = async (
  request,
  response,
) => {
  const contacts = await contactDiscovery.discover(request.params.id)
  response.status(201).json({ data: contacts, meta: { total: contacts.length } })
}

export const listContactsController: RequestHandler = async (
  request,
  response,
) => {
  const contacts = await contactDiscovery.list(request.params.id)
  response.json({ data: contacts, meta: { total: contacts.length } })
}

export const rankContactsController: RequestHandler = async (
  request,
  response,
) => {
  const contacts = await contactRanking.rank(request.params.id)
  response.json({ data: contacts, meta: { total: contacts.length } })
}

export const listRankedContactsController: RequestHandler = async (
  request,
  response,
) => {
  const contacts = await contactRanking.list(request.params.id)
  response.json({ data: contacts, meta: { total: contacts.length } })
}

export const discoverChannelController: RequestHandler = async (
  request,
  response,
) => {
  const channel = await channelDiscovery.discover(request.params.id)
  response.json({ data: channel })
}

export const getChannelController: RequestHandler = async (
  request,
  response,
) => {
  const channel = await channelDiscovery.get(request.params.id)
  const channels = channel ? [channel] : []
  response.json({ data: channels, meta: { total: channels.length } })
}
