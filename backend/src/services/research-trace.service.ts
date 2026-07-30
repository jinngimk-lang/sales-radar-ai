import type {
  CompanyAnalysisStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { isEligibleCompanyIntelligenceSource } from './company-intelligence-input.service.js'

export type ResearchTraceStage =
  | 'PRODUCT_CONTEXT'
  | 'EVIDENCE_VALIDATION'
  | 'OPPORTUNITY_ASSESSMENT'
  | 'COMPANY_IDENTITY'
  | 'COMPANY_RESEARCH'
  | 'SALES_PREPARATION'

export type ResearchTraceStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'NEEDS_REVIEW'
  | 'FAILED'

export type ResearchInformationType =
  | 'FACT'
  | 'ASSESSMENT'
  | 'RECOMMENDATION'

export interface ResearchTraceReference {
  type:
    | 'SEARCH_TASK'
    | 'PRODUCT_CONTEXT_SNAPSHOT'
    | 'SEARCH_EVIDENCE'
    | 'OPPORTUNITY'
    | 'COMPANY_PROFILE'
    | 'COMPANY_SOURCE'
    | 'COMPANY_INTELLIGENCE_SNAPSHOT'
  id: string
}

export interface ResearchTraceSourceReference {
  type: 'PRODUCT_CONTEXT' | 'SEARCH_EVIDENCE' | 'COMPANY_SOURCE'
  id: string
  title: string | null
  url: string | null
  capturedAt: Date | null
  supports: string[]
}

export interface ResearchTraceStep {
  id: string
  stage: ResearchTraceStage
  status: ResearchTraceStatus
  informationType: ResearchInformationType
  title: string
  summary: string
  reasons: string[]
  sourceReferences: ResearchTraceSourceReference[]
  inputReferences: ResearchTraceReference[]
  outputReferences: ResearchTraceReference[]
  version: string | null
  confidence: number | null
  timestamp: Date
  pendingVerifications: string[]
}

export class ResearchTraceService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async getForUser(opportunityId: string, userId: string) {
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        userId,
        integrityStatus: 'EVIDENCE_LINKED',
        evidence: {
          some: {},
        },
        searchTask: {
          status: 'COMPLETED',
        },
      },
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        whyItMatters: true,
        recommendedNextStep: true,
        confidence: true,
        productContextSnapshot: true,
        detectionVersion: true,
        createdAt: true,
        searchTask: {
          select: {
            id: true,
            userId: true,
            productProfileId: true,
            keyword: true,
            createdAt: true,
            completedAt: true,
          },
        },
        evidence: {
          select: {
            id: true,
            excerpt: true,
            confidence: true,
            createdAt: true,
            searchEvidence: {
              select: {
                id: true,
                provider: true,
                rawUrl: true,
                title: true,
                content: true,
                extractionStatus: true,
                identityStatus: true,
                evidenceStatus: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        companyProfiles: {
          where: {
            companyProfile: {
              userId,
            },
          },
          select: {
            relationshipType: true,
            createdAt: true,
            companyProfile: {
              select: {
                id: true,
                companyName: true,
                normalizedDomain: true,
                officialWebsite: true,
                identityStatus: true,
                identityConfidence: true,
                analysisStatus: true,
                analysisVersion: true,
                updatedAt: true,
                sources: {
                  where: {
                    opportunityId,
                  },
                  select: {
                    id: true,
                    url: true,
                    title: true,
                    capturedAt: true,
                    confidence: true,
                  },
                  orderBy: {
                    capturedAt: 'asc',
                  },
                },
                currentSnapshot: {
                  select: {
                    id: true,
                    sourceIds: true,
                    analysisStatus: true,
                    analysisVersion: true,
                    confidence: true,
                    understandingSnapshot: true,
                    relevanceAssessment: true,
                    researchHints: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!opportunity) {
      throw new AppError(
        404,
        'RESEARCH_TRACE_NOT_FOUND',
        'Research trace not found',
      )
    }

    const eligibleEvidence = opportunity.evidence.filter(
      ({ searchEvidence }) =>
        isEligibleCompanyIntelligenceSource({
          provider: searchEvidence.provider,
          sourceUrl: searchEvidence.rawUrl,
          content: searchEvidence.content,
        }),
    )
    const evidenceSources = eligibleEvidence.map(
      ({ searchEvidence, excerpt }) => ({
        type: 'SEARCH_EVIDENCE' as const,
        id: searchEvidence.id,
        title: searchEvidence.title,
        url: searchEvidence.rawUrl,
        capturedAt: searchEvidence.createdAt,
        supports: [
          '销售机会来源',
          ...(excerpt.trim() ? ['企业变化摘要'] : []),
        ],
      }),
    )
    const primaryCompanyLink =
      opportunity.companyProfiles.find(
        (link) => link.relationshipType === 'EVENT_SUBJECT',
      ) ?? opportunity.companyProfiles[0]
    const companyProfile = primaryCompanyLink?.companyProfile ?? null
    const companySources =
      companyProfile?.sources.filter((source) => isPublicHttpUrl(source.url)) ??
      []
    const companySourceReferences = companySources.map((source) => ({
      type: 'COMPANY_SOURCE' as const,
      id: source.id,
      title: source.title,
      url: source.url,
      capturedAt: source.capturedAt,
      supports: ['企业身份', '企业官网'],
    }))

    const steps: ResearchTraceStep[] = [
      productContextStep(opportunity),
      evidenceValidationStep(opportunity, evidenceSources),
      opportunityAssessmentStep(opportunity, evidenceSources),
      companyIdentityStep(
        opportunity,
        companyProfile,
        companySourceReferences,
      ),
      companyResearchStep(
        opportunity,
        companyProfile,
        companySourceReferences,
      ),
      salesPreparationStep(opportunity, evidenceSources),
    ]

    return {
      opportunityId: opportunity.id,
      generatedAt: new Date(),
      steps,
      summary: {
        completed: steps.filter((step) => step.status === 'COMPLETED')
          .length,
        needsReview: steps.filter(
          (step) =>
            step.status === 'NEEDS_REVIEW' ||
            step.status === 'PARTIAL',
        ).length,
        failed: steps.filter((step) => step.status === 'FAILED').length,
      },
    }
  }
}

interface TraceOpportunity {
  id: string
  title: string
  summary: string
  whyItMatters: string
  recommendedNextStep: string
  confidence: number
  productContextSnapshot: Prisma.JsonValue
  detectionVersion: string
  createdAt: Date
  searchTask: {
    id: string
    keyword: string
    createdAt: Date
    completedAt: Date | null
  }
}

function productContextStep(
  opportunity: TraceOpportunity,
): ResearchTraceStep {
  const context = jsonRecord(opportunity.productContextSnapshot)
  const nestedContext = jsonRecord(context.context)
  const values =
    Object.keys(nestedContext).length > 0 ? nestedContext : context
  const product = readableString(values.product)
  const industry = readableString(values.industry)
  const region = readableString(values.region)
  const customerType = readableString(values.customerType)
  const supportedFields = [
    product ? '产品方向' : null,
    industry ? '目标行业' : null,
    region ? '目标地区' : null,
    customerType ? '目标客户类型' : null,
  ].filter((value): value is string => Boolean(value))
  const hasContext = supportedFields.length > 0

  return {
    id: `product-context:${opportunity.searchTask.id}`,
    stage: 'PRODUCT_CONTEXT',
    status: hasContext ? 'COMPLETED' : 'NEEDS_REVIEW',
    informationType: hasContext ? 'FACT' : 'ASSESSMENT',
    title: hasContext ? '产品方向已保存' : '产品方向待确认',
    summary: hasContext
      ? [product, industry, region, customerType]
          .filter(Boolean)
          .join(' · ')
      : '当前搜索没有可解释的产品方向快照。',
    reasons: hasContext
      ? ['该方向来自用户搜索时保存的产品上下文。']
      : ['缺少产品、行业、地区或目标客户等上下文。'],
    sourceReferences: hasContext
      ? [
          {
            type: 'PRODUCT_CONTEXT',
            id: opportunity.searchTask.id,
            title: '搜索时保存的产品方向',
            url: null,
            capturedAt: opportunity.searchTask.createdAt,
            supports: supportedFields,
          },
        ]
      : [],
    inputReferences: [
      {
        type: 'SEARCH_TASK',
        id: opportunity.searchTask.id,
      },
    ],
    outputReferences: hasContext
      ? [
          {
            type: 'PRODUCT_CONTEXT_SNAPSHOT',
            id: `opportunity:${opportunity.id}:product-context`,
          },
        ]
      : [],
    version: readableString(context.version),
    confidence: null,
    timestamp: opportunity.searchTask.createdAt,
    pendingVerifications: hasContext
      ? []
      : ['确认产品、目标行业、地区和客户类型。'],
  }
}

function evidenceValidationStep(
  opportunity: TraceOpportunity & {
    evidence: Array<{
      searchEvidence: {
        id: string
        extractionStatus: string
        identityStatus: string
        evidenceStatus: string
      }
    }>
  },
  sourceReferences: ResearchTraceSourceReference[],
): ResearchTraceStep {
  const hasSources = sourceReferences.length > 0
  return {
    id: `evidence:${opportunity.id}`,
    stage: 'EVIDENCE_VALIDATION',
    status: hasSources ? 'COMPLETED' : 'NEEDS_REVIEW',
    informationType: hasSources ? 'FACT' : 'ASSESSMENT',
    title: hasSources ? '真实来源已关联' : '真实来源待确认',
    summary: hasSources
      ? `${sourceReferences.length} 条真实来源与当前销售机会明确关联。`
      : '当前销售机会缺少可验证的网址和正文来源。',
    reasons: hasSources
      ? ['来源通过 OpportunityEvidence 与当前销售机会明确关联。']
      : ['没有符合真实 URL、非 mock 和正文完整性要求的关联来源。'],
    sourceReferences,
    inputReferences: opportunity.evidence.map(({ searchEvidence }) => ({
      type: 'SEARCH_EVIDENCE' as const,
      id: searchEvidence.id,
    })),
    outputReferences: [
      {
        type: 'OPPORTUNITY',
        id: opportunity.id,
      },
    ],
    version: null,
    confidence: null,
    timestamp:
      sourceReferences[0]?.capturedAt ?? opportunity.createdAt,
    pendingVerifications: hasSources
      ? []
      : ['补充与当前机会明确关联的真实来源。'],
  }
}

function opportunityAssessmentStep(
  opportunity: TraceOpportunity,
  sourceReferences: ResearchTraceSourceReference[],
): ResearchTraceStep {
  return {
    id: `opportunity:${opportunity.id}`,
    stage: 'OPPORTUNITY_ASSESSMENT',
    status:
      sourceReferences.length > 0 ? 'COMPLETED' : 'NEEDS_REVIEW',
    informationType: 'ASSESSMENT',
    title: '形成销售机会判断',
    summary: `${opportunity.summary} 该变化可能值得销售进一步研究，但不代表企业已经采购。`,
    reasons: [
      opportunity.whyItMatters,
      sourceReferences.length > 0
        ? `该判断引用了 ${sourceReferences.length} 条明确关联的真实来源。`
        : '当前判断缺少可验证来源，需要继续核实。',
    ],
    sourceReferences,
    inputReferences: sourceReferences.map((source) => ({
      type: 'SEARCH_EVIDENCE' as const,
      id: source.id,
    })),
    outputReferences: [
      {
        type: 'OPPORTUNITY',
        id: opportunity.id,
      },
    ],
    version: opportunity.detectionVersion,
    confidence: opportunity.confidence,
    timestamp: opportunity.createdAt,
    pendingVerifications: ['尚未确认企业存在采购需求。'],
  }
}

function companyIdentityStep(
  opportunity: TraceOpportunity,
  companyProfile:
    | {
        id: string
        companyName: string
        normalizedDomain: string | null
        officialWebsite: string | null
        identityStatus: string
        identityConfidence: number
        analysisVersion: string
        updatedAt: Date
      }
    | null,
  sourceReferences: ResearchTraceSourceReference[],
): ResearchTraceStep {
  const verified =
    companyProfile?.identityStatus === 'VERIFIED' &&
    sourceReferences.length > 0

  return {
    id: `company-identity:${opportunity.id}`,
    stage: 'COMPANY_IDENTITY',
    status: verified ? 'COMPLETED' : 'NEEDS_REVIEW',
    informationType: verified ? 'FACT' : 'ASSESSMENT',
    title: verified ? '企业身份已确认' : '企业身份待确认',
    summary: verified
      ? `已根据真实来源确认企业主体 ${companyProfile.companyName}，该记录是企业画像，不是客户记录。`
      : '当前尚未形成有真实来源支持的企业身份。',
    reasons: verified
      ? [
          '企业身份来自与当前机会关联的 CompanySource。',
          '企业画像不代表企业已经成为客户。',
        ]
      : ['缺少已验证 CompanyProfile 与对应 CompanySource。'],
    sourceReferences,
    inputReferences: sourceReferences.map((source) => ({
      type: 'COMPANY_SOURCE' as const,
      id: source.id,
    })),
    outputReferences: companyProfile
      ? [
          {
            type: 'COMPANY_PROFILE',
            id: companyProfile.id,
          },
        ]
      : [],
    version: companyProfile?.analysisVersion ?? null,
    confidence: verified ? companyProfile.identityConfidence : null,
    timestamp: companyProfile?.updatedAt ?? opportunity.createdAt,
    pendingVerifications: verified
      ? [
          ...(companyProfile.normalizedDomain ? [] : ['企业域名待确认。']),
          ...(companyProfile.officialWebsite ? [] : ['企业官网待确认。']),
        ]
      : ['核验企业名称、官网和规范域名。'],
  }
}

function companyResearchStep(
  opportunity: TraceOpportunity,
  companyProfile:
    | {
        id: string
        analysisStatus: CompanyAnalysisStatus
        currentSnapshot: {
          id: string
          sourceIds: string[]
          analysisStatus: CompanyAnalysisStatus
          analysisVersion: string
          confidence: number
          understandingSnapshot: Prisma.JsonValue
          relevanceAssessment: Prisma.JsonValue
          researchHints: Prisma.JsonValue
          createdAt: Date
        } | null
      }
    | null,
  sourceReferences: ResearchTraceSourceReference[],
): ResearchTraceStep {
  const snapshot = companyProfile?.currentSnapshot
  if (!companyProfile || !snapshot) {
    return {
      id: `company-research:${opportunity.id}`,
      stage: 'COMPANY_RESEARCH',
      status: 'NEEDS_REVIEW',
      informationType: 'ASSESSMENT',
      title: '企业研究待完成',
      summary: '当前尚未形成企业研究快照。',
      reasons: ['没有与当前企业画像关联的研究快照。'],
      sourceReferences: [],
      inputReferences: companyProfile
        ? [{ type: 'COMPANY_PROFILE', id: companyProfile.id }]
        : [],
      outputReferences: [],
      version: null,
      confidence: null,
      timestamp: opportunity.createdAt,
      pendingVerifications: ['继续验证企业业务方向与产品相关性。'],
    }
  }

  const relevance = jsonRecord(snapshot.relevanceAssessment)
  const understanding = jsonRecord(snapshot.understandingSnapshot)
  const reasons = [
    ...jsonStringArray(relevance.reasons),
    ...jsonStringArray(understanding.reasons),
  ]
  const snapshotSources = sourceReferences.filter((source) =>
    snapshot.sourceIds.includes(source.id),
  )
  const hasSource = snapshotSources.length > 0
  const ready =
    snapshot.analysisStatus === 'READY' && hasSource && reasons.length > 0
  const safeReasons =
    reasons.length > 0
      ? reasons
      : [
          hasSource
            ? '研究快照已保存，但尚未记录完整的业务判断原因。'
            : '研究快照缺少对应的 CompanySource 引用。',
        ]

  return {
    id: `company-research:${snapshot.id}`,
    stage: 'COMPANY_RESEARCH',
    status: ready ? 'COMPLETED' : 'NEEDS_REVIEW',
    informationType: 'ASSESSMENT',
    title: ready ? '企业研究已完成' : '企业研究仍需验证',
    summary: ready
      ? '企业业务理解和产品相关性已有来源与判断原因支持。'
      : '企业身份可能已确认，但业务理解和产品相关性仍需更多验证。',
    reasons: safeReasons,
    sourceReferences: snapshotSources,
    inputReferences: [
      {
        type: 'COMPANY_PROFILE',
        id: companyProfile.id,
      },
      ...snapshotSources.map((source) => ({
        type: 'COMPANY_SOURCE' as const,
        id: source.id,
      })),
    ],
    outputReferences: [
      {
        type: 'COMPANY_INTELLIGENCE_SNAPSHOT',
        id: snapshot.id,
      },
    ],
    version: snapshot.analysisVersion,
    confidence: hasSource ? snapshot.confidence : null,
    timestamp: snapshot.createdAt,
    pendingVerifications: ready
      ? []
      : ['验证企业业务方向。', '验证产品与企业变化的实际关联。'],
  }
}

function salesPreparationStep(
  opportunity: TraceOpportunity,
  sourceReferences: ResearchTraceSourceReference[],
): ResearchTraceStep {
  return {
    id: `sales-preparation:${opportunity.id}`,
    stage: 'SALES_PREPARATION',
    status:
      sourceReferences.length > 0 ? 'COMPLETED' : 'NEEDS_REVIEW',
    informationType: 'RECOMMENDATION',
    title: '形成下一步研究建议',
    summary: opportunity.recommendedNextStep,
    reasons: [
      '该内容是基于当前销售机会形成的研究建议，不是企业行为或采购事实。',
    ],
    sourceReferences,
    inputReferences: [
      {
        type: 'OPPORTUNITY',
        id: opportunity.id,
      },
    ],
    outputReferences: [],
    version: opportunity.detectionVersion,
    confidence: null,
    timestamp: opportunity.createdAt,
    pendingVerifications: ['执行销售行动前核验企业需求与适合的联系方向。'],
  }
}

function jsonRecord(value: Prisma.JsonValue | undefined) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {}
}

function jsonStringArray(value: Prisma.JsonValue | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readableString(value: Prisma.JsonValue | undefined) {
  return typeof value === 'string' && value.trim() && value !== 'Unknown'
    ? value.trim()
    : null
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const reservedHost =
      hostname === 'localhost' ||
      hostname === 'example.com' ||
      hostname === 'example.org' ||
      hostname === 'example.net' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.invalid') ||
      hostname.endsWith('.example')
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(hostname) &&
      !url.username &&
      !url.password &&
      !reservedHost
    )
  } catch {
    return false
  }
}

export const researchTrace = new ResearchTraceService()
