/**
 * 全局类型定义
 * 所有领域模型与 API 契约集中在此，便于后续替换模拟数据为真实接口。
 */

/** 社交平台枚举 */
export type Platform =
  | 'Website'
  | 'Reddit'
  | 'X'
  | 'Instagram'
  | 'Facebook'
  | 'TikTok'
  | 'LinkedIn'
  | 'Xiaohongshu'
  | 'YouTube'

/** 地区 */
export type Region = 'USA' | 'Europe' | 'SoutheastAsia' | 'China' | 'MiddleEast'

/** 客户类型 */
export type CustomerType = 'Buyer' | 'Agent' | 'Company' | 'Individual'
export type LeadType = 'company' | 'person' | 'content' | 'community'

/** 购买意向等级 */
export type IntentLevel = 'high' | 'medium' | 'low'

/** 行业 */
export type Industry =
  | 'IndustrialManufacturing'
  | 'ConsumerElectronics'
  | 'MedicalHealth'
  | 'SaaSSoftware'
  | 'TradeExport'
  | 'BeautyIndustry'

/**
 * CRM 跟进状态
 * - new:        刚发现，尚未联系
 * - contacted:  已首次联系（邮件 / 消息已发送）
 * - engaging:   正在沟通中（有来回回复）
 * - won:        已成交
 * - lost:       已流失 / 放弃
 */
export type FollowUpStatus = 'new' | 'contacted' | 'engaging' | 'won' | 'lost'

/** 推荐行动（AI 建议） */
export type RecommendedAction = 'contact_now' | 'follow_up' | 'monitor' | 'nurture'

/** AI 分析结果 */
export interface CustomerAnalysis {
  /** 潜在客户类型标签，例如「采购需求」 */
  intentType: string
  /** 购买意向评分 0-100 */
  intentScore: number
  /** 兴趣标签 */
  tags: string[]
  /** AI 建议 */
  suggestion: string
  /** 客户背景 */
  background: string
  /** 核心需求 */
  need: string
  /** 购买概率 */
  purchaseProbability: IntentLevel
  /** 推荐销售策略 */
  salesStrategy: string
  /** AI 判断原因（为什么给这个评分） */
  reasoning?: string
  /** 需求关键词（从原始内容中抽取） */
  needKeywords?: string[]
}

export interface LeadResearch {
  id?: string
  leadId?: string
  companySummary: string
  industry: string
  companyType: string
  customerPersona: string
  painPoints: string[]
  buyingSignals: string[]
  communicationStyle: string
  recommendedApproach: string
  confidenceScore: number
  leadQuality: 'high' | 'medium' | 'low'
  leadCategory: 'buyer' | 'company' | 'person' | 'content' | 'community'
  salesRecommendation: 'contact_now' | 'nurture' | 'ignore'
  qualityReason: string
  companyProfile: {
    companyType: string
    industry: string
    businessModel: string
    estimatedRole: string
    location: string
    evidence: string[]
  }
  buyingSignalDetails: Array<{
    signal: string
    evidence: string
    confidence: number
  }>
  salesAngle: {
    recommendedApproach: string
    painPoint: string
    valueProposition: string
    firstMessageHook: string
  }
  outreachPlan: {
    emailSubject: string
    openingLine: string
    body: string
    cta: string
    linkedinMessage: string
    whatsappMessage: string
    followUpCadence: string[]
  }
  priority: 'A' | 'B' | 'C'
  intelligenceVersion: number
  productProfileId?: string | null
  matchScore?: number | null
  purchaseLikelihood?: string | null
  industryFit?: string | null
  businessFit?: string | null
  recommendedAngle?: string | null
  contactReason?: string | null
  riskFactors?: string[]
  evidence?: string[]
  provider?: string | null
  model?: string | null
  generatedAt?: string | null
}

export type LeadResearchFeedbackType =
  | 'accurate'
  | 'inaccurate'
  | 'useful'
  | 'not_useful'

export interface LeadResearchFeedback {
  id: string
  leadResearchId: string
  userId: string
  rating: number
  feedbackType: LeadResearchFeedbackType
  comment?: string | null
  createdAt: string
  updatedAt: string
}

export type LeadOutcomeStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'WON'
  | 'LOST'

export interface LeadOutcome {
  id: string
  leadId: string
  userId: string
  status: LeadOutcomeStatus
  note?: string | null
  createdAt: string
  updatedAt: string
}

/** 客户线索（搜索结果卡片） */
export type ContactRole =
  | 'decision_maker'
  | 'influencer'
  | 'technical_contact'
  | 'unknown'

