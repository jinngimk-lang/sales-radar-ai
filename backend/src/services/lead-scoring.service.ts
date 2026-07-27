import {
  CustomerType,
  Platform,
  RecommendedAction,
} from '@prisma/client'

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface LeadScoringInput {
  platform: Platform
  sourceUrl: string
  rawContent: string
  sourceMetadata?: Record<string, unknown>
  customerType?: CustomerType
  fallbackIntentScore?: number
}

export interface LeadScoringResult {
  intentScore: number
  buyingSignal: string[]
  urgencyLevel: UrgencyLevel
  recommendedAction: RecommendedAction
  confidence: number
}

interface ScoringRule {
  pattern: RegExp
  signal: string
  weight: number
}

const EXPLICIT_BUYING_RULES: ScoringRule[] = [
  {
    pattern:
      /\b(looking for|seeking|need|require)\b.{0,100}\b(supplier|vendor|manufacturer|product|solution|system)\b/i,
    signal: 'Explicit supplier or product requirement',
    weight: 42,
  },
  {
    pattern: /\b(recommend|suggest)\b.{0,80}\b(supplier|vendor|product|solution|system)\b/i,
    signal: 'Requesting supplier or product recommendations',
    weight: 38,
  },
  {
    pattern: /\b(where|how)\s+(?:can|could|do)\s+(?:i|we)\s+buy\b/i,
    signal: 'Asking where to buy',
    weight: 44,
  },
  {
    pattern: /\b(rfq|request for quote|requesting a quote|quotation|price quote)\b/i,
    signal: 'Requesting commercial quotation',
    weight: 48,
  },
  {
    pattern: /\b(procurement|purchasing|sourcing|shortlisting vendors?)\b/i,
    signal: 'Active procurement process',
    weight: 34,
  },
]

const TECHNICAL_HELP_RULES: ScoringRule[] = [
  {
    pattern:
      /\b(help|issue|problem|troubleshoot|error|failure|downtime|not working)\b/i,
    signal: 'Technical problem requiring assistance',
    weight: 30,
  },
  {
    pattern:
      /\b(integrat|compatib|configuration|installation|maintenance|repair|replace)\w*\b/i,
    signal: 'Technical integration or maintenance need',
    weight: 26,
  },
]

const PRODUCT_DISCUSSION_RULES: ScoringRule[] = [
  {
    pattern:
      /\b(compare|comparison|review|experience with|thoughts on|pros and cons)\b/i,
    signal: 'Product evaluation discussion',
    weight: 20,
  },
  {
    pattern:
      /\b(automation|robot|equipment|machine|software|platform|product|system)\b/i,
    signal: 'Relevant product discussion',
    weight: 14,
  },
]

const INFORMATIONAL_RULES: ScoringRule[] = [
  {
    pattern:
      /\b(news|press release|announces?|announcement|overview|introduction|explained|tutorial|history of|what is)\b/i,
    signal: 'Informational or educational content',
    weight: -16,
  },
  {
    pattern:
      /\b(company profile|corporate video|about us|factory tour|brand story)\b/i,
    signal: 'Company promotional content',
    weight: -12,
  },
]

const SOCIAL_HOSTS = [
  'reddit.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'linkedin.com',
  'xiaohongshu.com',
]

export class LeadScoringService {
  score(input: LeadScoringInput): LeadScoringResult {
    const text = input.rawContent.trim()
    if (!text) return this.fallback(input.fallbackIntentScore)
    const buyingSignals: string[] = []
    const matchedWeights: number[] = []

    this.applyRules(text, EXPLICIT_BUYING_RULES, buyingSignals, matchedWeights)
    this.applyRules(text, TECHNICAL_HELP_RULES, buyingSignals, matchedWeights)
    this.applyRules(text, PRODUCT_DISCUSSION_RULES, buyingSignals, matchedWeights)
    this.applyRules(text, INFORMATIONAL_RULES, buyingSignals, matchedWeights)

    const metadataSignal = this.readMetadataSignals(input.sourceMetadata)
    for (const signal of metadataSignal) {
      if (!buyingSignals.includes(signal)) buyingSignals.push(signal)
    }

    const procurementIntent =
      /\b(procurement|purchasing|sourcing|buy(?:ing)?|purchase|rfq|request(?:ing)? (?:a )?quote|quotation|need|require)\b/i.test(
        text,
      )
    const supplierSeeking =
      /\b(looking for|seeking|need|require|recommend|suggest|shortlisting|where can (?:i|we) buy)\b.{0,100}\b(supplier|vendor|manufacturer|partner|solution|system|product)\b/i.test(
        text,
      )
    const jobTitle = this.readMetadataString(input.sourceMetadata, [
      'jobTitle',
      'position',
      'role',
    ])
    const website = this.readMetadataString(input.sourceMetadata, [
      'companyWebsite',
      'website',
      'companyDomain',
      'domain',
    ])
    const location = this.readMetadataString(input.sourceMetadata, [
      'location',
      'country',
      'countryName',
    ])

    if (
      matchedWeights.length === 0 &&
      metadataSignal.length === 0 &&
      !jobTitle &&
      !website &&
      !location
    ) {
      return this.fallback(input.fallbackIntentScore)
    }

    let intentScore = 10
    if (procurementIntent) {
      intentScore += 30
      buyingSignals.push('Procurement intent detected')
    }
    if (supplierSeeking) {
      intentScore += 25
      buyingSignals.push('Actively seeking a supplier')
    }
    if (jobTitle) intentScore += 15
    if (website) intentScore += 15
    if (location) intentScore += 10
    intentScore += this.sourceWeight(input, procurementIntent || supplierSeeking)

    const isTechnicalHelp = TECHNICAL_HELP_RULES.some((rule) =>
      rule.pattern.test(text),
    )
    const isProductDiscussion = PRODUCT_DISCUSSION_RULES.some((rule) =>
      rule.pattern.test(text),
    )
    const isInformational = INFORMATIONAL_RULES.some((rule) =>
      rule.pattern.test(text),
    )
    if (!procurementIntent && !supplierSeeking && isTechnicalHelp) {
      intentScore += 25
    } else if (
      !procurementIntent &&
      !supplierSeeking &&
      isProductDiscussion &&
      !isInformational
    ) {
      intentScore += 35
    }
    if (isInformational) intentScore -= 15

    if (
      /\b(urgent|immediately|as soon as possible|asap|this week|this month)\b/i.test(
        text,
      )
    ) {
      buyingSignals.push('Time-sensitive requirement')
      intentScore += 12
    }

    intentScore = this.clamp(intentScore)
    const confidence = this.clamp(
      42 +
        Math.min(matchedWeights.length * 8, 32) +
        (procurementIntent ? 8 : 0) +
        (supplierSeeking ? 8 : 0) +
        (jobTitle ? 6 : 0) +
        (website ? 6 : 0) +
        (location ? 4 : 0) +
        (metadataSignal.length > 0 ? 8 : 0),
    )

    return {
      intentScore,
      buyingSignal: [...new Set(buyingSignals)],
      urgencyLevel: this.urgency(intentScore),
      recommendedAction: this.recommend(intentScore),
      confidence,
    }
  }

