import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import {
  researchTrace,
  type ResearchInformationType,
  type ResearchTraceStep,
} from './research-trace.service.js'

export type ResearchTraceVerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'NEEDS_REVIEW'
  | 'CONFLICTING'
  | 'NOT_APPLICABLE'

export type ResearchTraceClaimVerificationStatus =
  | 'CONFIRMED'
  | 'PARTIALLY_CONFIRMED'
  | 'NEEDS_REVIEW'
  | 'CONFLICTING'
  | 'NOT_APPLICABLE'

export interface ResearchTraceSupportingSource {
  id: string
  referenceType:
    | 'SEARCH_EVIDENCE'
    | 'COMPANY_SOURCE'
    | 'PRODUCT_CONTEXT'
  referenceId: string
  title: string
  url: string | null
  excerpt: string | null
  capturedAt: Date | null
  role: 'PRIMARY' | 'CORROBORATING' | 'CONTEXT'
  verificationStatus:
    | 'VERIFIED'
    | 'PARTIALLY_VERIFIED'
    | 'NEEDS_REVIEW'
    | 'CONFLICTING'
}

export interface ResearchTraceSupportedClaim {
  id: string
  claimType: ResearchInformationType
  text: string
  verificationStatus: ResearchTraceClaimVerificationStatus
  supportingSourceIds: string[]
  reasons: string[]
  verificationQuestions: string[]
}

export interface ResearchTraceReasoningLink {
  fromType: 'SOURCE' | 'CLAIM'
  fromId: string
  toClaimId: string
  relationship: 'SUPPORTS' | 'INFORMS' | 'MOTIVATES' | 'CONTRADICTS'
  explanation: string
}

export interface ResearchTraceStepV2 extends ResearchTraceStep {
  supportingSources: ResearchTraceSupportingSource[]
  supportedClaims: ResearchTraceSupportedClaim[]
  reasoningLinks: ResearchTraceReasoningLink[]
  verificationStatus: ResearchTraceVerificationStatus
}

interface PhaseOneTraceReader {
  getForUser(opportunityId: string, userId: string): Promise<{
    opportunityId: string
    generatedAt: Date
    steps: ResearchTraceStep[]
    summary: {
      completed: number
      needsReview: number
      failed: number
    }
  }>
}

