import {
  IntentLevel,
  RecommendedAction,
  type Lead,
} from '@prisma/client'

export interface MockAIAnalysisResult {
  intentType: string
  intentScore: number
  tags: string[]
  suggestion: string
  background: string
  need: string
  purchaseProbability: IntentLevel
  salesStrategy: string
  reasoning: string
  needKeywords: string[]
  recommendedScript: string
  contactAdvice: string
  recommendedAction: RecommendedAction
  profile: {
    company: string | null
    jobTitle: string | null
    country: string
    industry: string
    platform: string
  }
}

export class MockAIAnalyzer {
  analyze(lead: Lead): MockAIAnalysisResult {
    const keywordWeight = Math.min(lead.interestTags.length * 4, 16)
    const contentWeight = /buy|purchase|supplier|procurement|quote|pricing/i.test(
      lead.postContent,
    )
      ? 18
      : 8
    const intentScore = Math.min(
      100,
      Math.max(lead.intentScore, 52 + keywordWeight + contentWeight),
    )
    const purchaseProbability =
      intentScore >= 80
        ? IntentLevel.high
        : intentScore >= 60
          ? IntentLevel.medium
          : IntentLevel.low
    const recommendedAction =
      intentScore >= 80
        ? RecommendedAction.contact_now
        : intentScore >= 60
          ? RecommendedAction.follow_up
          : RecommendedAction.nurture
    const company = lead.company ?? 'the prospect company'
    const need = `寻找与 ${lead.interestTags.join('、') || lead.industry} 相关的可靠供应方案`

    return {
      intentType: '采购需求',
      intentScore,
      tags: lead.interestTags,
      suggestion:
        intentScore >= 80
          ? '建议在 24 小时内优先联系，并提供针对性案例和初步报价。'
          : '建议先分享相关案例，再确认预算、数量和交付时间。',
      background: `${lead.displayName} 来自 ${company}，位于 ${lead.country}，通过 ${lead.platform} 表达了潜在采购需求。`,
      need,
      purchaseProbability,
      salesStrategy: '以需求确认切入，使用行业案例建立信任，再提供分级报价和明确交付计划。',
      reasoning: `内容中出现采购或供应商相关信号，结合 ${lead.interestTags.length} 个兴趣标签，Mock 模型给出 ${intentScore}/100。`,
      needKeywords: lead.interestTags,
      recommendedScript: `Hi ${lead.displayName}, I noticed that ${company} is evaluating solutions related to ${lead.interestTags[0] ?? lead.industry}. We have relevant experience and can share a concise proposal with pricing and delivery options. Would a short call this week be useful?`,
      contactAdvice:
        intentScore >= 80
          ? '优先通过原平台私信，并在获得许可后转邮件跟进；首次联系应附一项相关案例。'
          : '先在原平台轻量互动，确认具体需求后再发送完整方案。',
      recommendedAction,
      profile: {
        company: lead.company,
        jobTitle: lead.jobTitle,
        country: lead.country,
        industry: lead.industry,
        platform: lead.platform,
      },
    }
  }
}

export const mockAIAnalyzer = new MockAIAnalyzer()