  private applyRules(
    text: string,
    rules: ScoringRule[],
    signals: string[],
    weights: number[],
  ): void {
    for (const rule of rules) {
      if (!rule.pattern.test(text)) continue
      signals.push(rule.signal)
      weights.push(rule.weight)
    }
  }

  private sourceWeight(
    input: LeadScoringInput,
    hasPositiveSignal: boolean,
  ): number {
    if (input.platform === Platform.Reddit) {
      return hasPositiveSignal ? 5 : 2
    }
    if (input.platform === Platform.YouTube) {
      return input.customerType === CustomerType.Company ? 5 : 2
    }
    if (this.isOfficialWebsite(input.sourceUrl)) return 5
    return hasPositiveSignal ? 5 : 0
  }

  private isOfficialWebsite(sourceUrl: string): boolean {
    try {
      const hostname = new URL(sourceUrl).hostname
        .toLowerCase()
        .replace(/^www\./, '')
      return !SOCIAL_HOSTS.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`),
      )
    } catch {
      return false
    }
  }

  private readMetadataSignals(
    metadata: Record<string, unknown> | undefined,
  ): string[] {
    if (!metadata) return []
    const value = metadata.buyingSignal
    if (Array.isArray(value)) {
      return value.filter(
        (signal): signal is string =>
          typeof signal === 'string' &&
          Boolean(signal.trim()) &&
          signal !== 'No explicit buying signal detected',
      )
    }
    if (
      typeof value === 'string' &&
      value.trim() &&
      value !== 'No explicit buying signal detected'
    ) {
      return [value.trim()]
    }
    return []
  }

  private readMetadataString(
    metadata: Record<string, unknown> | undefined,
    keys: string[],
  ): string | null {
    if (!metadata) return null
    const sources: Record<string, unknown>[] = [metadata]
    const original = metadata.originalMetadata
    if (original && typeof original === 'object' && !Array.isArray(original)) {
      sources.push(original as Record<string, unknown>)
      const data = (original as Record<string, unknown>).data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        sources.push(data as Record<string, unknown>)
      }
    }
    for (const key of keys) {
      for (const source of sources) {
        const value = source[key]
        if (
          typeof value === 'string' &&
          value.trim() &&
          !/^(?:unknown|n\/?a|none|null)$/i.test(value.trim())
        ) {
          return value.trim()
        }
      }
    }
    return null
  }

  private fallback(value: number | undefined): LeadScoringResult {
    const intentScore = this.clamp(
      typeof value === 'number' && Number.isFinite(value) ? value : 50,
    )
    return {
      intentScore,
      buyingSignal: [],
      urgencyLevel: this.urgency(intentScore),
      recommendedAction:
        intentScore >= 80
          ? RecommendedAction.contact_now
          : RecommendedAction.follow_up,
      confidence: 30,
    }
  }

  private urgency(score: number): UrgencyLevel {
    if (score >= 80) return 'CRITICAL'
    if (score >= 70) return 'HIGH'
    if (score >= 45) return 'MEDIUM'
    return 'LOW'
  }

  private recommend(score: number): RecommendedAction {
    if (score >= 75) return RecommendedAction.contact_now
    if (score >= 45) return RecommendedAction.follow_up
    if (score >= 35) return RecommendedAction.nurture
    return RecommendedAction.monitor
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)))
  }
}

export const leadScoring = new LeadScoringService()
