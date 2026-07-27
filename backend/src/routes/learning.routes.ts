import { Router } from 'express'
import {
  getLearningOverviewController,
  getLearningProductsController,
  getLearningInsightsController,
} from '../controllers/learning.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const learningRouter = Router()

learningRouter.get('/overview', asyncRoute(getLearningOverviewController))
learningRouter.get('/products', asyncRoute(getLearningProductsController))
learningRouter.get('/insights', asyncRoute(getLearningInsightsController))
