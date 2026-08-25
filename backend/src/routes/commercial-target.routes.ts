import { Router } from 'express'
import {
  createCommercialTargetController,
  getCommercialTargetController,
  listCommercialTargetsController,
  updateCommercialTargetController,
} from '../controllers/commercial-target.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const commercialTargetRouter = Router()

commercialTargetRouter.get('/', asyncRoute(listCommercialTargetsController))
commercialTargetRouter.post('/', asyncRoute(createCommercialTargetController))
commercialTargetRouter.get('/:id', asyncRoute(getCommercialTargetController))
commercialTargetRouter.put('/:id', asyncRoute(updateCommercialTargetController))
