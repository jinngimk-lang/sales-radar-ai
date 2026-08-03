import { Router } from 'express'
import {
  listMarketSignalsController,
  runMarketResearchController,
} from '../controllers/market-signal.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const marketSignalRouter = Router()

marketSignalRouter.get('/', asyncRoute(listMarketSignalsController))
marketSignalRouter.post('/scan', asyncRoute(runMarketResearchController))
