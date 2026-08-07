/**
 * API 服务层
 *
 * 设计目的：
 * Lead、SearchTask 与 AI Analysis 已接入真实后端 API。
 * Dashboard、聊天历史和 CRM 写操作暂时保留本地实现。
 *
 * 数据契约分组：
 *   - 客户搜索与详情      (searchCustomers / getCustomerById)
 *   - Dashboard 统计      (getDashboardStats / ...)
 *   - AI 助手对话         (getChatSessions / getChatMessages / sendChatMessage)
 *   - AI 销售话术生成     (generateOutreach / generateFollowUpPlan)
 *   - CRM 跟进管理        (getCrmRecord / toggleFavorite / setFollowUpStatus / ...)
 */

import type {
  Customer,
  SearchFilters,
  StatCard,
  ChartPoint,
  ChatSession,
  ChatMessage,
  CrmRecord,
  FollowUpStatus,
  FollowUpStep,
  OutreachChannel,
  Platform,
  Region,
  CustomerType,
  IntentLevel,
  CustomerAnalysis,
  RecommendedAction,
  Industry,
  LeadType,
  LeadResearch,
  LeadResearchFeedback,
  LeadResearchFeedbackType,
  LeadOutcome,
  LeadOutcomeStatus,
  ContactProfile,
  ChannelProfile,
  SearchStrategy,
  ProductUnderstandingResult,
  ProductProfile,
  SearchExecutionResult,
  SearchPreparation,
  SearchProductContextDraft,
  ProductContextSnapshot,
  SearchIntentSnapshot,
  SalesOpportunity,
  OpportunityDetail,
  OpportunityCompanyIntelligenceResult,
  CompanyResearchWorkspace,
  ResearchTrace,
  ResearchTraceDetails,
  MarketSignal,
  MarketResearchSession,
  OutreachGeneration,
  RuntimeCapabilities,
  RadarAssessment,
  SalesAgentHistoryMessage,
  SalesAgentRunResult,
} from '@/types'
import {
  DASHBOARD_STATS,
  DISCOVERY_TREND,
  INDUSTRY_DISTRIBUTION,
  PLATFORM_DISTRIBUTION,
} from '@/data/dashboard'
import { delay, scoreToLevel } from '@/lib/utils'
import * as crmStore from '@/lib/crmStore'

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
const SEARCH_TASK_POLL_INTERVAL_MS = 500
const SEARCH_TASK_MAX_POLL_ATTEMPTS = 240

function normalizeApiBaseUrl(value: string | undefined): string {
  const configuredBaseUrl = value?.trim() || '/api'

  if (configuredBaseUrl === '/') {
    return ''
  }

  return configuredBaseUrl.replace(/\/+$/, '')
}

interface ApiEnvelope<T> {
  data: T
  meta?: { total: number }
}

interface BackendAnalysis {
  id: string
  intentType: string | null
  intentScore: number | null
  tags: string[]
  suggestion: string | null
  background: string | null
  need: string | null
  purchaseProbability: IntentLevel | null
  salesStrategy: string | null
  reasoning: string | null
  needKeywords: string[]
  recommendedScript: string | null
  contactAdvice: string | null
}

interface BackendLead {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  initials: string
  platform: Platform
  customerType: CustomerType
  postContent: string
  postedAt: string | null
  country: string
  region: Region
  industry: Industry
  jobTitle: string | null
  company: string | null
  sourceUrl: string
  profileUrl: string
  interestTags: string[]
  intentScore: number
  recommendedAction: RecommendedAction | null
  updatedAt: string
  sourceMetadata: Record<string, unknown> | null
  identityStatus?: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  evidenceStatus?: 'UNKNOWN' | 'VALID' | 'INVALID'
  analysis: BackendAnalysis | null
  contacts?: ContactProfile[]
  communicationProfile?: ChatSession['communicationProfile']
  audienceType?: ChatSession['audienceType']
  contactReadiness?: ChatSession['contactReadiness']
  assistantScores?: ChatSession['assistantScores']
}

interface BackendSearchTask {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  resultCount: number
  errorCode: string | null
  errorMessage: string | null
}

