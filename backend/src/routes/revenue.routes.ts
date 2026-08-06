import { Router } from 'express'
import {
  createRevenueLedgerEntry,
  createRevenueOpportunity,
  getRevenueDashboard,
  updateRevenueOpportunity,
} from '../controllers/revenue.controller.js'
import {
  getRevenueLiveStatus,
  startRevenueLiveRun,
  stopRevenueLiveRun,
} from '../controllers/revenue-live.controller.js'
import { asyncRoute } from '../middleware/async-route.js'
import { requireRevenueOperator } from '../middleware/revenue-operator-auth.js'

export const revenueRouter = Router()

revenueRouter.get('/dashboard', asyncRoute(getRevenueDashboard))
revenueRouter.post('/opportunities', asyncRoute(createRevenueOpportunity))
revenueRouter.patch('/opportunities/:id', asyncRoute(updateRevenueOpportunity))
revenueRouter.post('/ledger', asyncRoute(createRevenueLedgerEntry))

revenueRouter.get(
  '/live/status',
  requireRevenueOperator,
  asyncRoute(getRevenueLiveStatus),
)
revenueRouter.post(
  '/live/runs',
  requireRevenueOperator,
  asyncRoute(startRevenueLiveRun),
)
revenueRouter.post(
  '/live/runs/:id/stop',
  requireRevenueOperator,
  asyncRoute(stopRevenueLiveRun),
)
