import { Industry } from '@prisma/client'
import type { RequestHandler } from 'express'
import { analyzeLead } from '../services/ai-analysis.service.js'
import { contactDiscovery } from '../services/contact-discovery.service.js'
import { contactRanking } from '../services/contact-ranking.service.js'
import { channelDiscovery } from '../services/channel-discovery.service.js'
import { getLeadById, listLeads } from '../services/lead.service.js'
import { leadResearch } from '../services/lead-research.service.js'
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
  const research = await leadResearch.research(request.params.id)
  response.json({ data: research })
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
