import { Router } from 'express'
import { understandProductController } from '../controllers/product.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const productRouter = Router()

productRouter.post('/understanding', asyncRoute(understandProductController))