export interface ContactProfile {
  id: string
  leadId: string
  name: string
  jobTitle: string
  company: string
  source: string
  profileUrl: string
  email: string
  phone: string
  contactRole: ContactRole
  confidence: number
  evidence: string[]
  contactScore: number | null
  priorityRank: number | null
  recommendationReason: string | null
  createdAt: string
  updatedAt: string
}

export type ChannelType =
  | 'distributor'
  | 'reseller'
  | 'system_integrator'
  | 'trading_company'
  | 'partner'
  | 'unknown'

export interface ChannelProfile {
  id: string
  leadId: string
  channelType: ChannelType
  companyName: string
  industry: string
  region: string
  website: string
  evidence: string[]
  channelScore: number
  confidence: number
  recommendationReason: string
  cooperationStrategy: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  /** 用户名 */
  username: string
  /** 展示名 */
  displayName: string
  /** 头像 URL（可为空，使用占位） */
  avatarUrl?: string
  /** 头像首字母 fallback */
  initials: string
  platform: Platform
  /** 客户类型 */
  customerType: CustomerType
  leadType?: LeadType
  /** 原始帖子内容 */
  postContent: string
  /** 帖子发布时间（相对描述） */
  postedAt: string
  /** 国家 / 地区展示名 */
  country: string
  region: Region
  industry: Industry
  /** 职位 / 头衔（如 Procurement Manager） */
  jobTitle?: string
  /** 公司名 */
  company?: string
  analysis: CustomerAnalysis
  /** AI 推荐行动 */
  recommendedAction?: RecommendedAction
  /** 来源链接 */
  sourceUrl: string
  /** 主页链接 */
  profileUrl: string
}

/** 筛选条件 */
export interface SearchStrategy {
  intent: {
    industry: string
    product: string
    category: string
    region: string
    country: string
    relationship: string
    language: string
    customerType: string
    businessProblem: string
    buyingSignals: string[]
  }
  keywords: Array<{
    language: string
    query: string
  }>
  languages: string[]
  targetType: 'buyer' | 'channel' | 'both'
  salesIntent: SalesIntent
  searchDirections: string[]
  reason: string
}

export type SalesIntent = 'customer' | 'channel' | 'partnership'

export interface ProductUnderstandingResult {
  provider: string
  productUnderstanding: {
    productName: string
    category: string
    industry: string
    applications: string[]
    keywords: string[]
    relatedProducts: string[]
  }
  buyerPersona: Array<{
    customerType: string
    industry: string
    companyType: string
    reason: string
    painPoints: string[]
  }>
  recommendedRoles: Array<{
    role: string
    department: string
    reason: string
  }>
  searchStrategy: {
    buyerKeywords: string[]
    channelKeywords: string[]
    countries: string[]
    languages: string[]
    recommendedPlatforms: string[]
  }
  salesPreparation: {
    buyingSignals: string[]
    customerPainPoints: string[]
    recommendedValueAngle: string
  }
}

export interface ProductProfile {
  id: string
  userId: string
  productName: string
  category: string
  industry: string
  applications: string[]
  keywords: string[]
  relatedProducts: string[]
  buyerPersona: ProductUnderstandingResult['buyerPersona']
  decisionMakerRoles: ProductUnderstandingResult['recommendedRoles']
  buyerKeywords: string[]
  channelKeywords: string[]
  targetCountries: string[]
  targetLanguages: string[]
  recommendedPlatforms: string[]
  buyingSignals: string[]
  painPoints: string[]
  valueAngles: string[]
  createdAt: string
  updatedAt: string
}

export interface SearchFilters {
  query: string
  platforms: Platform[]
  regions: Region[]
  customerTypes: CustomerType[]
  intentLevels: IntentLevel[]
  /** 按跟进状态筛选（CRM） */
  followUpStatuses?: FollowUpStatus[]
  /** 仅看收藏 */
  favoritesOnly?: boolean
}

/** Phase 1.1 contract reserved for the future ProductContextSnapshot. */
export interface SearchProductContextDraft {
  product?: string
  category?: string
  industry?: string
  region?: string
  country?: string
  customerType?: string
  businessProblem?: string
  applications?: string[]
  buyingSignals?: string[]
  buyerKeywords?: string[]
  channelKeywords?: string[]
}

export interface ProductContextSnapshot {
  version: string
  capturedAt: string
  source: 'inferred' | 'request' | 'product_profile' | 'combined'
  productProfile: {
    id: string
    productName: string
    updatedAt: string
  } | null
  context: SearchProductContextDraft
}

