import { createHash } from 'node:crypto'
import { OpportunityType } from '@prisma/client'
import {
  CURRENT_OPPORTUNITY_DETECTION_VERSION,
  type OpportunityDetectionInput,
  type OpportunityDetectionResult,
} from '../contracts/opportunity.contract.js'

interface OpportunityRule {
  type: OpportunityType
  pattern: RegExp
  label: string
}

const RULES: OpportunityRule[] = [
  {
    type: OpportunityType.INVESTMENT,
    pattern:
      /\b(?:invest(?:s|ed|ing|ment)?|capital expenditure|capex|commits?\s+(?:€|£|\$|usd|eur|gbp)?\s*[\d,.]+\s*(?:million|billion|m|bn)?)\b/i,
    label: 'investment',
  },
  {
    type: OpportunityType.COMPANY_EXPANSION,
    pattern:
      /\b(?:factory|plant|manufacturing site|production site|production line|production capacity)\s+(?:expansion|expanded|expands?|extension|increase)|\b(?:expand(?:s|ed|ing)?|open(?:s|ed|ing)?|build(?:s|ing)?)\s+(?:a\s+|its\s+|the\s+)?(?:new\s+)?(?:factory|plant|manufacturing site|production line|production capacity)\b/i,
    label: 'company expansion',
  },
  {
    type: OpportunityType.DIGITAL_UPGRADE,
    pattern:
      /\b(?:digital transformation|factory digitization|factory digitalisation|smart factory|digital factory|industrial iot|iiot|manufacturing execution system|mes deployment|production system upgrade|digital upgrade)\b/i,
    label: 'digital upgrade',
  },
]

const GENERIC_COMPANY_NAMES = new Set([
  'automation technology',
  'industrial manufacturing',
  'manufacturing companies',
  'oem manufacturing',
  'software solutions',
])

const CONTEXT_STOP_WORDS = new Set([
  'and',
  'announcing',
  'business',
  'companies',
  'company',
  'customer',
  'customers',
  'find',
  'for',
  'from',
  'into',
  'sell',
  'the',
  'with',
])

export class OpportunityDetectionService {
  detect(
    input: OpportunityDetectionInput,
  ): OpportunityDetectionResult | null {
    if (input.provider.trim().toLowerCase() === 'mock') return null
    if (!this.isHttpUrl(input.sourceUrl)) return null

    const content = input.content.replace(/\s+/g, ' ').trim()
    const title = input.title?.replace(/\s+/g, ' ').trim() || ''
    if (content.length < 80) return null
    if (!input.productContext || !this.hasProductContext(input.productContext)) {
      return null
    }

    const searchable = `${title}. ${content}`
    const rule = RULES.find((candidate) =>
      candidate.pattern.test(searchable),
    )
    if (!rule) return null

    const relevance = this.contextRelevance(
      searchable,
      rule.type,
      input.productContext,
      input.rawMetadata,
    )
    if (!relevance.passed) return null

    const companyName = this.companyName(input, title)
    const excerpt = this.evidenceExcerpt(searchable, rule.pattern)
    let confidence = 40
    confidence += 10
    confidence += relevance.score
    if (title && rule.pattern.test(title)) confidence += 10
    if (companyName) confidence += 15
    if (
      rule.type === OpportunityType.INVESTMENT &&
      /(?:€|£|\$|usd|eur|gbp)\s*[\d,.]+|[\d,.]+\s*(?:million|billion|m|bn)\b/i.test(
        searchable,
      )
    ) {
      confidence += 10
    }
    confidence = Math.min(100, confidence)
    if (confidence < 60) return null

    const product =
      input.productContext.product ||
      input.productContext.industry ||
      'the selected product context'
    const evidenceTitle =
      title || excerpt.split(/[.!?](?:\s|$)/)[0]?.trim() || rule.label

    return {
      type: rule.type,
      dedupeKey: this.dedupeKey(
        rule.type,
        companyName,
        input.sourceUrl,
      ),
      companyName,
      title: evidenceTitle.slice(0, 240),
      summary: excerpt,
      whyItMatters:
        `The source contains an explicit ${rule.label} signal relevant to ${product}. ` +
        'This is a sales research opportunity, not confirmation of procurement.',
      recommendedNextStep: this.recommendedNextStep(rule.type),
      confidence,
      evidenceExcerpt: excerpt,
      detectionVersion: CURRENT_OPPORTUNITY_DETECTION_VERSION,
    }
  }

  private hasProductContext(
    context: NonNullable<OpportunityDetectionInput['productContext']>,
  ) {
    return Boolean(
      context.product ||
        context.industry ||
        context.region ||
        context.businessProblem ||
        context.buyingSignals?.length,
    )
  }

