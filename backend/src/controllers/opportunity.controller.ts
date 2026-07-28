import type { Request, RequestHandler } from 'express'
import { ensureDemoUser } from '../services/demo-user.service.js'
import { companyIntelligenceWorkspace } from '../services/company-intelligence-workspace.service.js'
import { opportunityCompanyIntelligence } from '../services/opportunity-company-intelligence.service.js'
import { opportunityService } from '../services/opportunity.service.js'
import { AppError } from '../utils/app-error.js'

interface OpportunityDetailReader {
  getDetailForUser(id: string, userId: string): Promise<unknown>
}

interface OpportunityCompanyResearcher {
  research(input: {
    userId: string
    opportunityId: string
    searchEvidenceId: string
  }): Promise<unknown>
}

interface CompanyIntelligenceWorkspaceReader {
  getForUser(opportunityId: string, userId: string): Promise<unknown>
}

function readAuthenticatedUserId(request: Request) {
  const authenticatedRequest = request as Request & {
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

export function createGetOpportunityDetailController(
  service: OpportunityDetailReader = opportunityService,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = readAuthenticatedUserId(request)
    if (!authenticatedUserId && process.env.NODE_ENV === 'production') {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required to access opportunities',
      )
    }

    const userId =
      authenticatedUserId ?? (await demoUserResolver()).id
    const opportunity = await service.getDetailForUser(
      request.params.id,
      userId,
    )
    response.json({ data: opportunity })
  }
}

export const getOpportunityDetailController =
  createGetOpportunityDetailController()

export function createResearchOpportunityCompanyController(
  service: OpportunityCompanyResearcher =
    opportunityCompanyIntelligence,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = readAuthenticatedUserId(request)
    if (!authenticatedUserId && process.env.NODE_ENV === 'production') {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required to research opportunities',
      )
    }

    const searchEvidenceId =
      typeof request.body?.searchEvidenceId === 'string'
        ? request.body.searchEvidenceId.trim()
        : ''
    if (!searchEvidenceId) {
      throw new AppError(
        400,
        'SEARCH_EVIDENCE_ID_REQUIRED',
        'searchEvidenceId is required',
      )
    }

    const userId =
      authenticatedUserId ?? (await demoUserResolver()).id
    const result = await service.research({
      userId,
      opportunityId: request.params.id,
      searchEvidenceId,
    })
    response.json({ data: result })
  }
}

export const researchOpportunityCompanyController =
  createResearchOpportunityCompanyController()

export function createGetCompanyIntelligenceWorkspaceController(
  service: CompanyIntelligenceWorkspaceReader =
    companyIntelligenceWorkspace,
  demoUserResolver = ensureDemoUser,
): RequestHandler {
  return async (request, response) => {
    const authenticatedUserId = readAuthenticatedUserId(request)
    if (!authenticatedUserId && process.env.NODE_ENV === 'production') {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required to access company research',
      )
    }

    const userId =
      authenticatedUserId ?? (await demoUserResolver()).id
    const workspace = await service.getForUser(
      request.params.id,
      userId,
    )
    response.json({ data: workspace })
  }
}

export const getCompanyIntelligenceWorkspaceController =
  createGetCompanyIntelligenceWorkspaceController()
