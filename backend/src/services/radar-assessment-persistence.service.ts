import { createHash } from 'node:crypto'
import {
  Prisma,
  type Platform,
  type PrismaClient,
  type RadarAssessment as StoredRadarAssessment,
} from '@prisma/client'
import { CURRENT_OPPORTUNITY_DETECTION_VERSION } from '../contracts/opportunity.contract.js'
import {
  RADAR_ASSESSMENT_VERSION,
  type RadarAssessment,
  type RadarAssessmentInput,
  type RadarUserIntentSnapshot,
} from '../contracts/radar-assessment.contract.js'
import type { SearchProductContext } from '../contracts/product-context.contract.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { evidenceRankingService } from './evidence-ranking.service.js'
import { radarAssessment } from './radar-assessment.service.js'
import { toSafeJson } from './safe-json.service.js'

interface RadarAssessmentCalculator {
  assess(input: RadarAssessmentInput): RadarAssessment
}

export interface CreateRadarAssessmentInput {
  userId: string
  searchEvidenceId: string
}

export interface ListRadarAssessmentsInput {
  userId: string
  searchTaskId: string
  includeBlocked?: boolean
}

export type RadarAssessmentWorkspaceItem = Omit<
  StoredRadarAssessment,
  'userId' | 'contextHash'
> & {
  evidence: {
    id: string
    companyName: string | null
    normalizedDomain: string | null
    rawUrl: string
    title: string | null
    excerpt: string
    provider: string
    platform: Platform
    identityStatus: string
    evidenceStatus: string
    sourceTier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNKNOWN'
    sourceType: string
    publishedAt: string | null
    capturedAt: string
    freshnessStatus: 'FRESH' | 'RECENT' | 'STALE' | 'UNKNOWN'
    qualityScore: number
    corroborationRequired: boolean
    qualityReasons: string[]
    createdAt: Date
    updatedAt: Date
  }
}

