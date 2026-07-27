import {
  Industry,
  LeadOutcomeStatus,
  Region,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { ensureDemoUser } from './demo-user.service.js'

export interface SalesLearningFilters {
  industry?: Industry
  region?: Region
}

export interface SalesLearningRecord {
  researchId: string
  matchScore: number | null
  recommendedAngle: string | null
  feedbackType: string | null
  outcomeStatus: LeadOutcomeStatus | null
  productProfileId: string | null
  productName: string | null
  leadCategory: string
  country: string
  industry: Industry
  region: Region
}

export interface MatchScoreBucket {
  range: '80-100' | '60-79' | '40-59' | '0-39'
  totalAnalyzedLeads: number
  replyRate: number
  meetingRate: number
  winRate: number
}

export interface SalesAnglePerformance {
  angle: string
  totalAnalyzedLeads: number
  replyRate: number
  meetingRate: number
  winRate: number
}

export interface SalesLearningOverview {
  totalAnalyzedLeads: number
  averageMatchScore: number
  feedbackAccuracy: number
  replyRate: number
  meetingRate: number
  winRate: number
  feedbackCounts: Record<string, number>
  outcomeCounts: Record<LeadOutcomeStatus, number>
  matchScoreBuckets: MatchScoreBucket[]
  topSalesAngles: SalesAnglePerformance[]
}

export interface ProductLearningAnalytics {
  productId: string
  productName: string
  totalAnalyzedLeads: number
  averageMatchScore: number
  feedbackAccuracy: number
  replyRate: number
  meetingRate: number
  winRate: number
}

export interface SalesLearningAnalyticsRepository {
  list(
    userId: string,
    filters?: SalesLearningFilters,
  ): Promise<SalesLearningRecord[]>
}

const prismaRepository: SalesLearningAnalyticsRepository = {
  async list(userId, filters) {
    const rows = await prisma.leadResearch.findMany({
      where: {
        lead: {
          userId,
          ...(filters?.industry ? { industry: filters.industry } : {}),
          ...(filters?.region ? { region: filters.region } : {}),
        },
      },
      select: {
        id: true,
        matchScore: true,
        recommendedAngle: true,
        leadCategory: true,
        productProfileId: true,
        productProfile: {
          select: { productName: true },
        },
        feedbacks: {
          where: { userId },
          select: { feedbackType: true },
          take: 1,
        },
        lead: {
          select: {
            industry: true,
            region: true,
            country: true,
            outcome: {
              select: { status: true },
            },
          },
        },
      },
    })

    return rows.map((row) => ({
      researchId: row.id,
      matchScore: row.matchScore,
      recommendedAngle: row.recommendedAngle,
      feedbackType: row.feedbacks[0]?.feedbackType ?? null,
      outcomeStatus: row.lead.outcome?.status ?? null,
      productProfileId: row.productProfileId,
      productName: row.productProfile?.productName ?? null,
      leadCategory: row.leadCategory,
      country: row.lead.country,
      industry: row.lead.industry,
      region: row.lead.region,
    }))
  },
}

type UserResolver = () => Promise<{ id: string }>

const FEEDBACK_TYPES = [
  'accurate',
  'inaccurate',
  'useful',
  'not_useful',
] as const

const OUTCOME_STATUSES = Object.values(LeadOutcomeStatus)
const REPLIED_STAGES = new Set<LeadOutcomeStatus>([
  LeadOutcomeStatus.REPLIED,
  LeadOutcomeStatus.MEETING,
  LeadOutcomeStatus.QUALIFIED,
  LeadOutcomeStatus.PROPOSAL,
  LeadOutcomeStatus.WON,
])
const MEETING_STAGES = new Set<LeadOutcomeStatus>([
  LeadOutcomeStatus.MEETING,
  LeadOutcomeStatus.QUALIFIED,
  LeadOutcomeStatus.PROPOSAL,
  LeadOutcomeStatus.WON,
])

export class SalesLearningAnalyticsService {
  constructor(
    private readonly repository: SalesLearningAnalyticsRepository =
      prismaRepository,
    private readonly resolveUser: UserResolver = ensureDemoUser,
  ) {}

  async overview(
    filters?: SalesLearningFilters,
  ): Promise<SalesLearningOverview> {
    return this.aggregate(await this.records(filters))
  }

  async products(): Promise<ProductLearningAnalytics[]> {
    const records = await this.records()
    const groups = new Map<string, SalesLearningRecord[]>()

    for (const record of records) {
      if (!record.productProfileId || !record.productName) continue
      const current = groups.get(record.productProfileId) ?? []
      current.push(record)
      groups.set(record.productProfileId, current)
    }

    return [...groups.entries()]
      .map(([productId, productRecords]) => {
        const overview = this.aggregate(productRecords)
        return {
          productId,
          productName: productRecords[0]?.productName ?? 'Unknown',
          totalAnalyzedLeads: overview.totalAnalyzedLeads,
          averageMatchScore: overview.averageMatchScore,
          feedbackAccuracy: overview.feedbackAccuracy,
          replyRate: overview.replyRate,
          meetingRate: overview.meetingRate,
          winRate: overview.winRate,
        }
      })
      .sort(
        (left, right) =>
          right.winRate - left.winRate ||
          right.replyRate - left.replyRate ||
          right.totalAnalyzedLeads - left.totalAnalyzedLeads,
      )
  }

  async records(
    filters?: SalesLearningFilters,
  ): Promise<SalesLearningRecord[]> {
    const user = await this.resolveUser()
    return this.repository.list(user.id, filters)
  }

  aggregate(records: SalesLearningRecord[]): SalesLearningOverview {
    const total = records.length
    const feedbackCounts = Object.fromEntries(
      FEEDBACK_TYPES.map((type) => [type, 0]),
    ) as Record<string, number>
    const outcomeCounts = Object.fromEntries(
      OUTCOME_STATUSES.map((status) => [status, 0]),
    ) as Record<LeadOutcomeStatus, number>

    for (const record of records) {
      if (record.feedbackType) {
        feedbackCounts[record.feedbackType] =
          (feedbackCounts[record.feedbackType] ?? 0) + 1
      }
      if (record.outcomeStatus) outcomeCounts[record.outcomeStatus] += 1
    }

    const feedbackTotal = Object.values(feedbackCounts).reduce(
      (sum, count) => sum + count,
      0,
    )
    const positiveFeedback =
      feedbackCounts.accurate + feedbackCounts.useful

    return {
      totalAnalyzedLeads: total,
      averageMatchScore: this.averageMatchScore(records),
      feedbackAccuracy: this.rate(positiveFeedback, feedbackTotal),
      replyRate: this.outcomeRate(records, REPLIED_STAGES),
      meetingRate: this.outcomeRate(records, MEETING_STAGES),
      winRate: this.outcomeRate(
        records,
        new Set([LeadOutcomeStatus.WON]),
      ),
      feedbackCounts,
      outcomeCounts,
      matchScoreBuckets: this.matchScoreBuckets(records),
      topSalesAngles: this.salesAnglePerformance(records),
    }
  }

  private matchScoreBuckets(
    records: SalesLearningRecord[],
  ): MatchScoreBucket[] {
    const definitions: Array<{
      range: MatchScoreBucket['range']
      minimum: number
      maximum: number
    }> = [
      { range: '80-100', minimum: 80, maximum: 100 },
      { range: '60-79', minimum: 60, maximum: 79 },
      { range: '40-59', minimum: 40, maximum: 59 },
      { range: '0-39', minimum: 0, maximum: 39 },
    ]

    return definitions.map(({ range, minimum, maximum }) => {
      const bucket = records.filter(
        (record) =>
          record.matchScore !== null &&
          record.matchScore >= minimum &&
          record.matchScore <= maximum,
      )
      return {
        range,
        totalAnalyzedLeads: bucket.length,
        replyRate: this.outcomeRate(bucket, REPLIED_STAGES),
        meetingRate: this.outcomeRate(bucket, MEETING_STAGES),
        winRate: this.outcomeRate(
          bucket,
          new Set([LeadOutcomeStatus.WON]),
        ),
      }
    })
  }

  private salesAnglePerformance(
    records: SalesLearningRecord[],
  ): SalesAnglePerformance[] {
    const groups = new Map<string, SalesLearningRecord[]>()
    for (const record of records) {
      const angle = record.recommendedAngle?.trim()
      if (!angle || angle.toLowerCase() === 'unknown') continue
      const current = groups.get(angle) ?? []
      current.push(record)
      groups.set(angle, current)
    }

    return [...groups.entries()]
      .map(([angle, angleRecords]) => ({
        angle,
        totalAnalyzedLeads: angleRecords.length,
        replyRate: this.outcomeRate(angleRecords, REPLIED_STAGES),
        meetingRate: this.outcomeRate(angleRecords, MEETING_STAGES),
        winRate: this.outcomeRate(
          angleRecords,
          new Set([LeadOutcomeStatus.WON]),
        ),
      }))
      .sort(
        (left, right) =>
          right.winRate - left.winRate ||
          right.replyRate - left.replyRate ||
          right.totalAnalyzedLeads - left.totalAnalyzedLeads,
      )
      .slice(0, 5)
  }

  private averageMatchScore(records: SalesLearningRecord[]): number {
    const scores = records
      .map((record) => record.matchScore)
      .filter((score): score is number => score !== null)
    if (!scores.length) return 0
    return this.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length,
      2,
    )
  }

  private outcomeRate(
    records: SalesLearningRecord[],
    stages: ReadonlySet<LeadOutcomeStatus>,
  ): number {
    return this.rate(
      records.filter(
        (record) =>
          record.outcomeStatus !== null &&
          stages.has(record.outcomeStatus),
      ).length,
      records.length,
    )
  }

  private rate(numerator: number, denominator: number): number {
    return denominator ? this.round(numerator / denominator, 4) : 0
  }

  private round(value: number, decimals: number): number {
    const scale = 10 ** decimals
    return Math.round(value * scale) / scale
  }
}

export const salesLearningAnalytics = new SalesLearningAnalyticsService()