interface CreateSearchTaskResponse {
  data: BackendSearchTask
  strategy: SearchStrategy
  productContext: ProductContextSnapshot
  searchIntent: SearchIntentSnapshot
}

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
    provider?: string
    providerState?: string
    retryable?: boolean
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiRequestError(
      body.error?.message || `API request failed (${response.status})`,
      response.status,
      body.error?.code,
    )
  }

  return response.json() as Promise<T>
}

function formatRelativeTime(value: string | null): string {
  if (!value) return '刚刚'
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return value

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}

function fallbackAnalysis(lead: BackendLead): CustomerAnalysis {
  return {
    intentType: '潜在采购需求',
    intentScore: lead.intentScore,
    tags: lead.interestTags,
    suggestion: '建议进一步分析客户需求并确认采购时间。',
    background: `${lead.displayName}${lead.company ? ` 来自 ${lead.company}` : ''}，位于 ${lead.country}。`,
    need: lead.postContent,
    purchaseProbability: scoreToLevel(lead.intentScore),
    salesStrategy: '先确认需求、预算和交付周期，再提供针对性案例与报价。',
    reasoning: '当前展示搜索阶段的初始意向评分，尚未完成 AI 深度分析。',
    needKeywords: lead.interestTags,
  }
}

function toCustomerAnalysis(
  lead: BackendLead,
  analysis: BackendAnalysis | null,
): CustomerAnalysis {
  if (!analysis) return fallbackAnalysis(lead)

  return {
    intentType: analysis.intentType ?? '采购需求',
    intentScore: analysis.intentScore ?? lead.intentScore,
    tags: analysis.tags.length > 0 ? analysis.tags : lead.interestTags,
    suggestion: analysis.suggestion ?? '建议进一步联系客户。',
    background:
      analysis.background ??
      `${lead.displayName}${lead.company ? ` 来自 ${lead.company}` : ''}。`,
    need: analysis.need ?? lead.postContent,
    purchaseProbability:
      analysis.purchaseProbability ??
      scoreToLevel(analysis.intentScore ?? lead.intentScore),
    salesStrategy:
      analysis.salesStrategy ??
      '先确认需求，再提供针对性案例与报价。',
    reasoning: analysis.reasoning ?? undefined,
    needKeywords:
      analysis.needKeywords.length > 0
        ? analysis.needKeywords
        : lead.interestTags,
  }
}

