import {
  salesLearningAnalytics,
  type SalesLearningAnalyticsService,
  type SalesLearningOverview,
  type SalesLearningRecord,
} from './sales-learning-analytics.service.js'

export type LearningInsightType =
  | 'product'
  | 'market'
  | 'sales_angle'
  | 'lead_quality'

export type LearningInsightConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface LearningInsight {
  id: string
  type: LearningInsightType
  title: string
  summary: string
  confidence: LearningInsightConfidence
  sampleSize: number
  metrics: {
    averageMatchScore: number
    feedbackAccuracy: number
    replyRate: number
    meetingRate: number
    winRate: number
  }
  dimensions: {
    productId?: string
    productName?: string
    leadCategory?: string
    region?: string
    industry?: string
    salesAngle?: string
    scoreRange?: string
  }
}

interface SalesLearningInsightDataSource {
  records(): Promise<SalesLearningRecord[]>
  aggregate(records: SalesLearningRecord[]): SalesLearningOverview
}

interface InsightCandidate {
  key: string
  label: string
  records: SalesLearningRecord[]
  dimensions: LearningInsight['dimensions']
}

export class SalesLearningInsightService {
  constructor(
    private readonly dataSource: SalesLearningInsightDataSource =
      salesLearningAnalytics as SalesLearningAnalyticsService,
  ) {}

  async insights(): Promise<LearningInsight[]> {
    const records = await this.dataSource.records()
    if (!records.length) return []

    return [
      this.productInsight(records),
      this.marketInsight(records),
      this.salesAngleInsight(records),
      this.leadQualityInsight(records),
    ].filter((insight): insight is LearningInsight => insight !== null)
  }

  private productInsight(
    records: SalesLearningRecord[],
  ): LearningInsight | null {
    const candidates = this.group(
      records.filter(
        (record) => record.productProfileId && record.productName,
      ),
      (record) => `${record.productProfileId}:${record.leadCategory}`,
      (record) => `${record.productName} · ${record.leadCategory}`,
      (record) => ({
        productId: record.productProfileId ?? undefined,
        productName: record.productName ?? undefined,
        leadCategory: record.leadCategory,
      }),
    )
    const best = this.best(candidates)
    if (!best) return null

    return this.toInsight(
      'product',
      best,
      `${best.label} 客户值得优先观察`,
      '该产品与客户类型组合的历史回复表现',
    )
  }

  private marketInsight(
    records: SalesLearningRecord[],
  ): LearningInsight | null {
    const candidates = this.group(
      records,
      (record) => `${record.region}:${record.industry}`,
      (record) => `${record.region} · ${record.industry}`,
      (record) => ({
        region: record.region,
        industry: record.industry,
      }),
    )
    const best = this.best(candidates)
    if (!best) return null

    return this.toInsight(
      'market',
      best,
      `${best.label} 市场表现值得关注`,
      '该地区与行业组合的历史回复表现',
    )
  }

  private salesAngleInsight(
    records: SalesLearningRecord[],
  ): LearningInsight | null {
    const candidates = this.group(
      records.filter((record) => {
        const angle = record.recommendedAngle?.trim()
        return Boolean(angle && angle.toLowerCase() !== 'unknown')
      }),
      (record) => record.recommendedAngle?.trim() ?? '',
      (record) => record.recommendedAngle?.trim() ?? 'Unknown',
      (record) => ({
        salesAngle: record.recommendedAngle?.trim(),
      }),
    )
    const best = this.best(candidates)
    if (!best) return null

    return this.toInsight(
      'sales_angle',
      best,
      `“${best.label}”切入角度表现较好`,
      '使用该销售角度的历史 Lead 回复表现',
    )
  }

  private leadQualityInsight(
    records: SalesLearningRecord[],
  ): LearningInsight | null {
    const highScoreRecords = records.filter(
      (record) => record.matchScore !== null && record.matchScore >= 80,
    )
    if (!highScoreRecords.length) return null

    return this.toInsight(
      'lead_quality',
      {
        key: '80-100',
        label: '高匹配度 Lead',
        records: highScoreRecords,
        dimensions: { scoreRange: '80-100' },
      },
      '高匹配度 Lead 的真实推进表现值得关注',
      'matchScore 80–100 的历史 Lead 推进表现',
    )
  }

  private toInsight(
    type: LearningInsightType,
    candidate: InsightCandidate,
    title: string,
    observation: string,
  ): LearningInsight {
    const overview = this.dataSource.aggregate(candidate.records)
    const confidence = this.confidence(candidate.records.length)
    const replyPercent = this.percent(overview.replyRate)
    const winPercent = this.percent(overview.winRate)
    const wording =
      confidence === 'LOW'
        ? `样本仅 ${candidate.records.length} 条，当前只作为观察信号`
        : confidence === 'MEDIUM'
          ? `基于 ${candidate.records.length} 条历史样本，初步显示`
          : `基于 ${candidate.records.length} 条历史样本，持续显示`

    return {
      id: `${type}:${candidate.key}`,
      type,
      title:
        confidence === 'LOW' ? `${candidate.label} 尚待更多数据验证` : title,
      summary: `${wording}：${observation}为 ${replyPercent}，成功率为 ${winPercent}。`,
      confidence,
      sampleSize: candidate.records.length,
      metrics: {
        averageMatchScore: overview.averageMatchScore,
        feedbackAccuracy: overview.feedbackAccuracy,
        replyRate: overview.replyRate,
        meetingRate: overview.meetingRate,
        winRate: overview.winRate,
      },
      dimensions: candidate.dimensions,
    }
  }

  private group(
    records: SalesLearningRecord[],
    keyFor: (record: SalesLearningRecord) => string,
    labelFor: (record: SalesLearningRecord) => string,
    dimensionsFor: (
      record: SalesLearningRecord,
    ) => LearningInsight['dimensions'],
  ): InsightCandidate[] {
    const groups = new Map<string, InsightCandidate>()
    for (const record of records) {
      const key = keyFor(record)
      const existing = groups.get(key)
      if (existing) existing.records.push(record)
      else {
        groups.set(key, {
          key,
          label: labelFor(record),
          records: [record],
          dimensions: dimensionsFor(record),
        })
      }
    }
    return [...groups.values()]
  }

  private best(candidates: InsightCandidate[]): InsightCandidate | null {
    return (
      [...candidates].sort((left, right) => {
        const leftOverview = this.dataSource.aggregate(left.records)
        const rightOverview = this.dataSource.aggregate(right.records)
        return (
          rightOverview.replyRate - leftOverview.replyRate ||
          rightOverview.winRate - leftOverview.winRate ||
          right.records.length - left.records.length
        )
      })[0] ?? null
    )
  }

  private confidence(sampleSize: number): LearningInsightConfidence {
    if (sampleSize >= 20) return 'HIGH'
    if (sampleSize >= 8) return 'MEDIUM'
    return 'LOW'
  }

  private percent(rate: number): string {
    return `${Math.round(rate * 100)}%`
  }
}

export const salesLearningInsights = new SalesLearningInsightService()
