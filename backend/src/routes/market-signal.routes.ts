import { Router } from 'express'
import { listMarketSignalsController } from '../controllers/market-signal.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const marketSignalRouter = Router()

marketSignalRouter.get('/', asyncRoute(listMarketSignalsController))
