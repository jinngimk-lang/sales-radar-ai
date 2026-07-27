import { Router } from 'express'
import {
  createSearchTaskController,
  getSearchTaskOpportunitiesController,
  getSearchTaskController,
  getSearchTaskResultsController,
} from '../controllers/search-task.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const searchTaskRouter = Router()

searchTaskRouter.post('/', asyncRoute(createSearchTaskController))
searchTaskRouter.get(
  '/:id/results',
  asyncRoute(getSearchTaskResultsController),
)
searchTaskRouter.get(
  '/:id/opportunities',
  asyncRoute(getSearchTaskOpportunitiesController),
)
searchTaskRouter.get('/:id', asyncRoute(getSearchTaskController))