export interface SearchIntentSnapshot {
  version: string
  capturedAt: string
  salesIntent: SalesIntent
  targetType: SearchStrategy['targetType']
  relationship: string
  reason: string
  keywords: SearchStrategy['keywords']
  languages: string[]
  searchDirections: string[]
}

export interface SearchPreparation {
  strategy: SearchStrategy
  productContext: ProductContextSnapshot
  searchIntent: SearchIntentSnapshot
}

export type OpportunityType =
  | 'COMPANY_EXPANSION'
  | 'INVESTMENT'
  | 'DIGITAL_UPGRADE'

export type CompanyResearchStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'READY'
  | 'NEEDS_REVIEW'
  | 'FAILED'

export type OpportunityProductContext =
  | SearchProductContextDraft
  | ProductContextSnapshot

export interface SalesOpportunity {
  id: string
  type: OpportunityType
  companyName: string | null
  title: string
  summary: string
  whyItMatters: string
  recommendedNextStep: string
  confidence: number
  productContextSnapshot: OpportunityProductContext
  detectionVersion: string
  createdAt: string
  evidence: Array<{
    id: string
    excerpt: string
    isPrimary: boolean
    confidence: number
    searchEvidence: {
      id: string
      rawUrl: string
      title: string | null
      provider: string
      platform: Platform
      createdAt?: string
    }
    createdAt?: string
  }>
}

export interface OpportunityCompanyProfileSummary {
  id: string
  companyName: string
  normalizedDomain: string | null
  officialWebsite: string | null
  country: string | null
  region: string | null
  industry: string | null
  companyType: string
  identityStatus: string
  identityConfidence: number
  analysisStatus: Exclude<CompanyResearchStatus, 'NOT_STARTED'>
  analysisVersion: string
  currentVersion: number
  updatedAt: string
  relationshipType: string
  currentSnapshot: {
    id: string
    analysisStatus: Exclude<CompanyResearchStatus, 'NOT_STARTED'>
    confidence: number
    analysisVersion: string
    createdAt: string
  } | null
}

export interface OpportunityDetail extends SalesOpportunity {
  searchTaskId: string
  updatedAt: string
  companyResearchStatus: CompanyResearchStatus
  companies: OpportunityCompanyProfileSummary[]
}

export interface OpportunityCompanyIntelligenceResult {
  companyProfile: {
    id: string
    companyName: string
    normalizedDomain: string | null
    officialWebsite: string | null
    country: string | null
    region: string | null
    industry: string | null
    companyType: string
    identityStatus: string
    identityConfidence: number
    description: string | null
    products: string[]
    industries: string[]
    businessModel: string | null
    analysisStatus: Exclude<CompanyResearchStatus, 'NOT_STARTED'>
    analysisVersion: string
    currentVersion: number
    updatedAt: string
  }
  snapshot: {
    id: string
    status: Exclude<CompanyResearchStatus, 'NOT_STARTED'>
    confidence: number
    analysisVersion: string
    provider: string | null
    createdAt: string
    created: boolean
  }
  sources: Array<{
    id: string
    searchEvidenceId: string | null
    url: string
    title: string
    sourceType: string
    excerpt: string | null
    capturedAt: string
    confidence: number
    createdAt: string
  }>
  researchResult: {
    identity: Record<string, unknown>
    understanding: Record<string, unknown>
    relevance: Record<string, unknown>
    researchHints: Record<string, unknown>
  }
}

export interface CompanyResearchWorkspace {
  opportunity: {
    id: string
    searchTaskId: string
    type: OpportunityType
    companyName: string | null
    title: string
    summary: string
    whyItMatters: string
    recommendedNextStep: string
    confidence: number
    detectionVersion: string
    createdAt: string
    updatedAt: string
  }
  productContextSnapshot: OpportunityProductContext
  searchEvidence: Array<{
    id: string
    excerpt: string
    isPrimary: boolean
    confidence: number
    createdAt: string
    searchEvidence: {
      id: string
      provider: string
      platform: Platform
      sourceUrl: string
      title: string | null
      extractionStatus: string
      identityStatus: string
      evidenceStatus: string
      createdAt: string
    }
  }>
  companyProfile: {
    id: string
    companyName: string
    normalizedDomain: string | null
    officialWebsite: string | null
    country: string | null
    region: string | null
    industry: string | null
    companyType: string
    identityStatus: string
    identityConfidence: number
    description: string | null
    products: string[]
    industries: string[]
    businessModel: string | null
    analysisStatus: Exclude<CompanyResearchStatus, 'NOT_STARTED'>
    analysisVersion: string
    currentVersion: number
    updatedAt: string
    relationshipType: string
  } | null
  companySources: Array<{
    id: string
    searchEvidenceId: string | null
    url: string
    title: string
    sourceType: string
    excerpt: string | null
    capturedAt: string
    confidence: number
    createdAt: string
  }>
  research: {
    status: CompanyResearchStatus
    currentSnapshot: {
      id: string
      analysisStatus: Exclude<CompanyResearchStatus, 'NOT_STARTED'>
      confidence: number
      analysisVersion: string
      identitySnapshot: Record<string, unknown>
      understandingSnapshot: Record<string, unknown>
      relevanceAssessment: Record<string, unknown>
      researchHints: Record<string, unknown>
      createdAt: string
    } | null
    lastUpdatedAt: string | null
  }
  permissions: {
    canResearch: boolean
    canRefresh: boolean
    reason: 'NO_LINKED_EVIDENCE' | 'NO_ELIGIBLE_SOURCE' | null
    eligibleSearchEvidenceId: string | null
  }
}

