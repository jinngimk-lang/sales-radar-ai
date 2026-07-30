import type {
  LeadEvidenceStatus,
  LeadIdentityStatus,
} from '@prisma/client'
import type {
  OpportunityEntityRole,
  OpportunityReasonCode,
} from './opportunity.contract.js'
import type { SearchProductContext } from './product-context.contract.js'

export const RADAR_ASSESSMENT_VERSION = 'v1' as const

export type RadarCustomerGoal =
  | 'FIND_BUYERS'
  | 'FIND_SUPPLIERS'
  | 'FIND_PARTNERS'
  | 'FIND_DISTRIBUTORS'
  | 'RESEARCH_COMPETITORS'
  | 'EXPLORE_MARKET'
  | 'UNKNOWN'

export type RadarDecision =
  | 'OPPORTUNITY_CREATED'
  | 'POTENTIAL_OPPORTUNITY'
  | 'MARKET_SIGNAL_ONLY'
  | 'NEEDS_REVIEW'
  | 'BLOCKED'

export type RadarRecommendedAction =
  | 'CONTACT_RESEARCH'
  | 'VERIFY_ENTITY'
  | 'VERIFY_ROLE'
  | 'CHECK_PARTNERSHIP'
  | 'MONITOR_SIGNAL'
  | 'REVIEW_SOURCE'
  | 'NO_ACTION'

export type RadarRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type RadarReasonCode =
  | OpportunityReasonCode
  | 'USER_GOAL_BUYER'
  | 'USER_GOAL_SUPPLIER'
  | 'USER_GOAL_PARTNER'
  | 'USER_GOAL_DISTRIBUTOR'
  | 'USER_GOAL_COMPETITOR'
  | 'USER_GOAL_MARKET_EXPLORATION'
  | 'USER_GOAL_UNKNOWN'
  | 'USER_INTENT_MATCH'
  | 'USER_INTENT_MISMATCH'
  | 'USER_INTENT_NEEDS_REVIEW'
  | 'EVIDENCE_STATUS_VALID'
  | 'EVIDENCE_STATUS_REJECTED'
  | 'IDENTITY_STATUS_VERIFIED'
  | 'TITLE_ONLY_EVENT_BLOCKED'
  | 'MARKET_SIGNAL_RETAINED'
  | 'ENTITY_VERIFICATION_REQUIRED'
  | 'ROLE_VERIFICATION_REQUIRED'

export interface RadarConfidenceBreakdown {
  evidenceQuality: number
  eventSignal: number
  identityConfidence: number
  total: number
}

export interface RadarMatchBreakdown {
  productRelevance: number
  entityRoleFit: number
  userIntentFit: number
  eventRelevance: number
  total: number
}

export interface RadarScoreBreakdown {
  confidence: RadarConfidenceBreakdown
  match: RadarMatchBreakdown
}

export interface RadarSearchEvidenceInput {
  id: string
  provider: string
  rawUrl: string
  title: string | null
  content: string
  rawMetadata?: unknown
  companyName?: string | null
  identityConfidence?: number
  identityStatus?: LeadIdentityStatus | string
  evidenceStatus?: LeadEvidenceStatus | string
  createdAt?: Date | string
}

export interface RadarUserIntentSnapshot {
  version: string
  capturedAt?: string
  customerGoal?: RadarCustomerGoal | string
  salesIntent?: 'customer' | 'channel' | 'partnership' | string
  targetType?: 'buyer' | 'channel' | 'both' | string
  relationship?: string
  productContext?: SearchProductContext
}

export interface RadarAssessmentInput {
  evidence: RadarSearchEvidenceInput
  userIntentSnapshot: RadarUserIntentSnapshot
}

export interface RadarAssessment {
  assessmentVersion: typeof RADAR_ASSESSMENT_VERSION
  searchEvidenceId: string
  entityRole: OpportunityEntityRole
  customerGoal: RadarCustomerGoal
  decision: RadarDecision
  recommendedAction: RadarRecommendedAction
  confidenceScore: number
  matchScore: number
  riskLevel: RadarRiskLevel
  reasonCodes: RadarReasonCode[]
  scoreBreakdown: RadarScoreBreakdown
}
