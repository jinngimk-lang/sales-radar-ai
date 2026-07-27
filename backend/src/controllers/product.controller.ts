import type { RequestHandler } from 'express'
import { productUnderstanding } from '../services/product-understanding.service.js'
import { AppError } from '../utils/app-error.js'

export const understandProductController: RequestHandler = async (
  request,
  response,
) => {
  const query =
    typeof request.body?.query === 'string' ? request.body.query.trim() : ''
  if (!query) {
    throw new AppError(400, 'VALIDATION_ERROR', 'query is required')
  }

  response.json({ data: await productUnderstanding.understand(query) })
}
