import { Router } from 'express'
import {
  getMarketLiveBrowserController,
  listMarketSignalsController,
  runMarketResearchController,
  startMarketLiveBrowserController,
} from '../controllers/market-signal.controller.js'
import { asyncRoute } from '../middleware/async-route.js'
import { requireRevenueOperator } from '../middleware/revenue-operator-auth.js'

export const marketSignalRouter = Router()

marketSignalRouter.get('/', asyncRoute(listMarketSignalsController))
marketSignalRouter.post('/scan', asyncRoute(runMarketResearchController))

marketSignalRouter.post(
  '/live-browser',
  requireRevenueOperator,
  asyncRoute(startMarketLiveBrowserController),
)
marketSignalRouter.get(
  '/live-browser/:runId',
  requireRevenueOperator,
  asyncRoute(getMarketLiveBrowserController),
)