function toCustomer(lead: BackendLead): Customer {
  const metadataLeadType = lead.sourceMetadata?.leadType
  const leadType: LeadType =
    metadataLeadType === 'company' ||
    metadataLeadType === 'person' ||
    metadataLeadType === 'content' ||
    metadataLeadType === 'community'
      ? metadataLeadType
      : lead.platform === 'Reddit' || lead.platform === 'Facebook'
        ? 'community'
      : lead.platform === 'YouTube'
          ? 'content'
          : lead.customerType === 'Company'
            ? 'company'
            : 'person'

  const channelHint = [
    lead.sourceMetadata?.channelType,
    lead.sourceMetadata?.leadCategory,
    lead.sourceMetadata?.relationship,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
  const audienceType: Customer['audienceType'] =
    lead.customerType === 'Individual' || leadType === 'person'
      ? 'person'
      : /supplier|vendor|manufacturer|factory/.test(channelHint)
        ? 'supplier'
        : lead.customerType === 'Agent' ||
            /agent|broker|intermediar|distributor|partner|reseller/.test(
              channelHint,
            )
          ? 'intermediary'
          : 'company'
  const identityScore =
    lead.identityStatus === 'VERIFIED'
      ? 100
      : lead.identityStatus === 'REJECTED'
        ? 20
        : 55
  const evidenceScore =
    lead.evidenceStatus === 'VALID'
      ? 100
      : lead.evidenceStatus === 'INVALID'
        ? 20
        : 55
  const intentScore = lead.analysis?.intentScore ?? lead.intentScore

  return {
    id: lead.id,
    username: lead.username,
    displayName: lead.displayName,
    avatarUrl: lead.avatarUrl ?? undefined,
    initials: lead.initials,
    platform: lead.platform,
    customerType: lead.customerType,
    leadType,
    audienceType,
    signalScores: {
      overall: Math.round(
        Math.max(0, Math.min(100, intentScore)) * 0.6 +
          identityScore * 0.2 +
          evidenceScore * 0.2,
      ),
      intent: Math.max(0, Math.min(100, Math.round(intentScore))),
      identity: identityScore,
      evidence: evidenceScore,
    },
    postContent: lead.postContent,
    postedAt: formatRelativeTime(lead.postedAt),
    country: lead.country,
    region: lead.region,
    industry: lead.industry,
    jobTitle: lead.jobTitle ?? undefined,
    company: lead.company ?? undefined,
    analysis: toCustomerAnalysis(lead, lead.analysis),
    recommendedAction: lead.recommendedAction ?? undefined,
    sourceUrl: lead.sourceUrl,
    profileUrl: lead.profileUrl,
    contacts: lead.contacts ?? [],
  }
}

async function createSearchTaskAndWait(
  filters: SearchFilters,
  productContext?: SearchProductContextDraft,
  productProfileId?: string,
  onPrepared?: (preparation: SearchPreparation) => void,
): Promise<{
  task: BackendSearchTask
  preparation: SearchPreparation
}> {
  const created = await request<CreateSearchTaskResponse>('/search-task', {
    method: 'POST',
    body: JSON.stringify({
      keyword: filters.query.trim(),
      platforms: filters.platforms,
      regions: filters.regions,
      productContext,
      productProfileId: productProfileId || undefined,
      includePublicContacts: filters.includePublicContacts === true,
      maxResults: filters.maxResults,
    }),
  })
  const preparation = {
    strategy: created.strategy,
    productContext: created.productContext,
    searchIntent: created.searchIntent,
  }
  onPrepared?.(preparation)

  for (
    let attempt = 0;
    attempt < SEARCH_TASK_MAX_POLL_ATTEMPTS;
    attempt += 1
  ) {
    const result = await request<ApiEnvelope<BackendSearchTask>>(
      `/search-task/${created.data.id}`,
      { cache: 'no-store' },
    )

    if (result.data.status === 'COMPLETED') {
      return { task: result.data, preparation }
    }

    if (
      result.data.status === 'FAILED' ||
      result.data.status === 'CANCELLED'
    ) {
      throw new ApiRequestError(
        result.data.errorMessage || '搜索任务执行失败',
        result.data.errorCode === 'RATE_LIMIT' ? 429 : 503,
        result.data.errorCode || undefined,
      )
    }

    await delay(SEARCH_TASK_POLL_INTERVAL_MS)
  }

  throw new Error('搜索任务等待超时')
}

export async function analyzeSearchIntent(
  query: string,
): Promise<SearchStrategy> {
  const response = await request<ApiEnvelope<SearchStrategy>>(
    '/search/intent',
    {
      method: 'POST',
      body: JSON.stringify({ query }),
    },
  )
  return response.data
}

export async function understandProduct(
  query: string,
): Promise<ProductUnderstandingResult> {
  const response = await request<ApiEnvelope<ProductUnderstandingResult>>(
    '/product/understanding',
    {
      method: 'POST',
      body: JSON.stringify({ query }),
    },
  )
  return response.data
}

export async function createProductProfile(
  query: string,
): Promise<ProductProfile> {
  const response = await request<ApiEnvelope<ProductProfile>>('/products', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  return response.data
}

export async function getProductProfiles(): Promise<ProductProfile[]> {
  const response = await request<ApiEnvelope<ProductProfile[]>>('/products')
  return response.data
}

export async function getProductProfile(id: string): Promise<ProductProfile> {
  const response = await request<ApiEnvelope<ProductProfile>>(`/products/${id}`)
  return response.data
}

export async function updateProductProfile(
  id: string,
  data: Partial<ProductProfile>,
): Promise<ProductProfile> {
  const response = await request<ApiEnvelope<ProductProfile>>(
    `/products/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  )
  return response.data
}

export async function analyzeProductProfile(
  id: string,
): Promise<ProductProfile> {
  const response = await request<ApiEnvelope<ProductProfile>>(
    `/products/${id}/analyze`,
    { method: 'POST' },
  )
  return response.data
}

/* ============================================================
 *  客户搜索
 * ============================================================ */

/**
 * A current search is created as a SearchTask and reads only that task's
 * owned results. Historical Leads remain a separate backend collection.
 */
export async function searchCustomers(
  filters: SearchFilters,
  productContext?: SearchProductContextDraft,
  productProfileId?: string,
  onPrepared?: (preparation: SearchPreparation) => void,
): Promise<SearchExecutionResult> {
  const keyword = filters.query.trim()

  if (!keyword) {
    return {
      taskId: '',
      status: 'empty',
      customers: [],
      opportunities: [],
      radarAssessments: [],
      strategy: null,
      productContext: null,
      searchIntent: null,
    }
  }

  const { task, preparation } = await createSearchTaskAndWait(
    filters,
    productContext,
    productProfileId,
    onPrepared,
  )
  const [leadResponse, opportunityResponse, radarResponse] = await Promise.all([
    request<ApiEnvelope<BackendLead[]>>(
      `/search-task/${task.id}/results`,
      { cache: 'no-store' },
    ),
    request<ApiEnvelope<SalesOpportunity[]>>(
      `/search-task/${task.id}/opportunities`,
      { cache: 'no-store' },
    ),
    request<ApiEnvelope<RadarAssessment[]>>(
      `/radar/assessments?searchTaskId=${encodeURIComponent(task.id)}&includeBlocked=true`,
      { cache: 'no-store' },
    ),
  ])
  let results = leadResponse.data.map(toCustomer)

  if (filters.platforms.length > 0) {
    results = results.filter((c) => filters.platforms.includes(c.platform))
  }

  if (filters.regions.length > 0) {
    results = results.filter((c) => filters.regions.includes(c.region))
  }

  if (filters.customerTypes.length > 0) {
    results = results.filter((c) => filters.customerTypes.includes(c.customerType))
  }

  if (filters.intentLevels.length > 0) {
    results = results.filter((c) => filters.intentLevels.includes(scoreToLevel(c.analysis.intentScore)))
  }

  // CRM 过滤：收藏
  if (filters.favoritesOnly) {
    const favIds = new Set(crmStore.getAllCrmRecords().filter((r) => r.isFavorited).map((r) => r.customerId))
    results = results.filter((c) => favIds.has(c.id))
  }

  // CRM 过滤：跟进状态
  if (filters.followUpStatuses && filters.followUpStatuses.length > 0) {
    const statusMap = new Map(crmStore.getAllCrmRecords().map((r) => [r.customerId, r.followUpStatus]))
    results = results.filter((c) => {
      const status = statusMap.get(c.id) ?? 'new'
      return filters.followUpStatuses!.includes(status)
    })
  }

  // 按意向评分降序
  results.sort((a, b) => b.analysis.intentScore - a.analysis.intentScore)

  return {
    taskId: task.id,
    status:
      results.length > 0 ||
      opportunityResponse.data.length > 0 ||
      radarResponse.data.length > 0
        ? 'success'
        : 'empty',
    customers: results,
    opportunities: opportunityResponse.data,
    radarAssessments: radarResponse.data,
    strategy: preparation.strategy,
    productContext: preparation.productContext,
    searchIntent: preparation.searchIntent,
  }
}

export async function getOpportunityById(
  id: string,
): Promise<OpportunityDetail> {
  const response = await request<ApiEnvelope<OpportunityDetail>>(
    `/opportunities/${encodeURIComponent(id)}`,
  )
  return response.data
}

export async function researchOpportunityCompany(
  opportunityId: string,
  searchEvidenceId: string,
): Promise<OpportunityCompanyIntelligenceResult> {
  const response =
    await request<ApiEnvelope<OpportunityCompanyIntelligenceResult>>(
      `/opportunities/${encodeURIComponent(opportunityId)}/company-intelligence`,
      {
        method: 'POST',
        body: JSON.stringify({ searchEvidenceId }),
      },
    )
  return response.data
}

export async function getCompanyResearchWorkspace(
  opportunityId: string,
): Promise<CompanyResearchWorkspace> {
  const response = await request<ApiEnvelope<CompanyResearchWorkspace>>(
    `/opportunities/${encodeURIComponent(opportunityId)}/company-intelligence/workspace`,
  )
  return response.data
}

export async function getResearchTrace(
  opportunityId: string,
): Promise<ResearchTrace> {
  const response = await request<ApiEnvelope<ResearchTrace>>(
    `/opportunities/${encodeURIComponent(opportunityId)}/research-trace`,
  )
  return response.data
}

export async function getResearchTraceDetails(
  opportunityId: string,
): Promise<ResearchTraceDetails> {
  const response = await request<ApiEnvelope<ResearchTraceDetails>>(
    `/opportunities/${encodeURIComponent(opportunityId)}/research-trace/details`,
  )
  return response.data
}

export async function getMarketSignals(): Promise<MarketSignal[]> {
  const response =
    await request<ApiEnvelope<MarketSignal[]>>('/market-signals')
  return response.data
}

export async function runMarketResearch(input: {
  product: string
  industry?: string
  region?: string
  customerType?: string
  signalFocus?: string
}): Promise<MarketResearchSession> {
  const response = await request<ApiEnvelope<MarketResearchSession>>(
    '/market-signals/scan',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

export async function getRuntimeCapabilities(): Promise<RuntimeCapabilities> {
  const response = await request<ApiEnvelope<RuntimeCapabilities>>(
    '/health/capabilities',
    { cache: 'no-store' },
  )
  return response.data
}

/**
 * 获取真实 Lead 详情并转换成前端 Customer。
 */
export async function getCustomerById(id: string): Promise<Customer | undefined> {
  try {
    const response = await request<ApiEnvelope<BackendLead>>(`/leads/${id}`)
    return toCustomer(response.data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Lead not found') {
      return undefined
    }
    throw error
  }
}

export async function analyzeCustomer(id: string): Promise<BackendAnalysis> {
  const response = await request<ApiEnvelope<BackendAnalysis>>(
    `/leads/${id}/analyze`,
    { method: 'POST' },
  )
  return response.data
}

export async function getLeadResearch(id: string): Promise<LeadResearch | null> {
  try {
    const response = await request<ApiEnvelope<LeadResearch>>(
      `/leads/${id}/research`,
    )
    return response.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Lead research not found'
    ) {
      return null
    }
    throw error
  }
}

export async function researchLead(
  id: string,
  productProfileId?: string,
): Promise<LeadResearch> {
  const response = await request<ApiEnvelope<LeadResearch>>(
    `/leads/${id}/research`,
    {
      method: 'POST',
      body: JSON.stringify({ productProfileId }),
    },
  )
  return response.data
}

export async function submitLeadResearchFeedback(
  id: string,
  input: {
    rating: number
    feedbackType: LeadResearchFeedbackType
    comment?: string
  },
): Promise<LeadResearchFeedback> {
  const response = await request<ApiEnvelope<LeadResearchFeedback>>(
    `/leads/${id}/research/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

export async function getLeadOutcome(id: string): Promise<LeadOutcome | null> {
  const response = await request<ApiEnvelope<LeadOutcome | null>>(
    `/leads/${id}/outcome`,
  )
  return response.data
}

export async function createLeadOutcome(
  id: string,
  input: { status: LeadOutcomeStatus; note?: string },
): Promise<LeadOutcome> {
  const response = await request<ApiEnvelope<LeadOutcome>>(
    `/leads/${id}/outcome`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

export async function updateLeadOutcome(
  id: string,
  input: { status: LeadOutcomeStatus; note?: string },
): Promise<LeadOutcome> {
  const response = await request<ApiEnvelope<LeadOutcome>>(
    `/leads/${id}/outcome`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

export async function getContacts(id: string): Promise<ContactProfile[]> {
  const response = await request<ApiEnvelope<ContactProfile[]>>(
    `/leads/${id}/contacts`,
  )
  return response.data
}

export async function discoverContacts(id: string): Promise<ContactProfile[]> {
  const response = await request<ApiEnvelope<ContactProfile[]>>(
    `/leads/${id}/contacts`,
    { method: 'POST' },
  )
  return response.data
}

export async function rankContacts(id: string): Promise<ContactProfile[]> {
  const response = await request<ApiEnvelope<ContactProfile[]>>(
    `/leads/${id}/contacts/rank`,
    { method: 'POST' },
  )
  return response.data
}

export async function getRankedContacts(id: string): Promise<ContactProfile[]> {
  const response = await request<ApiEnvelope<ContactProfile[]>>(
    `/leads/${id}/contacts/ranked`,
  )
  return response.data
}

export async function getChannelProfile(
  id: string,
): Promise<ChannelProfile | null> {
  const response = await request<ApiEnvelope<ChannelProfile[]>>(
    `/leads/${id}/channels`,
  )
  return response.data[0] ?? null
}

export async function discoverChannel(id: string): Promise<ChannelProfile> {
  const response = await request<ApiEnvelope<ChannelProfile>>(
    `/leads/${id}/channels`,
    { method: 'POST' },
  )
  return response.data
}

/* ============================================================
 *  Dashboard 统计
 * ============================================================ */

export async function getDashboardStats(): Promise<StatCard[]> {
  await delay(300)
  return DASHBOARD_STATS
}

export async function getDiscoveryTrend(): Promise<ChartPoint[]> {
  await delay(300)
  return DISCOVERY_TREND
}

export async function getIndustryDistribution(): Promise<ChartPoint[]> {
  await delay(300)
  return INDUSTRY_DISTRIBUTION
}

export async function getPlatformDistribution(): Promise<ChartPoint[]> {
  await delay(300)
  return PLATFORM_DISTRIBUTION
}

/* ============================================================
 *  AI 助手：对话
 * ============================================================ */

export async function getChatSessions(): Promise<ChatSession[]> {
  const response = await request<ApiEnvelope<BackendLead[]>>(
    '/assistant/leads',
  )
  return response.data.map((lead) => ({
    id: lead.id,
    customerName: lead.company ?? lead.displayName,
    displayName: lead.displayName,
    company: lead.company,
    avatarUrl: lead.avatarUrl,
    initials: lead.initials,
    platform: lead.platform,
    jobTitle: lead.jobTitle,
    sourceUrl: lead.sourceUrl,
    profileUrl: lead.profileUrl,
    postContent: lead.postContent,
    contacts: lead.contacts ?? [],
    audienceType: lead.audienceType ??
      (lead.customerType === 'Individual' ? 'person' :
        lead.customerType === 'Agent' ? 'intermediary' : 'company'),
    contactReadiness: lead.contactReadiness ??
      ((lead.contacts ?? []).length > 0 ? 'ready' : 'research'),
    assistantScores: lead.assistantScores ?? {
      overall: lead.intentScore,
      intent: lead.intentScore,
      identity: 55,
      evidence: 55,
      contact: 0,
    },
    communicationProfile: lead.communicationProfile ?? {
      language: 'unknown',
      tone: 'conversational',
      preferredPlatform: lead.platform,
      observedTopics: lead.interestTags,
      evidenceExcerpt: lead.postContent.slice(0, 360),
      basis: 'Observed public source content',
    },
    lastMessage:
      lead.analysis?.suggestion ?? '查看证据、匹配原因与销售建议',
    updatedAt: formatRelativeTime(lead.updatedAt),
  }))
}

export async function runSalesAgent(input: {
  message: string
  leadId?: string
  history?: SalesAgentHistoryMessage[]
  model?: string
}): Promise<SalesAgentRunResult> {
  const response = await request<ApiEnvelope<SalesAgentRunResult>>(
    '/assistant/agent',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
  return response.data
}

/**
 * AI Sales Copilot reuses Lead Analysis and requires an explicitly selected,
 * a user-selected real-source Lead.
 */
export async function sendChatMessage(content: string, _sessionId?: string): Promise<ChatMessage> {
  const leadId = _sessionId?.trim()
  if (!leadId) {
    throw new ApiRequestError(
      '请先选择一个已验证的销售机会。',
      400,
      'ASSISTANT_LEAD_REQUIRED',
    )
  }

  const analysis = await analyzeCustomer(leadId)
  const lower = content.toLowerCase()
  const wantsScript =
    /邮件|开发信|email|whatsapp|linkedin|私信|话术/.test(lower)
  const wantsPlan = /计划|跟进|follow/.test(lower)
  const reply = wantsScript
    ? analysis.recommendedScript || analysis.suggestion || DEFAULT_AI_REPLY
    : wantsPlan
      ? [
          analysis.contactAdvice,
          analysis.suggestion,
          analysis.salesStrategy,
        ]
          .filter(Boolean)
          .join('\n\n')
      : [
          analysis.background,
          `购买概率：${analysis.purchaseProbability ?? '待确认'}`,
          `AI 意向评分：${analysis.intentScore ?? 0}/100`,
          analysis.reasoning,
          analysis.suggestion,
        ]
          .filter(Boolean)
          .join('\n\n')

  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: reply,
    createdAt: new Date().toISOString(),
  }
}

const DEFAULT_AI_REPLY =
  '我是你的 AI 销售助手，可以帮你分析客户意向、生成多渠道开发话术、制定跟进计划。试试说「帮我分析这个客户」或「生成一封开发信」。'

/* ============================================================
 *  AI 销售话术生成（多渠道）
 * ============================================================ */

/**
 * 生成开发信 / 消息（支持邮件、WhatsApp、LinkedIn）
 * 复用 AI Analysis 的推荐话术。
 */
export async function generateOutreach(
  customerId: string,
  channel: OutreachChannel = 'email',
  contactId?: string,
  outreachType: 'buyer' | 'channel' = 'buyer',
): Promise<string> {
  const generated = await request<ApiEnvelope<OutreachGeneration>>(
    `/leads/${customerId}/outreach`,
    {
      method: 'POST',
      body: JSON.stringify({ contactId, outreachType }),
    },
  )
  const content = generated.data.content
  if (channel === 'email') {
    return [
      ...content.email.subjectOptions.map(
        (subject, index) => `Subject ${index + 1}: ${subject}`,
      ),
      '',
      content.email.opening,
      '',
      content.email.body,
      '',
      content.email.cta,
    ].join('\n')
  }
  if (channel === 'linkedin') {
    return [
      'Connection message:',
      content.linkedin.connectionMessage,
      '',
      'First message:',
      content.linkedin.firstMessage,
    ].join('\n')
  }
  if (channel === 'whatsapp') return content.whatsapp.message
  return [
    content.callScript.opening,
    '',
    ...content.callScript.questions.map(
      (question, index) => `${index + 1}. ${question}`,
    ),
  ].join('\n')

  /*
  const analysis = await analyzeCustomer(customerId)
  const customer = await getCustomerById(customerId)
  if (!customer) return '未找到该客户信息。'

  const firstName = customer.displayName.split(' ')[0]
  const need = customer.analysis.need
  const platform = customer.platform

  if (channel === 'email' && analysis.recommendedScript) {
    return analysis.recommendedScript
  }

  if (channel === 'email') {
    return [
      `Subject: Helping you with ${need}`,
      '',
      `Hi ${firstName},`,
      '',
      `I noticed your recent post on ${platform} about ${need}. We help businesses like yours move faster with proven solutions and reliable delivery.`,
      '',
      `Would love to share 2 quick case studies and a tailored proposal. Open to a 15-minute call this week?`,
      '',
      'Best regards,',
      '[Your Name]',
      '[Company] · [Website]',
    ].join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `Hi ${firstName}! 👋 I saw your post on ${platform} about ${need}.`,
      '',
      `We've helped similar clients get results fast. Got 2 minutes? I can share a quick case study tailored to your situation.`,
      '',
      'No pressure at all — just wanted to reach out. 🙌',
    ].join('\n')
  }

  // LinkedIn
  return [
    `Hi ${firstName},`,
    '',
    `Really appreciated your perspective on ${need}. Happy to share what's working in 2026 if useful — no pitch, just value first.`,
    '',
    `If it resonates, we could explore how our solutions might fit. Either way, glad to connect. 👋`,
  ].join('\n')
  */
}

export async function generateOutreachBundle(
  customerId: string,
  input: {
    contactId?: string
    outreachType?: 'buyer' | 'channel'
    objective?: string
    language?: 'auto' | 'zh' | 'en'
    tone?: 'mirror' | 'formal' | 'concise' | 'consultative'
  } = {},
): Promise<OutreachGeneration> {
  const response = await request<ApiEnvelope<OutreachGeneration>>(
    `/leads/${customerId}/outreach`,
    {
      method: 'POST',
      body: JSON.stringify({
        contactId: input.contactId,
        outreachType: input.outreachType ?? 'buyer',
        objective: input.objective,
        language: input.language ?? 'auto',
        tone: input.tone ?? 'mirror',
      }),
    },
  )
  return response.data
}

/**
 * 生成跟进计划（多步骤、多渠道）
 * 未来替换为：POST ${API_BASE_URL}/ai/generate-follow-up-plan
 */
export async function generateFollowUpPlan(
  customerId: string,
  contactId?: string,
): Promise<FollowUpStep[]> {
  const generated = await request<ApiEnvelope<OutreachGeneration>>(
    `/leads/${customerId}/outreach`,
    {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    },
  )
  return generated.data.content.email.subjectOptions.length === 0
    ? generated.data.content.callScript.questions.length === 0
      ? [
          {
            day: 30,
            channel: 'linkedin',
            action:
              generated.data.content.observationAdvice ??
              'Monitor for new commercial evidence.',
          },
        ]
      : []
    : generated.data.context.priority === 'A'
      ? [
          { day: 1, channel: 'email', action: '发送证据驱动邮件' },
          { day: 3, channel: 'linkedin', action: '低压力 LinkedIn 跟进' },
          { day: 7, channel: 'email', action: '分享一个相关案例' },
          { day: 14, channel: 'call', action: '确认项目状态与下一步' },
        ]
      : [
          { day: 1, channel: 'linkedin', action: '发送低压力价值介绍' },
          { day: 7, channel: 'email', action: '分享一个相关行业洞察' },
          { day: 21, channel: 'linkedin', action: '重新检查购买信号' },
        ]

  /*
  await analyzeCustomer(customerId)
  const customer = await getCustomerById(customerId)
  if (!customer) return []

  const need = customer.analysis.need
  const level = scoreToLevel(customer.analysis.intentScore)

  if (level === 'high') {
    return [
      { day: 1, channel: 'email', action: `发送首封开发信，直击「${need}」痛点`, template: '开发信模板' },
      { day: 2, channel: 'linkedin', action: 'LinkedIn 添加好友并附简短私信', template: 'LinkedIn 模板' },
      { day: 4, channel: 'whatsapp', action: 'WhatsApp 跟进，发送案例截图', template: 'WhatsApp 模板' },
      { day: 7, channel: 'email', action: '发送第二封邮件：客户案例 + 报价区间' },
      { day: 11, channel: 'call', action: '电话回访，确认意向与下一步' },
    ]
  }

  return [
    { day: 1, channel: 'email', action: `发送首封开发信，介绍「${need}」解决方案` },
    { day: 5, channel: 'linkedin', action: 'LinkedIn 建立连接，分享行业内容' },
    { day: 12, channel: 'email', action: '跟进邮件：免费试用 / 样品邀请' },
    { day: 20, channel: 'whatsapp', action: 'WhatsApp 轻量触达，询问进展' },
  ]
  */
}

/**
 * 一键标记为已联系（同步 CRM 状态）
 * 未来替换为：POST ${API_BASE_URL}/crm/customers/:id/contact
 */
export async function markAsContacted(customerId: string): Promise<void> {
  await delay(200)
  crmStore.setFollowUpStatus(customerId, 'contacted')
}

/* ============================================================
 *  CRM 跟进管理
 *  （当前基于 localStorage，未来替换为后端持久化）
 * ============================================================ */

/** 获取单条 CRM 记录 */
export function getCrmRecord(customerId: string): CrmRecord {
  return crmStore.getCrmRecord(customerId)
}

/** 获取全量 CRM 记录 */
export function getAllCrmRecords(): CrmRecord[] {
  return crmStore.getAllCrmRecords()
}

/** 切换收藏 */
export function toggleFavorite(customerId: string): void {
  crmStore.toggleFavorite(customerId)
}

/** 设置跟进状态 */
export function setFollowUpStatus(customerId: string, status: FollowUpStatus): void {
  crmStore.setFollowUpStatus(customerId, status)
}

/** 添加自定义标签 */
export function addCustomTag(customerId: string, tag: string): void {
  crmStore.addCustomTag(customerId, tag)
}

/** 移除自定义标签 */
export function removeCustomTag(customerId: string, tag: string): void {
  crmStore.removeCustomTag(customerId, tag)
}

/** 更新备注 */
export function setNote(customerId: string, note: string): void {
  crmStore.setNote(customerId, note)
}

/** 订阅 CRM 变化（供 useSyncExternalStore 使用） */
export const subscribeCrm = crmStore.subscribe

/** CRM 统计：按状态聚合 */
export function getCrmStats(): Record<FollowUpStatus, number> {
  const records = crmStore.getAllCrmRecords()
  const stats: Record<FollowUpStatus, number> = {
    new: 0,
    contacted: 0,
    engaging: 0,
    won: 0,
    lost: 0,
  }
  records.forEach((r) => {
    stats[r.followUpStatus]++
  })
  return stats
}

/** 筛选选项类型重导出，方便页面使用 */
export type { Platform, Region, CustomerType, IntentLevel, OutreachChannel, FollowUpStep }

export { API_BASE_URL }
