import { Router } from 'express'
import {
  listAssistantLeadsController,
  runSalesAgentController,
} from '../controllers/assistant.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const assistantRouter = Router()

assistantRouter.get('/leads', asyncRoute(listAssistantLeadsController))
assistantRouter.post('/agent', asyncRoute(runSalesAgentController))
