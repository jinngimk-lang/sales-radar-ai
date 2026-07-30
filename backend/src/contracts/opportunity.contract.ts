import type { OpportunityType } from '@prisma/client'
import type { SearchProductContext } from './product-context.contract.js'

export const CURRENT_OPPORTUNITY_DETECTION_VERSION = 'v2'

export type OpportunityEntityRole =
  | 'END_CUSTOMER'
  | 'SUPPLIER'
  | 'PARTNER'
  | 'DISTRIBUTOR'
  | 'COMPETITOR'
  | 'UNKNOWN'

export type OpportunityCustomerGoal =
  | 'BUYER'
  | 'SUPPLIER'
  | 'PARTNER'
  | 'DISTRIBUTOR'
  | 'COMPETITOR'
  | 'UNKNOWN'

export type OpportunityReasonCode =
  | 'REAL_SOURCE_AVAILABLE'
  | 'EVIDENCE_CONTENT_SUFFICIENT'
  | 'EVIDENCE_TIMESTAMP_AVAILABLE'
  | 'INVESTMENT_SIGNAL'
  | 'NEW_FACTORY_SIGNAL'
  | 'FACTORY_EXPANSION_SIGNAL'
  | 'AUTOMATION_UPGRADE_SIGNAL'
  | 'DIGITAL_UPGRADE_SIGNAL'
  | 'BODY_EVENT_CONFIRMED'
  | 'TITLE_EVENT_CORROBORATED'
  | 'PRODUCT_FAMILY_MATCH'
  | 'TARGET_INDUSTRY_MATCH'
  | 'PRODUCT_CONTEXT_MATCH'
  | 'REGION_CONTEXT_MATCH'
  | 'EXPLICIT_COMPANY_IDENTITY'
  | 'IDENTITY_NEEDS_REVIEW'
  | 'ENTITY_ROLE_END_CUSTOMER'
  | 'ENTITY_ROLE_SUPPLIER'
  | 'ENTITY_ROLE_PARTNER'
  | 'ENTITY_ROLE_DISTRIBUTOR'
  | 'ENTITY_ROLE_COMPETITOR'
  | 'ENTITY_ROLE_UNKNOWN'
  | 'TARGET_ROLE_MATCH'
  | 'TARGET_ROLE_UNKNOWN'
  | 'TARGET_ROLE_MISMATCH'
  | 'SUPPLIER_PAGE_BLOCKED'
  | 'MOCK_SOURCE_BLOCKED'
  | 'INVALID_SOURCE_URL'
  | 'EVIDENCE_CONTENT_INSUFFICIENT'
  | 'PRODUCT_CONTEXT_MISSING'
  | 'BODY_EVENT_MISSING'
  | 'PRODUCT_RELEVANCE_INSUFFICIENT'
  | 'OPPORTUNITY_SCORE_INSUFFICIENT'

export const OPPORTUNITY_REASON_UI_TEXT: Record<
  OpportunityReasonCode,
  string
> = {
  REAL_SOURCE_AVAILABLE: '已关联真实来源',
  EVIDENCE_CONTENT_SUFFICIENT: '来源正文足以支持进一步判断',
  EVIDENCE_TIMESTAMP_AVAILABLE: '来源包含时间信息',
  INVESTMENT_SIGNAL: '发现企业投资信号',
  NEW_FACTORY_SIGNAL: '发现新工厂建设信号',
  FACTORY_EXPANSION_SIGNAL: '发现工厂或产能扩张信号',
  AUTOMATION_UPGRADE_SIGNAL: '发现自动化升级信号',
  DIGITAL_UPGRADE_SIGNAL: '发现数字化升级信号',
  BODY_EVENT_CONFIRMED: '企业变化信号已在正文中确认',
  TITLE_EVENT_CORROBORATED: '标题与正文中的企业变化相互印证',
  PRODUCT_FAMILY_MATCH: '企业变化与当前产品方向相关',
  TARGET_INDUSTRY_MATCH: '企业所属行业与目标行业匹配',
  PRODUCT_CONTEXT_MATCH: '来源内容与产品上下文相关',
  REGION_CONTEXT_MATCH: '来源地区与目标市场匹配',
  EXPLICIT_COMPANY_IDENTITY: '来源明确提供企业主体',
  IDENTITY_NEEDS_REVIEW: '企业主体仍需进一步确认',
  ENTITY_ROLE_END_CUSTOMER: '识别为潜在终端客户',
  ENTITY_ROLE_SUPPLIER: '识别为供应商',
  ENTITY_ROLE_PARTNER: '识别为潜在合作伙伴',
  ENTITY_ROLE_DISTRIBUTOR: '识别为经销或渠道企业',
  ENTITY_ROLE_COMPETITOR: '识别为同类市场参与者',
  ENTITY_ROLE_UNKNOWN: '企业角色仍待确认',
  TARGET_ROLE_MATCH: '企业角色与当前销售目标匹配',
  TARGET_ROLE_UNKNOWN: '销售目标或企业角色尚未完全确认',
  TARGET_ROLE_MISMATCH: '企业角色与当前销售目标不匹配',
  SUPPLIER_PAGE_BLOCKED: '供应商页面，不作为买家机会',
  MOCK_SOURCE_BLOCKED: '模拟来源不能生成销售机会',
  INVALID_SOURCE_URL: '来源链接无效',
  EVIDENCE_CONTENT_INSUFFICIENT: '来源正文不足，无法支持机会判断',
  PRODUCT_CONTEXT_MISSING: '缺少产品上下文',
  BODY_EVENT_MISSING: '正文中没有明确企业变化信号',
  PRODUCT_RELEVANCE_INSUFFICIENT: '与当前产品方向的相关性不足',
  OPPORTUNITY_SCORE_INSUFFICIENT: '综合评分不足，保留为研究信息',
}

export interface OpportunityScoreBreakdown {
  evidenceQuality: number
  eventSignal: number
  productRelevance: number
  identityConfidence: number
  roleFit: number
}

export interface OpportunityDetectionInput {
  provider: string
  sourceUrl: string
  title: string | null
  content: string
  rawMetadata: unknown
  explicitCompanyName?: string | null
  productContext?: SearchProductContext
}

export interface OpportunityDetectionResult {
  type: OpportunityType
  dedupeKey: string
  companyName: string | null
  title: string
  summary: string
  whyItMatters: string
  recommendedNextStep: string
  confidence: number
  evidenceExcerpt: string
  detectionVersion: string
  entityRole: OpportunityEntityRole
  customerGoal: OpportunityCustomerGoal
  scoreBreakdown: OpportunityScoreBreakdown
  reasons: OpportunityReasonCode[]
}

export interface OpportunityDetectionAssessment {
  passed: boolean
  entityRole: OpportunityEntityRole
  customerGoal: OpportunityCustomerGoal
  confidence: number
  scoreBreakdown: OpportunityScoreBreakdown
  reasons: OpportunityReasonCode[]
  result: OpportunityDetectionResult | null
}
