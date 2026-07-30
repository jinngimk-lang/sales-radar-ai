import type { OpportunityCustomerGoal } from '../contracts/opportunity.contract.js'
import {
  RADAR_ASSESSMENT_VERSION,
  type RadarAssessment,
  type RadarAssessmentInput,
  type RadarCustomerGoal,
  type RadarReasonCode,
  type RadarRecommendedAction,
  type RadarRiskLevel,
  type RadarScoreBreakdown,
} from '../contracts/radar-assessment.contract.js'
import { opportunityDetection } from './opportunity-detection.service.js'

const TITLE_EVENT_PATTERN =
  /\b(?:invest(?:s|ed|ing|ment)?|capital expenditure|capex)\b|\b(?:factory|plant|manufacturing site|production site|production line|production capacity)\s+(?:expansion|expanded|expands?|extension|increase)|\b(?:expansion|extension|increase)\s+of\s+(?:a\s+|its\s+|our\s+|the\s+)?(?:new\s+)?(?:factory|plant|manufacturing site|production site|production line|production capacity)|\b(?:expand(?:s|ed|ing)?|open(?:s|ed|ing)?|build(?:s|ing)?)\s+(?:a\s+|its\s+|the\s+)?(?:new\s+)?(?:factory|plant|manufacturing site|production line|production capacity)|\b(?:digital transformation|factory digitization|factory digitalisation|smart factory|digital factory|industrial iot|iiot|manufacturing execution system|mes deployment|production system upgrade|digital upgrade|automation upgrade)\b/i

const MIN_BODY_LENGTH = 80

