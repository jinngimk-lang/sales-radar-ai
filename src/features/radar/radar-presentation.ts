import type {
  RadarAssessmentDecision,
  RadarEntityRole,
  RadarRecommendedAction,
  RadarRiskLevel,
} from '../../types/index.ts'

export const DECISION_LABELS: Record<RadarAssessmentDecision, string> = {
  OPPORTUNITY_CREATED: '🔥 高匹配机会',
  POTENTIAL_OPPORTUNITY: '🟡 潜在机会',
  MARKET_SIGNAL_ONLY: '🔵 市场信号',
  NEEDS_REVIEW: '⚪ 需要判断',
  BLOCKED: '暂不推荐',
}

export const ROLE_LABELS: Record<RadarEntityRole, string> = {
  END_CUSTOMER: '终端客户',
  SUPPLIER: '供应商',
  PARTNER: '合作伙伴',
  DISTRIBUTOR: '分销商',
  COMPETITOR: '竞争对手',
  UNKNOWN: '角色待确认',
}

export const RISK_LABELS: Record<RadarRiskLevel, string> = {
  LOW: '低风险',
  MEDIUM: '中风险',
  HIGH: '高风险',
}

export const RISK_DESCRIPTIONS: Record<RadarRiskLevel, string> = {
  LOW: '信息较充分',
  MEDIUM: '存在部分待确认信息',
  HIGH: '需要人工进一步确认',
}

export const ACTION_LABELS: Record<RadarRecommendedAction, string> = {
  CONTACT_RESEARCH: '进一步研究企业与相关部门',
  VERIFY_ENTITY: '核实企业主体和来源关系',
  VERIFY_ROLE: '确认企业在本次搜索中的角色',
  CHECK_PARTNERSHIP: '核实合作方式和业务范围',
  MONITOR_SIGNAL: '持续关注后续市场变化',
  REVIEW_SOURCE: '回到原始来源核对信息',
  NO_ACTION: '暂不采取销售行动',
}

const REASON_LABELS: Record<string, string> = {
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
  TARGET_INDUSTRY_MATCH: '企业所属方向与目标行业相关',
  PRODUCT_CONTEXT_MATCH: '来源内容与当前产品方向相关',
  REGION_CONTEXT_MATCH: '来源地区与目标市场相关',
  EXPLICIT_COMPANY_IDENTITY: '来源明确提供企业主体',
  IDENTITY_NEEDS_REVIEW: '企业主体仍需进一步确认',
  ENTITY_ROLE_END_CUSTOMER: '识别为目标客户角色',
  ENTITY_ROLE_SUPPLIER: '识别为供应商角色',
  ENTITY_ROLE_PARTNER: '识别为合作伙伴角色',
  ENTITY_ROLE_DISTRIBUTOR: '识别为分销或渠道角色',
  ENTITY_ROLE_COMPETITOR: '识别为同类市场参与者',
  ENTITY_ROLE_UNKNOWN: '企业角色仍待确认',
  TARGET_ROLE_MATCH: '企业角色与当前销售目标匹配',
  TARGET_ROLE_UNKNOWN: '销售目标或企业角色尚未完全确认',
  TARGET_ROLE_MISMATCH: '企业角色与当前销售目标不匹配',
  SUPPLIER_PAGE_BLOCKED: '供应商页面不作为买家机会',
  MOCK_SOURCE_BLOCKED: '模拟来源不能形成销售判断',
  INVALID_SOURCE_URL: '来源链接需要核对',
  EVIDENCE_CONTENT_INSUFFICIENT: '来源正文不足，无法支持判断',
  PRODUCT_CONTEXT_MISSING: '缺少本次搜索的产品上下文',
  BODY_EVENT_MISSING: '正文中没有明确企业变化信号',
  PRODUCT_RELEVANCE_INSUFFICIENT: '与当前产品方向的相关性不足',
  OPPORTUNITY_SCORE_INSUFFICIENT: '综合评分不足，保留为研究信息',
  USER_GOAL_BUYER: '本次搜索目标是寻找客户',
  USER_GOAL_SUPPLIER: '本次搜索目标是寻找供应商',
  USER_GOAL_PARTNER: '本次搜索目标是寻找合作伙伴',
  USER_GOAL_DISTRIBUTOR: '本次搜索目标是寻找分销渠道',
  USER_GOAL_COMPETITOR: '本次搜索目标是研究竞争对手',
  USER_GOAL_MARKET_EXPLORATION: '本次搜索目标是探索市场',
  USER_GOAL_UNKNOWN: '本次搜索目标仍待确认',
  USER_INTENT_MATCH: '企业角色与本次搜索目标匹配',
  USER_INTENT_MISMATCH: '企业角色与本次搜索目标不完全匹配',
  USER_INTENT_NEEDS_REVIEW: '搜索目标匹配关系需要进一步判断',
  EVIDENCE_STATUS_VALID: '来源信息已通过当前证据检查',
  EVIDENCE_STATUS_REJECTED: '来源信息未通过当前证据检查',
  IDENTITY_STATUS_VERIFIED: '企业主体已通过当前身份检查',
  TITLE_ONLY_EVENT_BLOCKED: '事件只出现在标题，正文尚未支持',
  MARKET_SIGNAL_RETAINED: '保留为可继续观察的市场信息',
  ENTITY_VERIFICATION_REQUIRED: '企业主体需要确认',
  ROLE_VERIFICATION_REQUIRED: '企业角色需要确认',
}

export function reasonCodeLabel(code: string): string {
  return REASON_LABELS[code] ?? `其他判断依据（${code}）`
}

export function sourceHostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return '来源地址待确认'
  }
}
