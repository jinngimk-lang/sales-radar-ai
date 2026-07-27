import type { RequestHandler } from 'express'
import { assistantLeadService } from '../services/assistant-lead.service.js'
import { AppError } from '../utils/app-error.js'

interface AssistantLeadReader {
  listQualifiedLeads(): Promise<unknown[]>
  listQualifiedLeadsForUser?(userId: string): Promise<unknown[]>
}

function readAuthenticatedUserId(request: Parameters<RequestHandler>[0]) {
  const authenticatedRequest = request as typeof request & {
    user?: { id?: unknown }
  }
  const requestUserId = authenticatedRequest.user?.id
  const localUserId = request.res?.locals?.userId

  if (typeof requestUserId === 'string' && requestUserId.trim()) {
    return requestUserId.trim()
  }
  if (typeof localUserId === 'string' && localUserId.trim()) {
    return localUserId.trim()
  }
  return null
}

export function createListAssistantLeadsController(
  service: AssistantLeadReader = assistantLeadService,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = readAuthenticatedUserId(request)
    if (!authenticatedUserId && process.env.NODE_ENV === 'production') {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required to access Assistant leads',
      )
    }

    const leads =
      authenticatedUserId && service.listQualifiedLeadsForUser
        ? await service.listQualifiedLeadsForUser(authenticatedUserId)
        : await service.listQualifiedLeads()
    response.json({ data: leads, meta: { total: leads.length } })
  }
}

export const listAssistantLeadsController =
  createListAssistantLeadsController()
