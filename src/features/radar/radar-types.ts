import type {
  RadarAssessment,
  RadarAssessmentDecision,
  RadarEntityRole,
  RadarRiskLevel,
} from '../../types/index.ts'

export type RadarViewMode = 'compact' | 'table' | 'cards'

export type RadarSortKey =
  | 'recommended'
  | 'match-desc'
  | 'match-asc'
  | 'confidence-desc'
  | 'confidence-asc'
  | 'risk-asc'
  | 'risk-desc'
  | 'latest'
  | 'earliest'

export type RadarDecisionFilter =
  | Exclude<RadarAssessmentDecision, 'BLOCKED'>
  | 'ALL'

export type RadarEntityRoleFilter = RadarEntityRole | 'ALL'
export type RadarRiskFilter = RadarRiskLevel | 'ALL'
export type RadarIdentityFilter = 'ALL' | 'IDENTIFIED' | 'UNKNOWN'

export interface RadarFilters {
  decision: RadarDecisionFilter
  entityRole: RadarEntityRoleFilter
  risk: RadarRiskFilter
  sourceType: string
  identity: RadarIdentityFilter
  matchMin: number
  confidenceMin: number
}

export interface RadarClusterSource {
  id: string
  url: string
  canonicalUrl: string
  title: string | null
  excerpt: string | null
  sourceType: string
  provider: string
  identityStatus: string | null
  evidenceStatus: string | null
  publishedAt: string | null
  createdAt: string
  assessmentIds: string[]
}

export interface RadarResultCluster {
  id: string
  searchTaskId: string
  entityKey: string
  eventKey: string
  entityName: string
  normalizedDomain: string | null
  hasExplicitEntity: boolean
  eventSummary: string
  primaryAssessment: RadarAssessment
  assessments: RadarAssessment[]
  sources: RadarClusterSource[]
  sourceCount: number
  latestPublishedAt: string
  decision: RadarAssessmentDecision
  entityRole: RadarEntityRole
  matchScore: number
  confidenceScore: number
  riskLevel: RadarRiskLevel
  originalIndex: number
  hasMultipleDecisions: boolean
}

export const DEFAULT_RADAR_FILTERS: RadarFilters = {
  decision: 'ALL',
  entityRole: 'ALL',
  risk: 'ALL',
  sourceType: 'ALL',
  identity: 'ALL',
  matchMin: 0,
  confidenceMin: 0,
}
