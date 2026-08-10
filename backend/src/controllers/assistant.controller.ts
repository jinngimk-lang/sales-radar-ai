import type { RequestHandler } from 'express'
import { assistantLeadService } from '../services/assistant-lead.service.js'
import {
  type SalesAgentHistoryMessage,
} from '../services/openai-sales-agent.service.js'
import { agentRuntimeFactory } from '../providers/agent-runtime/agent-runtime.factory.js'
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

function requireAuthenticatedUserId(
  request: Parameters<RequestHandler>[0],
): string | undefined {
  const userId = readAuthenticatedUserId(request)
  if (!userId && process.env.NODE_ENV === 'production') {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication is required to access the Sales Agent',
    )
  }
  return userId ?? undefined
}

export function createListAssistantLeadsController(
  service: AssistantLeadReader = assistantLeadService,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = requireAuthenticatedUserId(request)
    const leads =
      authenticatedUserId && service.listQualifiedLeadsForUser
        ? await service.listQualifiedLeadsForUser(authenticatedUserId)
        : await service.listQualifiedLeads()
    response.json({ data: leads, meta: { total: leads.length } })
  }
}

export const runSalesAgentController: RequestHandler = async (
  request,
  response,
) => {
  const message =
    typeof request.body?.message === 'string' ? request.body.message.trim() : ''
  if (!message) {
    throw new AppError(400, 'VALIDATION_ERROR', 'message is required')
  }
  if (message.length > 12_000) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'message must not exceed 12000 characters',
    )
  }

  const runtime = agentRuntimeFactory.resolve()
  const result = await runtime.run({
    message,
    model: runtime.name === 'openai' &&
      typeof request.body?.model === 'string' && request.body.model.trim()
        ? request.body.model.trim().slice(0, 100)
        : undefined,
    leadId:
      typeof request.body?.leadId === 'string' && request.body.leadId.trim()
        ? request.body.leadId.trim()
        : undefined,
    history: readHistory(request.body?.history),
    userId: requireAuthenticatedUserId(request),
  })
  response.json({ data: result })
}

function readHistory(value: unknown): SalesAgentHistoryMessage[] {
  if (!Array.isArray(value)) return []
  return value.slice(-12).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const candidate = item as { role?: unknown; content?: unknown }
    if (
      (candidate.role !== 'user' && candidate.role !== 'assistant') ||
      typeof candidate.content !== 'string' ||
      !candidate.content.trim()
    ) {
      return []
    }
    return [
      {
        role: candidate.role,
        content: candidate.content.trim().slice(0, 8_000),
      },
    ]
  })
}

export const listAssistantLeadsController =
  createListAssistantLeadsController()
