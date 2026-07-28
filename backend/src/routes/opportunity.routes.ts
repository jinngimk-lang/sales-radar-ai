import { Router } from 'express'
import {
  getCompanyIntelligenceWorkspaceController,
  getOpportunityDetailController,
  researchOpportunityCompanyController,
} from '../controllers/opportunity.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const opportunityRouter = Router()

opportunityRouter.get(
  '/:id/company-intelligence/workspace',
  asyncRoute(getCompanyIntelligenceWorkspaceController),
)
opportunityRouter.post(
  '/:id/company-intelligence',
  asyncRoute(researchOpportunityCompanyController),
)
opportunityRouter.get('/:id', asyncRoute(getOpportunityDetailController))
