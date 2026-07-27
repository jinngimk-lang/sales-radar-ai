import { Router } from 'express'
import {
  analyzeLeadController,
  discoverContactsController,
  discoverChannelController,
  getLeadController,
  getLeadResearchController,
  getChannelController,
  generateOutreachController,
  listOutreachHistoryController,
  listContactsController,
  listRankedContactsController,
  listLeadsController,
  researchLeadController,
  rankContactsController,
} from '../controllers/lead.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const leadRouter = Router()

leadRouter.get('/', asyncRoute(listLeadsController))
leadRouter.get('/:id', asyncRoute(getLeadController))
leadRouter.post('/:id/analyze', asyncRoute(analyzeLeadController))
leadRouter.get('/:id/research', asyncRoute(getLeadResearchController))
leadRouter.post('/:id/research', asyncRoute(researchLeadController))
leadRouter.get('/:id/outreach', asyncRoute(listOutreachHistoryController))
leadRouter.post('/:id/outreach', asyncRoute(generateOutreachController))
leadRouter.get('/:id/contacts', asyncRoute(listContactsController))
leadRouter.post('/:id/contacts', asyncRoute(discoverContactsController))
leadRouter.post('/:id/contacts/rank', asyncRoute(rankContactsController))
leadRouter.get('/:id/contacts/ranked', asyncRoute(listRankedContactsController))
leadRouter.get('/:id/channels', asyncRoute(getChannelController))
leadRouter.post('/:id/channels', asyncRoute(discoverChannelController))