export class RadarAssessmentPersistenceService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly calculator: RadarAssessmentCalculator =
      radarAssessment,
  ) {}

  async createForEvidence(
    input: CreateRadarAssessmentInput,
  ): Promise<StoredRadarAssessment> {
    return this.db.$transaction(async (transaction) => {
      const evidence = await transaction.searchEvidence.findFirst({
        where: {
          id: input.searchEvidenceId,
          searchTask: {
            userId: input.userId,
          },
        },
        select: {
          id: true,
          provider: true,
          rawUrl: true,
          title: true,
          content: true,
          rawMetadata: true,
          companyName: true,
          identityConfidence: true,
          identityStatus: true,
          evidenceStatus: true,
          createdAt: true,
          searchTask: {
            select: {
              id: true,
              userId: true,
              parameters: true,
              createdAt: true,
            },
          },
        },
      })

      if (!evidence) {
        throw new AppError(
          404,
          'RADAR_EVIDENCE_NOT_FOUND',
          'Search evidence not found',
        )
      }

      const userIntentSnapshot = buildUserIntentSnapshot(
        evidence.searchTask.parameters,
        evidence.searchTask.createdAt,
      )
      const contextHash = hashSnapshot(userIntentSnapshot)
      const assessment = this.calculator.assess({
        evidence: {
          id: evidence.id,
          provider: evidence.provider,
          rawUrl: evidence.rawUrl,
          title: evidence.title,
          content: evidence.content,
          rawMetadata: evidence.rawMetadata,
          companyName: evidence.companyName,
          identityConfidence: evidence.identityConfidence,
          identityStatus: evidence.identityStatus,
          evidenceStatus: evidence.evidenceStatus,
          createdAt: evidence.createdAt,
        },
        userIntentSnapshot,
      })
      const uniqueKey = {
        searchEvidenceId: evidence.id,
        assessmentVersion: assessment.assessmentVersion,
        detectionVersion: CURRENT_OPPORTUNITY_DETECTION_VERSION,
        contextHash,
      }
      const existing = await transaction.radarAssessment.findUnique({
        where: {
          searchEvidenceId_assessmentVersion_detectionVersion_contextHash:
            uniqueKey,
        },
      })

      if (existing) return existing

      try {
        return await transaction.radarAssessment.create({
          data: {
            userId: evidence.searchTask.userId,
            searchTaskId: evidence.searchTask.id,
            searchEvidenceId: evidence.id,
            assessmentVersion: assessment.assessmentVersion,
            detectionVersion: CURRENT_OPPORTUNITY_DETECTION_VERSION,
            contextHash,
            userIntentSnapshot: toSafeJson(userIntentSnapshot),
            entityRole: assessment.entityRole,
            customerGoal: assessment.customerGoal,
            decision: assessment.decision,
            recommendedAction: assessment.recommendedAction,
            confidenceScore: assessment.confidenceScore,
            matchScore: assessment.matchScore,
            riskLevel: assessment.riskLevel,
            reasonCodes: toSafeJson(assessment.reasonCodes),
            scoreBreakdown: toSafeJson(assessment.scoreBreakdown),
          },
        })
      } catch (error) {
        if (!isUniqueConflict(error)) throw error

        const concurrent = await transaction.radarAssessment.findUnique({
          where: {
            searchEvidenceId_assessmentVersion_detectionVersion_contextHash:
              uniqueKey,
          },
        })
        if (!concurrent) throw error
        return concurrent
      }
    })
  }

  async listForSearchTask(
    input: ListRadarAssessmentsInput,
  ): Promise<RadarAssessmentWorkspaceItem[]> {
    const task = await this.db.searchTask.findFirst({
      where: {
        id: input.searchTaskId,
        userId: input.userId,
      },
      select: { id: true },
    })
    if (!task) {
      throw new AppError(
        404,
        'SEARCH_TASK_NOT_FOUND',
        'Search task not found',
      )
    }

    const assessments = await this.db.radarAssessment.findMany({
      where: {
        userId: input.userId,
        searchTaskId: task.id,
        ...(input.includeBlocked
          ? {}
          : {
              decision: {
                not: 'BLOCKED',
              },
            }),
      },
      orderBy: [
        { matchScore: 'desc' },
        { confidenceScore: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        searchTaskId: true,
        searchEvidenceId: true,
        assessmentVersion: true,
        detectionVersion: true,
        userIntentSnapshot: true,
        entityRole: true,
        customerGoal: true,
        decision: true,
        recommendedAction: true,
        confidenceScore: true,
        matchScore: true,
        riskLevel: true,
        reasonCodes: true,
        scoreBreakdown: true,
        createdAt: true,
        searchEvidence: {
          select: {
            id: true,
            companyName: true,
            normalizedDomain: true,
            rawUrl: true,
            title: true,
            content: true,
            provider: true,
            platform: true,
            identityStatus: true,
            evidenceStatus: true,
            rawMetadata: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    return assessments.map(({ searchEvidence, ...assessment }) => {
      const { content, rawMetadata, ...evidence } = searchEvidence
      const ranking = evidenceRankingService.rank({
        sourceUrl: evidence.rawUrl,
        provider: evidence.provider,
        platform: evidence.platform,
        rawMetadata,
        capturedAt: evidence.createdAt,
        identityStatus: evidence.identityStatus,
        evidenceStatus: evidence.evidenceStatus,
      })
      return {
        ...assessment,
        evidence: {
          ...evidence,
          excerpt: evidenceExcerpt(content),
          ...ranking,
          qualityReasons: ranking.reasons,
        },
      }
    })
  }
}

function evidenceExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 360) return normalized
  return `${normalized.slice(0, 357).trimEnd()}...`
}

function buildUserIntentSnapshot(
  parameters: Prisma.JsonValue,
  taskCreatedAt: Date,
): RadarUserIntentSnapshot {
  const root = jsonRecord(parameters)
  const storedIntent =
    jsonRecord(root?.userIntentSnapshot) ??
    jsonRecord(root?.searchIntentSnapshot)
  const storedProductSnapshot = jsonRecord(
    root?.productContextSnapshot,
  )
  const productContext =
    parseProductContext(storedProductSnapshot?.context) ??
    parseProductContext(root?.productContext)

  return {
    version: readString(storedIntent?.version) ?? 'legacy-v1',
    capturedAt:
      readString(storedIntent?.capturedAt) ??
      taskCreatedAt.toISOString(),
    customerGoal: readString(storedIntent?.customerGoal),
    salesIntent: readString(storedIntent?.salesIntent),
    targetType: readString(storedIntent?.targetType),
    relationship: readString(storedIntent?.relationship),
    productContext,
  }
}

function parseProductContext(
  value: unknown,
): SearchProductContext | undefined {
  const source = jsonRecord(value)
  if (!source) return undefined
  const context: SearchProductContext = {}

  for (const field of [
    'product',
    'category',
    'customerType',
    'industry',
    'region',
    'country',
    'businessProblem',
  ] as const) {
    const fieldValue = readString(source[field])
    if (fieldValue) context[field] = fieldValue
  }

  for (const field of [
    'applications',
    'buyingSignals',
    'buyerKeywords',
    'channelKeywords',
  ] as const) {
    const values = readStringArray(source[field])
    if (values.length > 0) context[field] = values
  }

  return Object.keys(context).length > 0 ? context : undefined
}

function hashSnapshot(snapshot: RadarUserIntentSnapshot) {
  return createHash('sha256')
    .update(stableStringify(snapshot))
    .digest('hex')
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entry]) =>
          `${JSON.stringify(key)}:${stableStringify(entry)}`,
      )
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function jsonRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value
        .map(readString)
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ]
}

function isUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

export const radarAssessmentPersistence =
  new RadarAssessmentPersistenceService()

export const CURRENT_RADAR_ASSESSMENT_VERSION =
  RADAR_ASSESSMENT_VERSION
