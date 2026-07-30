import { createHash } from 'node:crypto'
import { OpportunityType } from '@prisma/client'
import {
  CURRENT_OPPORTUNITY_DETECTION_VERSION,
  type OpportunityCustomerGoal,
  type OpportunityDetectionAssessment,
  type OpportunityDetectionInput,
  type OpportunityDetectionResult,
  type OpportunityEntityRole,
  type OpportunityReasonCode,
  type OpportunityScoreBreakdown,
} from '../contracts/opportunity.contract.js'
import {
  productContextNormalization,
  type NormalizedOpportunityProductContext,
} from './product-context-normalization.service.js'

interface OpportunityRule {
  type: OpportunityType
  pattern: RegExp
  label: string
}

interface RelevanceAssessment {
  passed: boolean
  score: number
  reasons: OpportunityReasonCode[]
}

interface RoleAssessment {
  score: number
  blocked: boolean
  reasons: OpportunityReasonCode[]
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
      /\b(?:factory|plant|manufacturing site|production site|production line|production capacity)\s+(?:expansion|expanded|expands?|extension|increase)|\b(?:expansion|extension|increase)\s+of\s+(?:a\s+|its\s+|our\s+|the\s+)?(?:new\s+)?(?:factory|plant|manufacturing site|production site|production line|production capacity)|\b(?:expand(?:s|ed|ing)?|open(?:s|ed|ing)?|build(?:s|ing)?)\s+(?:a\s+|its\s+|the\s+)?(?:new\s+)?(?:factory|plant|manufacturing site|production line|production capacity)\b/i,
    label: 'company expansion',
  },
  {
    type: OpportunityType.DIGITAL_UPGRADE,
    pattern:
      /\b(?:digital transformation|factory digitization|factory digitalisation|smart factory|digital factory|industrial iot|iiot|manufacturing execution system|mes deployment|production system upgrade|digital upgrade|automation upgrade)\b/i,
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

const PACKAGING_SUPPLIER_PATTERN =
  /\b(?:(?:packaging|packing)\s+(?:machine|machinery|equipment|system|line)\s+(?:manufacturer|supplier|provider|producer)|(?:manufacturer|supplier|provider|producer)\s+of\s+(?:packaging|packing)\s+(?:machines?|machinery|equipment|systems?|lines?)|we\s+(?:design|manufacture|supply|sell|provide)\s+(?:packaging|packing)\s+(?:machines?|machinery|equipment|systems?|lines?)|our\s+(?:packaging|packing)\s+(?:machines?|machinery|equipment|systems?))\b/i

const GENERAL_VENDOR_PATTERN =
  /\b(?:book a demo|request a demo|request a quote|our (?:software|platform|solution)|solutions? for manufacturers|authorized supplier)\b/i

const DISTRIBUTOR_PATTERN =
  /\b(?:authorized distributor|exclusive distributor|regional distributor|distributor of|reseller of|authorized dealer|dealer network|distribution partner)\b/i

const PARTNER_PATTERN =
  /\b(?:system integrator|integration partner|technology partner|implementation partner|strategic partner|partner network)\b/i

const END_CUSTOMER_PATTERN =
  /\b(?:our (?:factory|factories|plant|plants|production facilit(?:y|ies)|manufacturing operations)|we (?:produce|process|package|bottle)|food manufacturer|beverage producer|pharmaceutical manufacturer|consumer goods manufacturer|factory operator)\b/i

const OPPORTUNITY_THRESHOLD = 60

export class OpportunityDetectionService {
  detect(
    input: OpportunityDetectionInput,
  ): OpportunityDetectionResult | null {
    return this.assess(input).result
  }

  assess(input: OpportunityDetectionInput): OpportunityDetectionAssessment {
    const emptyScore = this.emptyScore()
    if (input.provider.trim().toLowerCase() === 'mock') {
      return this.blocked(
        emptyScore,
        'UNKNOWN',
        'UNKNOWN',
        ['MOCK_SOURCE_BLOCKED'],
      )
    }
    if (!this.isHttpUrl(input.sourceUrl)) {
      return this.blocked(
        emptyScore,
        'UNKNOWN',
        'UNKNOWN',
        ['INVALID_SOURCE_URL'],
      )
    }

    const content = input.content.replace(/\s+/g, ' ').trim()
    const title = input.title?.replace(/\s+/g, ' ').trim() || ''
    if (content.length < 80) {
      return this.blocked(
        emptyScore,
        'UNKNOWN',
        'UNKNOWN',
        ['REAL_SOURCE_AVAILABLE', 'EVIDENCE_CONTENT_INSUFFICIENT'],
      )
    }
    if (!input.productContext || !this.hasProductContext(input.productContext)) {
      return this.blocked(
        emptyScore,
        'UNKNOWN',
        'UNKNOWN',
        [
          'REAL_SOURCE_AVAILABLE',
          'EVIDENCE_CONTENT_SUFFICIENT',
          'PRODUCT_CONTEXT_MISSING',
        ],
      )
    }

    const normalizedContext = productContextNormalization.normalize(
      input.productContext,
    )
    const entityRole = this.entityRole(input, normalizedContext)
    const evidence = this.evidenceScore(input, content)
    const rule = RULES.find((candidate) => candidate.pattern.test(content))

    if (!rule) {
      return this.blocked(
        {
          ...emptyScore,
          evidenceQuality: evidence.score,
        },
        entityRole,
        normalizedContext.customerGoal,
        [...evidence.reasons, this.roleReason(entityRole), 'BODY_EVENT_MISSING'],
      )
    }

    const event = this.eventScore(rule, content, title)
    const relevance = this.contextRelevance(
      content,
      rule.type,
      normalizedContext,
      input.rawMetadata,
    )
    const identity = this.identity(input)
    const role = this.roleFit(entityRole, normalizedContext.customerGoal)
    const scoreBreakdown: OpportunityScoreBreakdown = {
      evidenceQuality: evidence.score,
      eventSignal: event.score,
      productRelevance: relevance.score,
      identityConfidence: identity.score,
      roleFit: role.score,
    }
    const reasons = this.uniqueReasons([
      ...evidence.reasons,
      ...event.reasons,
      ...relevance.reasons,
      ...identity.reasons,
      this.roleReason(entityRole),
      ...role.reasons,
    ])
    const confidence = this.totalScore(scoreBreakdown)

    if (role.blocked) {
      return this.blocked(
        scoreBreakdown,
        entityRole,
        normalizedContext.customerGoal,
        reasons,
      )
    }
    if (!relevance.passed) {
      return this.blocked(
        scoreBreakdown,
        entityRole,
        normalizedContext.customerGoal,
        [...reasons, 'PRODUCT_RELEVANCE_INSUFFICIENT'],
      )
    }
    if (confidence < OPPORTUNITY_THRESHOLD) {
      return this.blocked(
        scoreBreakdown,
        entityRole,
        normalizedContext.customerGoal,
        [...reasons, 'OPPORTUNITY_SCORE_INSUFFICIENT'],
      )
    }

    const companyName = identity.companyName
    const excerpt = this.evidenceExcerpt(content, rule.pattern)
    const product =
      input.productContext.product ||
      input.productContext.industry ||
      'the selected product context'
    const evidenceTitle =
      title || excerpt.split(/[.!?](?:\s|$)/)[0]?.trim() || rule.label
    const result: OpportunityDetectionResult = {
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
      entityRole,
      customerGoal: normalizedContext.customerGoal,
      scoreBreakdown,
      reasons,
    }

    return {
      passed: true,
      entityRole,
      customerGoal: normalizedContext.customerGoal,
      confidence,
      scoreBreakdown,
      reasons,
      result,
    }
  }

  private evidenceScore(input: OpportunityDetectionInput, content: string) {
    const reasons: OpportunityReasonCode[] = [
      'REAL_SOURCE_AVAILABLE',
      'EVIDENCE_CONTENT_SUFFICIENT',
    ]
    let score = 10
    score += content.length >= 200 ? 8 : 6
    if (this.hasSourceTimestamp(input.rawMetadata)) {
      score += 2
      reasons.push('EVIDENCE_TIMESTAMP_AVAILABLE')
    }
    return { score: Math.min(20, score), reasons }
  }

  private eventScore(rule: OpportunityRule, content: string, title: string) {
    const reasons: OpportunityReasonCode[] = [
      this.eventReason(rule.type, content),
      'BODY_EVENT_CONFIRMED',
    ]
    let score = 22
    if (title && rule.pattern.test(title)) {
      score += 3
      reasons.push('TITLE_EVENT_CORROBORATED')
    }
    if (this.hasStrongEventDetail(rule.type, content)) score += 5
    return { score: Math.min(30, score), reasons }
  }

  private contextRelevance(
    content: string,
    type: OpportunityType,
    context: NormalizedOpportunityProductContext,
    metadata: OpportunityDetectionInput['rawMetadata'],
  ): RelevanceAssessment {
    const normalized = content.toLowerCase()
    const reasons: OpportunityReasonCode[] = []
    let score = 0

    if (
      context.productFamilyTerms.some((term) =>
        normalized.includes(term),
      )
    ) {
      score += 8
      reasons.push('PRODUCT_FAMILY_MATCH')
    }
    if (
      context.targetIndustryTerms.some((term) =>
        normalized.includes(term),
      )
    ) {
      score += 6
      reasons.push('TARGET_INDUSTRY_MATCH')
    }

    const termMatches = new Set(
      context.contextTerms.filter((term) => normalized.includes(term)),
    ).size
    if (termMatches > 0) {
      score += termMatches >= 2 ? 6 : 4
      reasons.push('PRODUCT_CONTEXT_MATCH')
    }

    if (this.eventSignalMatches(type, context.original.buyingSignals ?? [])) {
      score += 6
      reasons.push('PRODUCT_CONTEXT_MATCH')
    }
    if (this.regionMatches(context.original.region, metadata)) {
      score += 4
      reasons.push('REGION_CONTEXT_MATCH')
    }

    score = Math.min(20, score)
    return {
      passed: score >= 4,
      score,
      reasons: this.uniqueReasons(reasons),
    }
  }

  private identity(input: OpportunityDetectionInput) {
    const explicit = this.meaningfulCompany(input.explicitCompanyName)
    if (explicit) {
      return {
        companyName: explicit,
        score: 10,
        reasons: ['EXPLICIT_COMPANY_IDENTITY'] as OpportunityReasonCode[],
      }
    }

    const metadata = this.metadataRecord(input.rawMetadata)
    for (const key of ['companyName', 'organizationName', 'organization']) {
      const value = metadata[key]
      if (typeof value === 'string') {
        const company = this.meaningfulCompany(value)
        if (company) {
          return {
            companyName: company,
            score: 8,
            reasons: [
              'EXPLICIT_COMPANY_IDENTITY',
            ] as OpportunityReasonCode[],
          }
        }
      }
    }

    return {
      companyName: null,
      score: 0,
      reasons: ['IDENTITY_NEEDS_REVIEW'] as OpportunityReasonCode[],
    }
  }

  private entityRole(
    input: OpportunityDetectionInput,
    context: NormalizedOpportunityProductContext,
  ): OpportunityEntityRole {
    const metadata = this.metadataRecord(input.rawMetadata)
    const explicit = this.explicitEntityRole(metadata)
    if (explicit) return explicit

    const content = input.content.replace(/\s+/g, ' ')
    if (DISTRIBUTOR_PATTERN.test(content)) return 'DISTRIBUTOR'
    if (
      PACKAGING_SUPPLIER_PATTERN.test(content) ||
      (context.productFamily === 'UNKNOWN' &&
        GENERAL_VENDOR_PATTERN.test(content))
    ) {
      return 'SUPPLIER'
    }
    if (PARTNER_PATTERN.test(content)) return 'PARTNER'
    if (END_CUSTOMER_PATTERN.test(content)) return 'END_CUSTOMER'
    return 'UNKNOWN'
  }

  private explicitEntityRole(
    metadata: Record<string, unknown>,
  ): OpportunityEntityRole | null {
    for (const key of ['entityRole', 'customerType', 'companyType']) {
      const value = metadata[key]
      if (typeof value !== 'string') continue
      const normalized = value.toLowerCase().replace(/[_-]+/g, ' ').trim()
      if (/\b(?:end customer|buyer|customer|end user)\b/.test(normalized)) {
        return 'END_CUSTOMER'
      }
      if (/\b(?:supplier|vendor|provider)\b/.test(normalized)) {
        return 'SUPPLIER'
      }
      if (/\b(?:distributor|reseller|dealer|channel)\b/.test(normalized)) {
        return 'DISTRIBUTOR'
      }
      if (/\b(?:partner|integrator)\b/.test(normalized)) return 'PARTNER'
      if (/\bcompetitor\b/.test(normalized)) return 'COMPETITOR'
    }
    return null
  }

  private roleFit(
    role: OpportunityEntityRole,
    goal: OpportunityCustomerGoal,
  ): RoleAssessment {
    if (goal === 'UNKNOWN') {
      return {
        score: 10,
        blocked: false,
        reasons: ['TARGET_ROLE_UNKNOWN'],
      }
    }
    if (role === 'UNKNOWN') {
      return {
        score: 8,
        blocked: false,
        reasons: ['TARGET_ROLE_UNKNOWN'],
      }
    }

    const exactMatch =
      (goal === 'BUYER' && role === 'END_CUSTOMER') ||
      (goal === 'SUPPLIER' && role === 'SUPPLIER') ||
      (goal === 'PARTNER' && role === 'PARTNER') ||
      (goal === 'DISTRIBUTOR' && role === 'DISTRIBUTOR') ||
      (goal === 'COMPETITOR' && role === 'COMPETITOR')
    if (exactMatch) {
      return { score: 20, blocked: false, reasons: ['TARGET_ROLE_MATCH'] }
    }

    if (
      goal === 'PARTNER' &&
      (role === 'DISTRIBUTOR' || role === 'SUPPLIER')
    ) {
      return { score: role === 'DISTRIBUTOR' ? 16 : 12, blocked: false, reasons: ['TARGET_ROLE_MATCH'] }
    }
    if (
      goal === 'DISTRIBUTOR' &&
      (role === 'PARTNER' || role === 'SUPPLIER')
    ) {
      return { score: 12, blocked: false, reasons: ['TARGET_ROLE_MATCH'] }
    }

    const reasons: OpportunityReasonCode[] = ['TARGET_ROLE_MISMATCH']
    if (goal === 'BUYER' && role === 'SUPPLIER') {
      reasons.push('SUPPLIER_PAGE_BLOCKED')
    }
    return { score: 0, blocked: true, reasons }
  }

  private roleReason(role: OpportunityEntityRole): OpportunityReasonCode {
    const reasons: Record<OpportunityEntityRole, OpportunityReasonCode> = {
      END_CUSTOMER: 'ENTITY_ROLE_END_CUSTOMER',
      SUPPLIER: 'ENTITY_ROLE_SUPPLIER',
      PARTNER: 'ENTITY_ROLE_PARTNER',
      DISTRIBUTOR: 'ENTITY_ROLE_DISTRIBUTOR',
      COMPETITOR: 'ENTITY_ROLE_COMPETITOR',
      UNKNOWN: 'ENTITY_ROLE_UNKNOWN',
    }
    return reasons[role]
  }

  private eventReason(
    type: OpportunityType,
    content: string,
  ): OpportunityReasonCode {
    if (type === OpportunityType.INVESTMENT) return 'INVESTMENT_SIGNAL'
    if (type === OpportunityType.COMPANY_EXPANSION) {
      return /\b(?:new|build(?:s|ing)?|open(?:s|ed|ing)?)\s+(?:a\s+|its\s+|the\s+)?(?:new\s+)?(?:factory|plant)\b/i.test(
        content,
      )
        ? 'NEW_FACTORY_SIGNAL'
        : 'FACTORY_EXPANSION_SIGNAL'
    }
    return /\b(?:automation upgrade|smart factory|industrial iot|iiot|manufacturing execution system|mes deployment)\b/i.test(
      content,
    )
      ? 'AUTOMATION_UPGRADE_SIGNAL'
      : 'DIGITAL_UPGRADE_SIGNAL'
  }

  private hasStrongEventDetail(type: OpportunityType, content: string) {
    if (type === OpportunityType.INVESTMENT) {
      return /(?:€|£|\$|usd|eur|gbp)\s*[\d,.]+|[\d,.]+\s*(?:million|billion|m|bn)\b/i.test(
        content,
      )
    }
    if (type === OpportunityType.COMPANY_EXPANSION) {
      return /\b(?:new factory|new plant|new production line|production capacity|construction timeline|project timeline)\b/i.test(
        content,
      )
    }
    return /\b(?:automation|smart factory|industrial iot|iiot|manufacturing execution system|mes)\b/i.test(
      content,
    )
  }

  private eventSignalMatches(type: OpportunityType, signals: string[]) {
    return signals.some((signal) => {
      const value = signal.toLowerCase()
      if (type === OpportunityType.COMPANY_EXPANSION) {
        return /\b(expansion|new factory|new plant|capacity)\b/.test(value)
      }
      if (type === OpportunityType.INVESTMENT) {
        return /\b(investment|capex|funding)\b/.test(value)
      }
      return /\b(digital|upgrade|moderni[sz]ation|technology|automation)\b/.test(
        value,
      )
    })
  }

  private regionMatches(
    region: string | undefined,
    metadata: OpportunityDetectionInput['rawMetadata'],
  ) {
    if (!region) return false
    const expected = region.toLowerCase()
    const record = this.metadataRecord(metadata)
    return [record.region, record.country]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLowerCase().includes(expected))
  }

  private hasSourceTimestamp(metadata: unknown) {
    const record = this.metadataRecord(metadata)
    return ['publishedAt', 'publishedDate', 'date', 'capturedAt'].some(
      (key) => typeof record[key] === 'string' && Boolean(record[key]),
    )
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

  private evidenceExcerpt(content: string, pattern: RegExp) {
    const match = pattern.exec(content)
    const start = Math.max(0, (match?.index ?? 0) - 140)
    const end = Math.min(
      content.length,
      (match?.index ?? 0) + (match?.[0].length ?? 0) + 300,
    )
    return content.slice(start, end).trim().slice(0, 600)
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

  private metadataRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private totalScore(score: OpportunityScoreBreakdown) {
    return Math.min(
      100,
      score.evidenceQuality +
        score.eventSignal +
        score.productRelevance +
        score.identityConfidence +
        score.roleFit,
    )
  }

  private emptyScore(): OpportunityScoreBreakdown {
    return {
      evidenceQuality: 0,
      eventSignal: 0,
      productRelevance: 0,
      identityConfidence: 0,
      roleFit: 0,
    }
  }

  private blocked(
    scoreBreakdown: OpportunityScoreBreakdown,
    entityRole: OpportunityEntityRole,
    customerGoal: OpportunityCustomerGoal,
    reasons: OpportunityReasonCode[],
  ): OpportunityDetectionAssessment {
    return {
      passed: false,
      entityRole,
      customerGoal,
      confidence: this.totalScore(scoreBreakdown),
      scoreBreakdown,
      reasons: this.uniqueReasons(reasons),
      result: null,
    }
  }

  private uniqueReasons(reasons: OpportunityReasonCode[]) {
    return [...new Set(reasons)]
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
