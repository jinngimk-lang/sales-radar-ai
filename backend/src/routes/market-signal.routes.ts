import { Router } from 'express'
import {
  getMarketLiveBrowserController,
  listMarketSignalsController,
  runMarketResearchController,
  startMarketLiveBrowserController,
} from '../controllers/market-signal.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const marketSignalRouter = Router()

marketSignalRouter.get('/', asyncRoute(listMarketSignalsController))
marketSignalRouter.post('/scan', asyncRoute(runMarketResearchController))

marketSignalRouter.post('/live-browser', asyncRoute(startMarketLiveBrowserController))
marketSignalRouter.get('/live-browser/:runId', asyncRoute(getMarketLiveBrowserController))