  private contextRelevance(
    searchable: string,
    type: OpportunityType,
    context: NonNullable<OpportunityDetectionInput['productContext']>,
    metadata: OpportunityDetectionInput['rawMetadata'],
  ) {
    const normalized = searchable.toLowerCase()
    const signals = context.buyingSignals ?? []
    const eventSignalMatch = signals.some((signal) => {
      const value = signal.toLowerCase()
      if (
        type === OpportunityType.COMPANY_EXPANSION &&
        /\b(expansion|new factory|new plant|capacity)\b/.test(value)
      ) {
        return true
      }
      if (
        type === OpportunityType.INVESTMENT &&
        /\b(investment|capex|funding)\b/.test(value)
      ) {
        return true
      }
      return (
        type === OpportunityType.DIGITAL_UPGRADE &&
        /\b(digital|upgrade|moderni[sz]ation|technology)\b/.test(value)
      )
    })
    const contextTerms = [
      context.product,
      context.industry,
      context.businessProblem,
      ...signals,
    ]
      .filter((value): value is string => Boolean(value))
      .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
      .filter(
        (value) =>
          value.length >= 4 && !CONTEXT_STOP_WORDS.has(value),
      )
    const termMatches = new Set(
      contextTerms.filter((term) => normalized.includes(term)),
    ).size

    const metadataRecord =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {}
    const region = context.region?.toLowerCase()
    const regionMatch = Boolean(
      region &&
        [metadataRecord.region, metadataRecord.country]
          .filter((value): value is string => typeof value === 'string')
          .some((value) => value.toLowerCase().includes(region)),
    )

    return {
      passed: eventSignalMatch || termMatches > 0 || regionMatch,
      score: eventSignalMatch
        ? 20
        : termMatches >= 2
          ? 15
          : termMatches === 1 || regionMatch
            ? 10
            : 0,
    }
  }

  private companyName(input: OpportunityDetectionInput, title: string) {
    const explicit = this.meaningfulCompany(input.explicitCompanyName)
    if (explicit) return explicit

    const metadata =
      input.rawMetadata &&
      typeof input.rawMetadata === 'object' &&
      !Array.isArray(input.rawMetadata)
        ? (input.rawMetadata as Record<string, unknown>)
        : {}
    for (const key of ['companyName', 'organizationName', 'organization']) {
      const value = metadata[key]
      if (typeof value === 'string') {
        const company = this.meaningfulCompany(value)
        if (company) return company
      }
    }

    const titleSubject = title.match(
      /^([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3})\s+(?:announces?|invests?|plans?|expands?|launches?|commits?|unveils?|to\s+(?:invest|expand|upgrade|build|open))\b/,
    )?.[1]
    return this.meaningfulCompany(titleSubject)
  }

  private meaningfulCompany(value: string | null | undefined) {
    if (!value) return null
    const normalized = value.replace(/\s+/g, ' ').trim()
    const semantic = normalized.toLowerCase().replace(/[.,]/g, '')
    if (
      normalized.length < 2 ||
      normalized.length > 120 ||
      GENERIC_COMPANY_NAMES.has(semantic) ||
      /^(unknown|website source|news|article)$/i.test(normalized)
    ) {
      return null
    }
    return normalized
  }

  private evidenceExcerpt(searchable: string, pattern: RegExp) {
    const match = pattern.exec(searchable)
    const start = Math.max(0, (match?.index ?? 0) - 140)
    const end = Math.min(
      searchable.length,
      (match?.index ?? 0) + (match?.[0].length ?? 0) + 300,
    )
    return searchable.slice(start, end).trim().slice(0, 600)
  }

  private recommendedNextStep(type: OpportunityType) {
    if (type === OpportunityType.INVESTMENT) {
      return 'Verify the investment scope, affected facilities, timeline, and operational stakeholders before outreach.'
    }
    if (type === OpportunityType.COMPANY_EXPANSION) {
      return 'Research the expanded facility, production scope, project timeline, and responsible operations or engineering team.'
    }
    return 'Verify the upgrade program, systems in scope, implementation stage, and responsible digital or operations team.'
  }

  private dedupeKey(
    type: OpportunityType,
    companyName: string | null,
    sourceUrl: string,
  ) {
    return createHash('sha256')
      .update(
        `${type}|${companyName?.toLowerCase() ?? 'unknown'}|${sourceUrl.toLowerCase()}`,
      )
      .digest('hex')
  }

  private isHttpUrl(value: string) {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }
}

export const opportunityDetection = new OpportunityDetectionService()
