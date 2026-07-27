import { Router } from 'express'
import {
  createSearchTaskController,
  getSearchTaskController,
} from '../controllers/search-task.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const searchTaskRouter = Router()

searchTaskRouter.post('/', asyncRoute(createSearchTaskController))
searchTaskRouter.get('/:id', asyncRoute(getSearchTaskController))
