import { Platform, Region } from '@prisma/client'
import type { RequestHandler } from 'express'
import {
  createSearchTask,
  getSearchTask,
  processSearchTask,
} from '../services/search-task.service.js'
import { AppError } from '../utils/app-error.js'
import { globalSearchIntelligence } from '../services/global-search-intelligence.service.js'

function parseEnumArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !allowed.includes(item as T))) {
    throw new AppError(400, 'VALIDATION_ERROR', `${fieldName} contains unsupported values`)
  }
  return value as T[]
}

export const createSearchTaskController: RequestHandler = async (
  request,
  response,
) => {
  const keyword =
    typeof request.body?.keyword === 'string' ? request.body.keyword.trim() : ''

  if (!keyword) {
    throw new AppError(400, 'VALIDATION_ERROR', 'keyword is required')
  }

  const strategy = await globalSearchIntelligence.createStrategy(keyword)
  const requestedRegions = parseEnumArray(
    request.body?.regions,
    Object.values(Region),
    'regions',
  )
  const inferredRegion = Object.values(Region).includes(
    strategy.intent.region as Region,
  )
    ? [strategy.intent.region as Region]
    : []

  const task = await createSearchTask({
    keyword: globalSearchIntelligence.optimizedKeyword(strategy, keyword),
    platforms: parseEnumArray(
      request.body?.platforms,
      Object.values(Platform),
      'platforms',
    ),
    regions:
      requestedRegions.length > 0 ? requestedRegions : inferredRegion,
  })

  setImmediate(() => {
    void processSearchTask(task.id).catch((error: unknown) => {
      console.error(`Search task ${task.id} failed`, error)
    })
  })

  response.status(202).json({ data: task, strategy })
}

export const getSearchTaskController: RequestHandler = async (
  request,
  response,
) => {
  const task = await getSearchTask(request.params.id)

  if (!task) {
    throw new AppError(404, 'SEARCH_TASK_NOT_FOUND', 'Search task not found')
  }

  response.json({ data: task })
}
