import { Router } from 'express'
import {
  analyzeProductController,
  createProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from '../controllers/products.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const productsRouter = Router()

productsRouter.post('/', asyncRoute(createProductController))
productsRouter.get('/', asyncRoute(listProductsController))
productsRouter.get('/:id', asyncRoute(getProductController))
productsRouter.put('/:id', asyncRoute(updateProductController))
productsRouter.post('/:id/analyze', asyncRoute(analyzeProductController))