export type MarketSignalType =
  | 'FACTORY_EXPANSION'
  | 'INVESTMENT'
  | 'DIGITAL_TRANSFORMATION'
  | 'HIRING_SIGNAL'
  | 'POLICY_CHANGE'
  | 'INDUSTRY_TREND'

export interface MarketSignal {
  id: string
  sourceType: string
  sourceUrl: string
  title: string
  summary: string
  content: string | null
  companyName: string | null
  country: string | null
  region: string | null
  signalType: MarketSignalType
  confidence: number
  detectedAt: string
  createdAt: string
  updatedAt: string
}

export interface SearchExecutionResult {
  taskId: string
  status: 'success' | 'empty'
  customers: Customer[]
  opportunities: SalesOpportunity[]
  strategy: SearchStrategy | null
  productContext: ProductContextSnapshot | null
  searchIntent: SearchIntentSnapshot | null
}

/** Dashboard 统计卡片 */
export interface StatCard {
  label: string
  value: string | number
  /** 趋势百分比，可正可负 */
  trend?: number
  icon: 'discovery' | 'intent' | 'industry' | 'region' | 'platform'
}

/** 图表数据点 */
export interface ChartPoint {
  name: string
  value: number
}

/** AI 助手消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** 关联客户 ID（可选） */
  customerId?: string
  createdAt: string
}

/** 历史客户会话（AI 助手左侧） */
export interface ChatSession {
  id: string
  customerName: string
  initials: string
  platform: Platform
  lastMessage: string
  updatedAt: string
}

/** 平台元数据（颜色 / 图标 key） */
export interface PlatformMeta {
  name: Platform
  label: string
  /** 主题色 hex */
  color: string
}

/** 行业元数据 */
export interface IndustryMeta {
  key: Industry
  label: string
}

/** 客户类型元数据 */
export interface CustomerTypeMeta {
  key: CustomerType
  label: string
  /** 描述 */
  desc: string
}

/** 跟进状态元数据 */
export interface FollowUpStatusMeta {
  key: FollowUpStatus
  label: string
  /** Tailwind 颜色类 */
  color: string
  /** 圆点颜色类 */
  dotClass: string
}

/** 推荐行动元数据 */
export interface RecommendedActionMeta {
  key: RecommendedAction
  label: string
  /** 简短描述 */
  desc: string
  /** Tailwind 颜色 */
  color: string
}

/** CRM 记录（跟进状态 / 收藏 / 自定义标签 / 备注） */
export interface CrmRecord {
  customerId: string
  followUpStatus: FollowUpStatus
  isFavorited: boolean
  /** 用户自定义标签 */
  customTags: string[]
  /** 备注 */
  note?: string
  /** 最后联系时间 ISO */
  lastContactedAt?: string
  /** 更新时间 ISO */
  updatedAt: string
}

/** 触达渠道 */
export type OutreachChannel = 'email' | 'whatsapp' | 'linkedin' | 'call'

/** 跟进计划步骤 */
export interface FollowUpStep {
  day: number
  channel: OutreachChannel
  action: string
  template?: string
}

/** 平台元数据映射 */
export type PlatformMetaMap = Record<Platform, PlatformMeta>
export type IndustryMetaMap = Record<Industry, IndustryMeta>
export type CustomerTypeMetaMap = Record<CustomerType, CustomerTypeMeta>
export type FollowUpStatusMetaMap = Record<FollowUpStatus, FollowUpStatusMeta>
export type RecommendedActionMetaMap = Record<RecommendedAction, RecommendedActionMeta>
