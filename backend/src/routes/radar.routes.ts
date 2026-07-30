import { Router } from 'express'
import {
  createRadarAssessment,
  listRadarAssessments,
} from '../controllers/radar.controller.js'
import { asyncRoute } from '../middleware/async-route.js'

export const radarRouter = Router()

radarRouter.post('/assessments', asyncRoute(createRadarAssessment))
radarRouter.get('/assessments', asyncRoute(listRadarAssessments))
