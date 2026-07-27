import { Router } from 'express'
import { parseSearchIntentController } from '../controllers/search.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const searchRouter = Router()

searchRouter.post('/intent', asyncRoute(parseSearchIntentController))