export class RadarAssessmentService {
  assess(input: RadarAssessmentInput): RadarAssessment {
    const customerGoal = this.customerGoal(input.userIntentSnapshot)
    const productContext = {
      ...(input.userIntentSnapshot.productContext ?? {}),
      customerType: this.customerTypeForGoal(customerGoal),
    }
    const detection = opportunityDetection.assess({
      provider: input.evidence.provider,
      sourceUrl: input.evidence.rawUrl,
      title: input.evidence.title,
      content: input.evidence.content,
      rawMetadata: input.evidence.rawMetadata,
      explicitCompanyName: input.evidence.companyName,
      productContext,
    })
    const content = input.evidence.content.replace(/\s+/g, ' ').trim()
    const title = input.evidence.title?.replace(/\s+/g, ' ').trim() ?? ''
    const hasRealSource = this.isRealSource(
      input.evidence.provider,
      input.evidence.rawUrl,
    )
    const hasBody = content.length >= MIN_BODY_LENGTH
    // Opportunity Detection v2 only awards eventSignal for an event found in
    // the body. Reuse that guarded result so Radar cannot drift into a looser
    // title-based event detector.
    const bodyHasEvent = detection.scoreBreakdown.eventSignal > 0
    const titleHasEvent = Boolean(title && TITLE_EVENT_PATTERN.test(title))
    const scoreBreakdown = this.scoreBreakdown(
      input,
      detection.scoreBreakdown,
      detection.entityRole,
      customerGoal,
      hasRealSource,
      hasBody,
      bodyHasEvent,
    )
    const reasonCodes = this.uniqueReasons([
      ...detection.reasons,
      this.goalReason(customerGoal),
      ...this.statusReasons(input),
    ])

    if (!hasRealSource || !hasBody || this.isRejectedEvidence(input)) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'BLOCKED',
        'REVIEW_SOURCE',
        'HIGH',
        scoreBreakdown,
        reasonCodes,
      )
    }

    if (titleHasEvent && !bodyHasEvent) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'NEEDS_REVIEW',
        'REVIEW_SOURCE',
        'HIGH',
        scoreBreakdown,
        [...reasonCodes, 'TITLE_ONLY_EVENT_BLOCKED'],
      )
    }

    if (!bodyHasEvent) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'MARKET_SIGNAL_ONLY',
        'MONITOR_SIGNAL',
        'MEDIUM',
        scoreBreakdown,
        [...reasonCodes, 'MARKET_SIGNAL_RETAINED'],
      )
    }

    const roleFit = scoreBreakdown.match.entityRoleFit
    if (customerGoal !== 'UNKNOWN' && roleFit === 0) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'MARKET_SIGNAL_ONLY',
        this.mismatchAction(customerGoal),
        'MEDIUM',
        scoreBreakdown,
        [
          ...reasonCodes,
          'USER_INTENT_MISMATCH',
          'MARKET_SIGNAL_RETAINED',
        ],
      )
    }

    if (!input.evidence.companyName?.trim()) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'POTENTIAL_OPPORTUNITY',
        'VERIFY_ENTITY',
        'HIGH',
        scoreBreakdown,
        [...reasonCodes, 'ENTITY_VERIFICATION_REQUIRED'],
      )
    }

    if (detection.entityRole === 'UNKNOWN') {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'POTENTIAL_OPPORTUNITY',
        'VERIFY_ROLE',
        'MEDIUM',
        scoreBreakdown,
        [...reasonCodes, 'ROLE_VERIFICATION_REQUIRED'],
      )
    }

    if (detection.passed) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'OPPORTUNITY_CREATED',
        'CONTACT_RESEARCH',
        this.riskLevel(scoreBreakdown),
        scoreBreakdown,
        [...reasonCodes, 'USER_INTENT_MATCH'],
      )
    }

    if (scoreBreakdown.match.total >= 45) {
      return this.result(
        input,
        detection.entityRole,
        customerGoal,
        'POTENTIAL_OPPORTUNITY',
        'VERIFY_ROLE',
        'MEDIUM',
        scoreBreakdown,
        [...reasonCodes, 'USER_INTENT_NEEDS_REVIEW'],
      )
    }

    return this.result(
      input,
      detection.entityRole,
      customerGoal,
      'NEEDS_REVIEW',
      'MONITOR_SIGNAL',
      'HIGH',
      scoreBreakdown,
      [...reasonCodes, 'USER_INTENT_NEEDS_REVIEW'],
    )
  }

  private scoreBreakdown(
    input: RadarAssessmentInput,
    detection: {
      evidenceQuality: number
      eventSignal: number
      productRelevance: number
      identityConfidence: number
      roleFit: number
    },
    entityRole: RadarAssessment['entityRole'],
    customerGoal: RadarCustomerGoal,
    hasRealSource: boolean,
    hasBody: boolean,
    bodyHasEvent: boolean,
  ): RadarScoreBreakdown {
    const evidenceQuality = this.evidenceQuality(
      input,
      hasRealSource,
      hasBody,
    )
    const eventSignal = bodyHasEvent
      ? this.clamp(detection.eventSignal, 0, 30)
      : 0
    const identityConfidence = this.identityConfidence(input)
    const confidenceTotal = this.clamp(
      evidenceQuality + eventSignal + identityConfidence,
      0,
      100,
    )
    const productRelevance = Math.round(
      (this.clamp(detection.productRelevance, 0, 20) / 20) * 35,
    )
    const entityRoleFit = this.entityRoleFit(entityRole, customerGoal)
    const userIntentFit = this.userIntentFit(input, customerGoal)
    const eventRelevance =
      bodyHasEvent && productRelevance > 0
        ? 10
        : bodyHasEvent
          ? 5
          : 0
    const matchTotal = this.clamp(
      productRelevance +
        entityRoleFit +
        userIntentFit +
        eventRelevance,
      0,
      100,
    )

    return {
      confidence: {
        evidenceQuality,
        eventSignal,
        identityConfidence,
        total: confidenceTotal,
      },
      match: {
        productRelevance,
        entityRoleFit,
        userIntentFit,
        eventRelevance,
        total: matchTotal,
      },
    }
  }

  private evidenceQuality(
    input: RadarAssessmentInput,
    hasRealSource: boolean,
    hasBody: boolean,
  ) {
    if (!hasRealSource) return 0
    let score = 18
    if (hasBody) score += 17
    if (input.evidence.evidenceStatus === 'VALID') score += 10
    else if (input.evidence.evidenceStatus !== 'REJECTED') score += 5
    return this.clamp(score, 0, 45)
  }

  private identityConfidence(input: RadarAssessmentInput) {
    const rawConfidence = this.clamp(
      input.evidence.identityConfidence ?? 0,
      0,
      100,
    )
    let score = Math.round((rawConfidence / 100) * 25)
    if (
      input.evidence.identityStatus === 'VERIFIED' &&
      input.evidence.companyName?.trim()
    ) {
      score = Math.max(score, 20)
    } else if (input.evidence.companyName?.trim()) {
      score = Math.max(score, 12)
    }
    return this.clamp(score, 0, 25)
  }

  private entityRoleFit(
    role: RadarAssessment['entityRole'],
    goal: RadarCustomerGoal,
  ) {
    if (goal === 'UNKNOWN' || goal === 'EXPLORE_MARKET') return 15
    if (role === 'UNKNOWN') return 10
    if (
      (goal === 'FIND_BUYERS' && role === 'END_CUSTOMER') ||
      (goal === 'FIND_SUPPLIERS' && role === 'SUPPLIER') ||
      (goal === 'FIND_PARTNERS' && role === 'PARTNER') ||
      (goal === 'FIND_DISTRIBUTORS' && role === 'DISTRIBUTOR') ||
      (goal === 'RESEARCH_COMPETITORS' && role === 'COMPETITOR')
    ) {
      return 30
    }
    if (
      goal === 'FIND_PARTNERS' &&
      (role === 'DISTRIBUTOR' || role === 'SUPPLIER')
    ) {
      return role === 'DISTRIBUTOR' ? 24 : 18
    }
    return 0
  }

  private userIntentFit(
    input: RadarAssessmentInput,
    goal: RadarCustomerGoal,
  ) {
    const context = input.userIntentSnapshot.productContext
    if (
      !context ||
      !Object.values(context).some((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      )
    ) {
      return 0
    }
    return goal === 'UNKNOWN' ? 12 : 25
  }

  private customerGoal(
    snapshot: RadarAssessmentInput['userIntentSnapshot'],
  ): RadarCustomerGoal {
    const explicit = snapshot.customerGoal
      ?.toLowerCase()
      .replace(/[\s-]+/g, '_')
    const explicitGoals: Record<string, RadarCustomerGoal> = {
      buyer: 'FIND_BUYERS',
      buyers: 'FIND_BUYERS',
      find_buyer: 'FIND_BUYERS',
      find_buyers: 'FIND_BUYERS',
      supplier: 'FIND_SUPPLIERS',
      suppliers: 'FIND_SUPPLIERS',
      find_supplier: 'FIND_SUPPLIERS',
      find_suppliers: 'FIND_SUPPLIERS',
      partner: 'FIND_PARTNERS',
      partners: 'FIND_PARTNERS',
      find_partner: 'FIND_PARTNERS',
      find_partners: 'FIND_PARTNERS',
      distributor: 'FIND_DISTRIBUTORS',
      distributors: 'FIND_DISTRIBUTORS',
      find_distributor: 'FIND_DISTRIBUTORS',
      find_distributors: 'FIND_DISTRIBUTORS',
      competitor: 'RESEARCH_COMPETITORS',
      competitors: 'RESEARCH_COMPETITORS',
      research_competitors: 'RESEARCH_COMPETITORS',
      explore_market: 'EXPLORE_MARKET',
      unknown: 'UNKNOWN',
    }
    if (explicit && explicitGoals[explicit]) return explicitGoals[explicit]

    const relationship = snapshot.relationship?.toLowerCase() ?? ''
    if (/\b(?:supplier|sourcing|vendor)\b/.test(relationship)) {
      return 'FIND_SUPPLIERS'
    }
    if (/\b(?:partner|partnership|cooperation)\b/.test(relationship)) {
      return 'FIND_PARTNERS'
    }
    if (/\b(?:distributor|reseller|dealer|channel)\b/.test(relationship)) {
      return 'FIND_DISTRIBUTORS'
    }
    if (
      snapshot.salesIntent === 'customer' ||
      snapshot.targetType === 'buyer'
    ) {
      return 'FIND_BUYERS'
    }
    if (snapshot.salesIntent === 'partnership') return 'FIND_PARTNERS'
    if (snapshot.salesIntent === 'channel') return 'FIND_DISTRIBUTORS'
    return 'UNKNOWN'
  }

  private customerTypeForGoal(goal: RadarCustomerGoal): string | undefined {
    const mapping: Partial<Record<RadarCustomerGoal, string>> = {
      FIND_BUYERS: 'Buyer companies',
      FIND_SUPPLIERS: 'Suppliers',
      FIND_PARTNERS: 'Partners',
      FIND_DISTRIBUTORS: 'Distributors',
      RESEARCH_COMPETITORS: 'Competitors',
    }
    return mapping[goal]
  }

  private goalReason(goal: RadarCustomerGoal): RadarReasonCode {
    const mapping: Record<RadarCustomerGoal, RadarReasonCode> = {
      FIND_BUYERS: 'USER_GOAL_BUYER',
      FIND_SUPPLIERS: 'USER_GOAL_SUPPLIER',
      FIND_PARTNERS: 'USER_GOAL_PARTNER',
      FIND_DISTRIBUTORS: 'USER_GOAL_DISTRIBUTOR',
      RESEARCH_COMPETITORS: 'USER_GOAL_COMPETITOR',
      EXPLORE_MARKET: 'USER_GOAL_MARKET_EXPLORATION',
      UNKNOWN: 'USER_GOAL_UNKNOWN',
    }
    return mapping[goal]
  }

  private statusReasons(input: RadarAssessmentInput): RadarReasonCode[] {
    const reasons: RadarReasonCode[] = []
    if (input.evidence.evidenceStatus === 'VALID') {
      reasons.push('EVIDENCE_STATUS_VALID')
    }
    if (input.evidence.evidenceStatus === 'REJECTED') {
      reasons.push('EVIDENCE_STATUS_REJECTED')
    }
    if (input.evidence.identityStatus === 'VERIFIED') {
      reasons.push('IDENTITY_STATUS_VERIFIED')
    }
    return reasons
  }

  private mismatchAction(
    goal: RadarCustomerGoal,
  ): RadarRecommendedAction {
    return goal === 'FIND_PARTNERS' || goal === 'FIND_DISTRIBUTORS'
      ? 'CHECK_PARTNERSHIP'
      : 'VERIFY_ROLE'
  }

  private riskLevel(score: RadarScoreBreakdown): RadarRiskLevel {
    if (
      score.confidence.total >= 75 &&
      score.match.total >= 70
    ) {
      return 'LOW'
    }
    if (
      score.confidence.total >= 55 &&
      score.match.total >= 45
    ) {
      return 'MEDIUM'
    }
    return 'HIGH'
  }

  private isRejectedEvidence(input: RadarAssessmentInput) {
    return input.evidence.evidenceStatus === 'REJECTED'
  }

  private isRealSource(provider: string, sourceUrl: string) {
    if (provider.trim().toLowerCase() === 'mock') return false
    try {
      const parsed = new URL(sourceUrl)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  private result(
    input: RadarAssessmentInput,
    entityRole: RadarAssessment['entityRole'],
    customerGoal: RadarCustomerGoal,
    decision: RadarAssessment['decision'],
    recommendedAction: RadarRecommendedAction,
    riskLevel: RadarRiskLevel,
    scoreBreakdown: RadarScoreBreakdown,
    reasonCodes: RadarReasonCode[],
  ): RadarAssessment {
    return {
      assessmentVersion: RADAR_ASSESSMENT_VERSION,
      searchEvidenceId: input.evidence.id,
      entityRole,
      customerGoal,
      decision,
      recommendedAction,
      confidenceScore: scoreBreakdown.confidence.total,
      matchScore: scoreBreakdown.match.total,
      riskLevel,
      reasonCodes: this.uniqueReasons(reasonCodes),
      scoreBreakdown,
    }
  }

  private uniqueReasons(reasons: RadarReasonCode[]) {
    return [...new Set(reasons)]
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
  }
}

export const radarAssessment = new RadarAssessmentService()
