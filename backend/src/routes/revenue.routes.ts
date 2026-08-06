import { Router } from 'express'
import {
  createRevenueLedgerEntry,
  createRevenueOpportunity,
  getRevenueDashboard,
  updateRevenueOpportunity,
} from '../controllers/revenue.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const revenueRouter = Router()

revenueRouter.get('/dashboard', asyncRoute(getRevenueDashboard))
revenueRouter.post('/opportunities', asyncRoute(createRevenueOpportunity))
revenueRouter.patch('/opportunities/:id', asyncRoute(updateRevenueOpportunity))
revenueRouter.post('/ledger', asyncRoute(createRevenueLedgerEntry))
