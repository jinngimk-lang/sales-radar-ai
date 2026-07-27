import { Router } from 'express'
import {
  getSearchProviderHealthController,
  parseSearchIntentController,
} from '../controllers/search.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const searchRouter = Router()

searchRouter.get(
  '/providers/health',
  asyncRoute(getSearchProviderHealthController),
)
searchRouter.post('/intent', asyncRoute(parseSearchIntentController))