export class ResearchTraceDetailsService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly phaseOneTrace: PhaseOneTraceReader = researchTrace,
  ) {}

  async getForUser(opportunityId: string, userId: string) {
    const phaseOne = await this.phaseOneTrace.getForUser(
      opportunityId,
      userId,
    )
    const opportunity = await this.db.opportunity.findFirst({
      where: {
        id: opportunityId,
        userId,
        searchTask: {
          status: 'COMPLETED',
        },
      },
      select: {
        id: true,
        summary: true,
        whyItMatters: true,
        recommendedNextStep: true,
        productContextSnapshot: true,
        evidence: {
          select: {
            id: true,
            excerpt: true,
            isPrimary: true,
            confidence: true,
            createdAt: true,
            searchEvidence: {
              select: {
                id: true,
                rawUrl: true,
                title: true,
                content: true,
                companyName: true,
                normalizedDomain: true,
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
            companyProfile: {
              select: {
                id: true,
                companyName: true,
                normalizedDomain: true,
                officialWebsite: true,
                identityStatus: true,
                currentSnapshot: {
                  select: {
                    id: true,
                    sourceIds: true,
                    relevanceAssessment: true,
                    researchHints: true,
                  },
                },
                sources: {
                  select: {
                    id: true,
                    opportunityId: true,
                    url: true,
                    title: true,
                    excerpt: true,
                    capturedAt: true,
                    searchEvidence: {
                      select: {
                        id: true,
                        companyName: true,
                        normalizedDomain: true,
                        evidenceStatus: true,
                      },
                    },
                  },
                  orderBy: {
                    capturedAt: 'asc',
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
        'RESEARCH_TRACE_DETAILS_NOT_FOUND',
        'Research trace details not found',
      )
    }

    const primaryCompanyLink =
      opportunity.companyProfiles.find(
        (link) => link.relationshipType === 'EVENT_SUBJECT',
      ) ?? opportunity.companyProfiles[0]
    const companyProfile = primaryCompanyLink?.companyProfile ?? null
    const searchSources = opportunity.evidence
      .filter(
        ({ searchEvidence }) =>
          isPublicHttpUrl(searchEvidence.rawUrl) &&
          Boolean(searchEvidence.content.trim()),
      )
      .map(({ searchEvidence, excerpt, isPrimary }) => ({
        id: sourceId('SEARCH_EVIDENCE', searchEvidence.id),
        referenceType: 'SEARCH_EVIDENCE' as const,
        referenceId: searchEvidence.id,
        title: searchEvidence.title?.trim() || '真实来源',
        url: searchEvidence.rawUrl,
        excerpt: excerpt.trim() || null,
        capturedAt: searchEvidence.createdAt,
        role: isPrimary ? ('PRIMARY' as const) : ('CORROBORATING' as const),
        verificationStatus:
          searchEvidence.evidenceStatus === 'VALID'
            ? ('VERIFIED' as const)
            : ('NEEDS_REVIEW' as const),
      }))
    const snapshotSourceIds =
      companyProfile?.currentSnapshot?.sourceIds ?? []
    const companySources = (companyProfile?.sources ?? [])
      .filter(
        (source) =>
          source.opportunityId === opportunity.id ||
          snapshotSourceIds.includes(source.id),
      )
      .filter((source) => isPublicHttpUrl(source.url))
      .map((source) => {
        const conflicting = hasStructuredIdentityConflict({
          profileName: companyProfile?.companyName ?? null,
          profileDomain: companyProfile?.normalizedDomain ?? null,
          evidenceName: source.searchEvidence?.companyName ?? null,
          evidenceDomain:
            source.searchEvidence?.normalizedDomain ?? null,
        })
        return {
          id: sourceId('COMPANY_SOURCE', source.id),
          referenceType: 'COMPANY_SOURCE' as const,
          referenceId: source.id,
          title: source.title.trim() || '企业来源',
          url: source.url,
          excerpt: source.excerpt?.trim() || null,
          capturedAt: source.capturedAt,
          role: 'PRIMARY' as const,
          verificationStatus: conflicting
            ? ('CONFLICTING' as const)
            : source.searchEvidence?.evidenceStatus === 'VALID'
              ? ('VERIFIED' as const)
              : ('NEEDS_REVIEW' as const),
        }
      })
    const contextSource = productContextSource(
      opportunity.id,
      opportunity.productContextSnapshot,
    )

    const steps = phaseOne.steps.map((step) =>
      enrichStep({
        step,
        opportunity,
        companyProfile,
        searchSources,
        companySources,
        contextSource,
      }),
    )

    return {
      ...phaseOne,
      traceVersion: 'v2' as const,
      steps,
      detailsSummary: {
        confirmedFacts: countClaims(
          steps,
          'FACT',
          'CONFIRMED',
        ),
        assessments: countClaims(steps, 'ASSESSMENT'),
        recommendations: countClaims(steps, 'RECOMMENDATION'),
        needsReview: steps.reduce(
          (count, step) =>
            count +
            step.supportedClaims.filter(
              (claim) =>
                claim.verificationStatus === 'NEEDS_REVIEW' ||
                claim.verificationStatus === 'CONFLICTING',
            ).length,
          0,
        ),
      },
    }
  }
}

interface EnrichStepInput {
  step: ResearchTraceStep
  opportunity: {
    id: string
    summary: string
    whyItMatters: string
    recommendedNextStep: string
    productContextSnapshot: Prisma.JsonValue
    evidence: Array<{
      id: string
      excerpt: string
      searchEvidence: {
        id: string
        evidenceStatus: string
      }
    }>
  }
  companyProfile: {
    id: string
    companyName: string
    normalizedDomain: string | null
    officialWebsite: string | null
    identityStatus: string
    currentSnapshot: {
      id: string
      sourceIds: string[]
      relevanceAssessment: Prisma.JsonValue
      researchHints: Prisma.JsonValue
    } | null
  } | null
  searchSources: ResearchTraceSupportingSource[]
  companySources: ResearchTraceSupportingSource[]
  contextSource: ResearchTraceSupportingSource | null
}

function enrichStep(input: EnrichStepInput): ResearchTraceStepV2 {
  const {
    step,
    opportunity,
    companyProfile,
    searchSources,
    companySources,
    contextSource,
  } = input

  if (step.stage === 'PRODUCT_CONTEXT') {
    const sources = contextSource ? [contextSource] : []
    const claim = contextSource
      ? assessmentClaim({
          id: `${step.id}:context`,
          text: `研究背景：${contextSource.excerpt ?? '已保存产品方向'}`,
          reasons: ['该内容来自搜索时保存的产品上下文，只作为研究背景。'],
          sourceIds: [contextSource.id],
        })
      : null
    return v2Step(
      { ...step, informationType: 'ASSESSMENT' },
      sources,
      claim ? [claim] : [],
      claim
        ? [
            sourceLink(
              contextSource!.id,
              claim.id,
              'INFORMS',
              '产品上下文只提供研究方向，不支持企业事实。',
            ),
          ]
        : [],
      'NOT_APPLICABLE',
    )
  }

  if (step.stage === 'EVIDENCE_VALIDATION') {
    const claims = opportunity.evidence.reduce<
      ResearchTraceSupportedClaim[]
    >((result, item) => {
        const source = searchSources.find(
          (candidate) =>
            candidate.referenceId === item.searchEvidence.id,
        )
        if (!source) return result
        result.push({
          id: `${step.id}:fact:${item.id}`,
          claimType: 'FACT',
          text: item.excerpt.trim()
            ? `来源记录显示：${item.excerpt.trim()}`
            : '该真实来源已通过 OpportunityEvidence 与当前销售机会显式关联。',
          verificationStatus:
            source.verificationStatus === 'VERIFIED'
              ? ('CONFIRMED' as const)
              : ('NEEDS_REVIEW' as const),
          supportingSourceIds: [source.id],
          reasons: ['该事实描述来自显式关联的 OpportunityEvidence。'],
          verificationQuestions:
            source.verificationStatus === 'VERIFIED'
              ? []
              : ['进一步确认来源内容有效性。'],
        })
        return result
      }, [])
    return v2Step(
      step,
      searchSources,
      claims,
      claims.flatMap((claim) =>
        claim.supportingSourceIds.map((id) =>
          sourceLink(
            id,
            claim.id,
            'SUPPORTS',
            '真实来源通过 OpportunityEvidence 直接支持该事实记录。',
          ),
        ),
      ),
      aggregateVerification(searchSources, claims),
    )
  }

  if (step.stage === 'OPPORTUNITY_ASSESSMENT') {
    const claim = assessmentClaim({
      id: `${step.id}:assessment`,
      text: opportunity.summary,
      reasons: [
        opportunity.whyItMatters,
        '这是销售机会判断，不表示企业已发生采购。',
      ],
      sourceIds: searchSources.map((source) => source.id),
      verificationQuestions: ['验证企业变化与实际需求之间的关系。'],
    })
    return v2Step(
      step,
      searchSources,
      [claim],
      searchSources.map((source) =>
        sourceLink(
          source.id,
          claim.id,
          'INFORMS',
          '来源为商业判断提供背景，但不证明采购已经发生。',
        ),
      ),
      'NOT_APPLICABLE',
    )
  }

  if (step.stage === 'COMPANY_IDENTITY') {
    if (
      !companyProfile ||
      companyProfile.identityStatus !== 'VERIFIED' ||
      companySources.length === 0
    ) {
      return v2Step(
        { ...step, informationType: 'ASSESSMENT' },
        companySources,
        [],
        [],
        'NEEDS_REVIEW',
      )
    }
    const conflicting = companySources.some(
      (source) => source.verificationStatus === 'CONFLICTING',
    )
    const text = [
      `企业主体：${companyProfile.companyName}`,
      companyProfile.officialWebsite
        ? `官网：${companyProfile.officialWebsite}`
        : null,
      companyProfile.normalizedDomain
        ? `域名：${companyProfile.normalizedDomain}`
        : null,
    ]
      .filter(Boolean)
      .join('；')
    const claim: ResearchTraceSupportedClaim = {
      id: `${step.id}:identity`,
      claimType: 'FACT',
      text,
      verificationStatus: conflicting
        ? 'CONFLICTING'
        : companySources.every(
              (source) => source.verificationStatus === 'VERIFIED',
            )
          ? 'CONFIRMED'
          : 'NEEDS_REVIEW',
      supportingSourceIds: companySources.map((source) => source.id),
      reasons: [
        '企业身份仅使用与 CompanyProfile 显式关联的 CompanySource。',
      ],
      verificationQuestions: conflicting
        ? ['核对来源中的企业名称和域名冲突。']
        : [],
    }
    return v2Step(
      {
        ...step,
        status: conflicting ? 'NEEDS_REVIEW' : step.status,
      },
      companySources,
      [claim],
      companySources.map((source) =>
        sourceLink(
          source.id,
          claim.id,
          source.verificationStatus === 'CONFLICTING'
            ? 'CONTRADICTS'
            : 'SUPPORTS',
          source.verificationStatus === 'CONFLICTING'
            ? '显式关联来源中的结构化企业身份与当前企业画像不一致。'
            : 'CompanySource 直接支持企业身份记录。',
        ),
      ),
      conflicting
        ? 'CONFLICTING'
        : aggregateVerification(companySources, [claim]),
    )
  }

  if (step.stage === 'COMPANY_RESEARCH') {
    const snapshot = companyProfile?.currentSnapshot
    const snapshotSources = snapshot
      ? companySources.filter((source) =>
          snapshot.sourceIds.includes(source.referenceId),
        )
      : []
    const relevance = jsonRecord(snapshot?.relevanceAssessment)
    const reasons = jsonStringArray(relevance.reasons)
    const claims = reasons.map((reason, index) =>
      assessmentClaim({
        id: `${step.id}:assessment:${index}`,
        text: reason,
        reasons: [reason],
        sourceIds: snapshotSources.map((source) => source.id),
        verificationQuestions: ['验证该相关性是否适用于当前销售场景。'],
      }),
    )
    return v2Step(
      step,
      snapshotSources,
      claims,
      claims.flatMap((claim) =>
        snapshotSources.map((source) =>
          sourceLink(
            source.id,
            claim.id,
            'INFORMS',
            'Snapshot 中保存的显式 sourceIds 为该判断提供研究背景。',
          ),
        ),
      ),
      claims.length > 0 && snapshotSources.length > 0
        ? 'NOT_APPLICABLE'
        : 'NEEDS_REVIEW',
    )
  }

  const recommendation: ResearchTraceSupportedClaim = {
    id: `${step.id}:recommendation`,
    claimType: 'RECOMMENDATION',
    text: `建议：${opportunity.recommendedNextStep}`,
    verificationStatus: 'NOT_APPLICABLE',
    supportingSourceIds: [],
    reasons: [
      '该内容是基于销售机会判断形成的研究建议，不是企业行为或采购事实。',
    ],
    verificationQuestions: step.pendingVerifications,
  }
  return v2Step(
    step,
    [],
    [recommendation],
    [
      {
        fromType: 'CLAIM',
        fromId: `opportunity:${opportunity.id}:assessment`,
        toClaimId: recommendation.id,
        relationship: 'MOTIVATES',
        explanation: '销售机会判断促成下一步研究建议。',
      },
    ],
    'NOT_APPLICABLE',
  )
}

function v2Step(
  step: ResearchTraceStep,
  supportingSources: ResearchTraceSupportingSource[],
  supportedClaims: ResearchTraceSupportedClaim[],
  reasoningLinks: ResearchTraceReasoningLink[],
  verificationStatus: ResearchTraceVerificationStatus,
): ResearchTraceStepV2 {
  return {
    ...step,
    supportingSources,
    supportedClaims,
    reasoningLinks,
    verificationStatus,
  }
}

function assessmentClaim(input: {
  id: string
  text: string
  reasons: string[]
  sourceIds: string[]
  verificationQuestions?: string[]
}): ResearchTraceSupportedClaim {
  return {
    id: input.id,
    claimType: 'ASSESSMENT',
    text: input.text,
    verificationStatus: 'NOT_APPLICABLE',
    supportingSourceIds: input.sourceIds,
    reasons: input.reasons.filter(Boolean),
    verificationQuestions: input.verificationQuestions ?? [],
  }
}

function sourceLink(
  sourceIdValue: string,
  claimId: string,
  relationship: ResearchTraceReasoningLink['relationship'],
  explanation: string,
): ResearchTraceReasoningLink {
  return {
    fromType: 'SOURCE',
    fromId: sourceIdValue,
    toClaimId: claimId,
    relationship,
    explanation,
  }
}

function aggregateVerification(
  sources: ResearchTraceSupportingSource[],
  claims: ResearchTraceSupportedClaim[],
): ResearchTraceVerificationStatus {
  if (
    sources.some(
      (source) => source.verificationStatus === 'CONFLICTING',
    ) ||
    claims.some(
      (claim) => claim.verificationStatus === 'CONFLICTING',
    )
  ) {
    return 'CONFLICTING'
  }
  if (sources.length === 0 || claims.length === 0) {
    return 'NEEDS_REVIEW'
  }
  if (
    sources.every(
      (source) => source.verificationStatus === 'VERIFIED',
    ) &&
    claims.every(
      (claim) => claim.verificationStatus === 'CONFIRMED',
    )
  ) {
    return 'VERIFIED'
  }
  return 'PARTIALLY_VERIFIED'
}

function productContextSource(
  opportunityId: string,
  value: Prisma.JsonValue,
): ResearchTraceSupportingSource | null {
  const root = jsonRecord(value)
  const nested = jsonRecord(root.context)
  const context = Object.keys(nested).length > 0 ? nested : root
  const values = [
    readableString(context.product),
    readableString(context.industry),
    readableString(context.region),
    readableString(context.customerType),
  ].filter((item): item is string => Boolean(item))
  if (values.length === 0) return null
  return {
    id: sourceId('PRODUCT_CONTEXT', opportunityId),
    referenceType: 'PRODUCT_CONTEXT',
    referenceId: opportunityId,
    title: '搜索时保存的产品方向',
    url: null,
    excerpt: values.join(' · '),
    capturedAt: null,
    role: 'CONTEXT',
    verificationStatus: 'VERIFIED',
  }
}

function hasStructuredIdentityConflict(input: {
  profileName: string | null
  profileDomain: string | null
  evidenceName: string | null
  evidenceDomain: string | null
}) {
  const domainConflict =
    Boolean(input.profileDomain) &&
    Boolean(input.evidenceDomain) &&
    normalizeDomain(input.profileDomain!) !==
      normalizeDomain(input.evidenceDomain!)
  const nameConflict =
    Boolean(input.profileName) &&
    Boolean(input.evidenceName) &&
    normalizeIdentity(input.profileName!) !==
      normalizeIdentity(input.evidenceName!)
  return domainConflict || nameConflict
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, '')
}

function normalizeIdentity(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function sourceId(
  type: ResearchTraceSupportingSource['referenceType'],
  id: string,
) {
  return `${type}:${id}`
}

function countClaims(
  steps: ResearchTraceStepV2[],
  type: ResearchInformationType,
  status?: ResearchTraceClaimVerificationStatus,
) {
  return steps.reduce(
    (count, step) =>
      count +
      step.supportedClaims.filter(
        (claim) =>
          claim.claimType === type &&
          (!status || claim.verificationStatus === status),
      ).length,
    0,
  )
}

function jsonRecord(value: Prisma.JsonValue | null | undefined) {
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
    const reserved =
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
      !reserved
    )
  } catch {
    return false
  }
}

export const researchTraceDetails = new ResearchTraceDetailsService()
