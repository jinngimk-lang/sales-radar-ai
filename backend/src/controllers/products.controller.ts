import type { RequestHandler } from 'express'
import {
  productIntelligence,
  type ProductProfileUpdate,
} from '../services/product-intelligence.service.js'
import { AppError } from '../utils/app-error.js'

export const createProductController: RequestHandler = async (
  request,
  response,
) => {
  const query =
    typeof request.body?.query === 'string' ? request.body.query.trim() : ''
  if (!query) {
    throw new AppError(400, 'VALIDATION_ERROR', 'query is required')
  }
  response.status(201).json({ data: await productIntelligence.create(query) })
}

export const listProductsController: RequestHandler = async (
  _request,
  response,
) => {
  const products = await productIntelligence.list()
  response.json({ data: products, meta: { total: products.length } })
}

export const getProductController: RequestHandler = async (
  request,
  response,
) => {
  response.json({ data: await productIntelligence.get(request.params.id) })
}

export const updateProductController: RequestHandler = async (
  request,
  response,
) => {
  if (!request.body || typeof request.body !== 'object') {
    throw new AppError(400, 'VALIDATION_ERROR', 'request body is required')
  }
  response.json({
    data: await productIntelligence.update(
      request.params.id,
      request.body as ProductProfileUpdate,
    ),
  })
}

export const analyzeProductController: RequestHandler = async (
  request,
  response,
) => {
  response.json({ data: await productIntelligence.analyze(request.params.id) })
}
