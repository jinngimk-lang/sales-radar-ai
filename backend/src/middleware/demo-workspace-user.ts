import type { RequestHandler } from 'express'
import { ensureDemoUser } from '../services/demo-user.service.js'

/**
 * The current product runs as a single demo workspace. SearchTask already
 * resolves that workspace through ensureDemoUser(); Radar must receive the
 * same authenticated user context instead of bypassing its controller guard.
 *
 * A future account authentication middleware can set request.user or
 * response.locals.userId before this middleware. In that case this fallback
 * leaves the authenticated context unchanged.
 */
export const attachDemoWorkspaceUser: RequestHandler = (
  request,
  response,
  next,
) => {
  const authenticatedRequest = request as typeof request & {
    user?: { id?: unknown }
  }
  const requestUserId = authenticatedRequest.user?.id
  const localUserId = response.locals.userId

  if (
    (typeof requestUserId === 'string' && requestUserId.trim()) ||
    (typeof localUserId === 'string' && localUserId.trim())
  ) {
    next()
    return
  }

  void ensureDemoUser()
    .then((user) => {
      response.locals.userId = user.id
      next()
    })
    .catch(next)
}
