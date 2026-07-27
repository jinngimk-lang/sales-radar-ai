import {
  type CustomerType,
  type Industry,
  type Platform,
  Prisma,
} from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { toSafeJson } from './safe-json.service.js'
import type { AIProvider } from '../providers/ai-platform/ai-provider.interface.js'
import { aiProviderFactory } from '../providers/ai-platform/ai-provider.factory.js'
import { AITaskType } from '../providers/ai-platform/ai-task-type.js'
import { aiResponseParser, type AIResponseParser } from './ai-response-parser.service.js'
import { aiUsageLogs, type AIUsageLogService } from './ai-usage-log.service.js'
import {
  promptTemplates,
  type PromptTemplateService,
} from './prompt-template.service.js'

export interface ResearchableLead {
  id: string
  userId?: string
  company: string | null
  industry: Industry
  customerType: CustomerType
  jobTitle: string | null
  platform: Platform
  sourceUrl: string
  country: string
  postContent: string
  sourceMetadata: Prisma.JsonValue | null
}

export interface LeadResearchAIResult {
  matchScore: number
  purchaseLikelihood: string
  industryFit: string
  businessFit: string
  recommendedAngle: string
  contactReason: string
  riskFactors: string[]
  evidence: string[]
}

export interface ProductResearchContext {
  id: string
  userId: string
  productName: string
  category: string
  industry: string
  applications: string[]
  keywords: string[]
  buyerPersona: Prisma.JsonValue
  buyerKeywords: string[]
  buyingSignals: string[]
  painPoints: string[]
  valueAngles: string[]
}

export interface LeadResearchResult {
  companySummary: string
  industry: string
  companyType: string
  customerPersona: string
  painPoints: string[]
  buyingSignals: string[]
  communicationStyle: string
  recommendedApproach: string
  confidenceScore: number
  leadQuality: 'high' | 'medium' | 'low'
  leadCategory: 'buyer' | 'company' | 'person' | 'content' | 'community'
  salesRecommendation: 'contact_now' | 'nurture' | 'ignore'
  qualityReason: string
  companyProfile: {
    companyType: string
    industry: string
    businessModel: string
    estimatedRole: string
    location: string
    evidence: string[]
  }
  buyingSignalDetails: Array<{
    signal: string
    evidence: string
    confidence: number
  }>
  salesAngle: {
    recommendedApproach: string
    painPoint: string
    valueProposition: string
    firstMessageHook: string
  }
  outreachPlan: {
    emailSubject: string
    openingLine: string
    body: string
    cta: string
    linkedinMessage: string
    whatsappMessage: string
    followUpCadence: string[]
  }
  priority: 'A' | 'B' | 'C'
  intelligenceVersion: 1
  productProfileId?: string | null
  matchScore?: number
  purchaseLikelihood?: string
  industryFit?: string
  businessFit?: string
  recommendedAngle?: string
  contactReason?: string
  riskFactors?: string[]
  evidence?: string[]
  provider?: string
  model?: string
  generatedAt?: Date
}

export interface LeadResearchRepository {
  findLead(id: string): Promise<ResearchableLead | null>
  findResearch(leadId: string): Promise<unknown | null>
  createResearch(
    leadId: string,
    result: LeadResearchResult,
  ): Promise<unknown>
  updateResearch(
    leadId: string,
    result: LeadResearchResult,
  ): Promise<unknown>
  findProductProfile?(
    id: string,
    userId?: string,
  ): Promise<ProductResearchContext | null>
}

const UNKNOWN = 'Unknown'

const prismaRepository: LeadResearchRepository = {
  findLead(id) {
    return prisma.lead.findUnique({ where: { id } })
  },
  findResearch(leadId) {
    return prisma.leadResearch.findUnique({ where: { leadId } })
  },
  createResearch(leadId, result) {
    return prisma.leadResearch.create({
      data: {
        leadId,
        ...result,
        painPoints: toSafeJson(result.painPoints),
        buyingSignals: toSafeJson(result.buyingSignals),
        companyProfile: toSafeJson(result.companyProfile),
        buyingSignalDetails: toSafeJson(result.buyingSignalDetails),
        salesAngle: toSafeJson(result.salesAngle),
        outreachPlan: toSafeJson(result.outreachPlan),
        riskFactors:
          result.riskFactors === undefined
            ? undefined
            : toSafeJson(result.riskFactors),
        evidence:
          result.evidence === undefined
            ? undefined
            : toSafeJson(result.evidence),
      },
    })
  },
  updateResearch(leadId, result) {
    return prisma.leadResearch.update({
      where: { leadId },
      data: {
        ...result,
        painPoints: toSafeJson(result.painPoints),
        buyingSignals: toSafeJson(result.buyingSignals),
        companyProfile: toSafeJson(result.companyProfile),
        buyingSignalDetails: toSafeJson(result.buyingSignalDetails),
        salesAngle: toSafeJson(result.salesAngle),
        outreachPlan: toSafeJson(result.outreachPlan),
        riskFactors:
          result.riskFactors === undefined
            ? undefined
            : toSafeJson(result.riskFactors),
        evidence:
          result.evidence === undefined
            ? undefined
            : toSafeJson(result.evidence),
      },
    })
  },
  findProductProfile(id, userId) {
    return prisma.productProfile.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
    })
  },
}

export class LeadResearchService {
  constructor(
    private readonly repository: LeadResearchRepository = prismaRepository,
    private readonly provider: AIProvider = aiProviderFactory.resolve(
      AITaskType.LEAD_RESEARCH,
    ),
    private readonly fallbackProvider: AIProvider =
      aiProviderFactory.getFallback(),
    private readonly promptService: PromptTemplateService = promptTemplates,
    private readonly parser: AIResponseParser = aiResponseParser,
    private readonly usageLogs: AIUsageLogService = aiUsageLogs,
  ) {}

  async get(leadId: string): Promise<unknown> {
    const research = await this.repository.findResearch(leadId)
    if (!research) {
      throw new AppError(
        404,
        'LEAD_RESEARCH_NOT_FOUND',
        'Lead research not found',
      )
    }
    return research
  }

  async research(leadId: string): Promise<unknown> {
    const existing = await this.repository.findResearch(leadId)
    if (existing && this.isCurrentIntelligence(existing)) return existing

    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')

    const result = this.analyze(lead)
    if (existing) return this.repository.updateResearch(leadId, result)
    try {
      return await this.repository.createResearch(leadId, result)
    } catch (error) {
      // The unique leadId constraint resolves concurrent double clicks.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.repository.findResearch(leadId)
        if (concurrent) return concurrent
      }
      throw error
    }
  }

  async researchAI(
    leadId: string,
    productProfileId?: string,
  ): Promise<unknown> {
    const existing = await this.repository.findResearch(leadId)
    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')

    const product = productProfileId
      ? await this.repository.findProductProfile?.(
          productProfileId,
          lead.userId,
        )
      : null
    if (productProfileId && !product) {
      throw new AppError(
        404,
        'PRODUCT_PROFILE_NOT_FOUND',
        'Product profile not found for this Lead owner',
      )
    }

    const baseResult = this.analyze(lead)
    const fallbackResult = this.buildAIFallback(lead, product, baseResult)
    const generated = await this.generateAIResult(
      lead,
      product,
      fallbackResult,
    )
    const result: LeadResearchResult = {
      ...baseResult,
      ...generated.result,
      productProfileId: product?.id ?? null,
      provider: generated.provider,
      model: generated.model,
      generatedAt: new Date(),
    }

    if (existing) return this.repository.updateResearch(leadId, result)
    try {
      return await this.repository.createResearch(leadId, result)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.repository.updateResearch(leadId, result)
      }
      throw error
    }
  }

  private async generateAIResult(
    lead: ResearchableLead,
    product: ProductResearchContext | null | undefined,
    fallbackResult: LeadResearchAIResult,
  ): Promise<{
    result: LeadResearchAIResult
    provider: string
    model: string
  }> {
    const prompt = await this.promptService
      .getByTaskType(AITaskType.LEAD_RESEARCH)
      .then(
        (template) =>
          template?.template ??
          'Analyze Lead and ProductProfile evidence for B2B sales fit. Return structured JSON only and use Unknown when evidence is insufficient.',
      )
      .catch(
        () =>
          'Analyze Lead and ProductProfile evidence for B2B sales fit. Return structured JSON only and use Unknown when evidence is insufficient.',
      )
    const request = {
      taskType: AITaskType.LEAD_RESEARCH,
      prompt,
      context: {
        lead: {
          company: lead.company ?? UNKNOWN,
          industry: lead.industry,
          customerType: lead.customerType,
          jobTitle: lead.jobTitle ?? UNKNOWN,
          platform: lead.platform,
          country: lead.country || UNKNOWN,
          sourceUrl: lead.sourceUrl,
          originalContent: lead.postContent || UNKNOWN,
          sourceMetadata: lead.sourceMetadata,
        },
        product: product
          ? {
              productName: product.productName,
              category: product.category,
              industry: product.industry,
              applications: product.applications,
              keywords: product.keywords,
              buyerPersona: product.buyerPersona,
              buyingSignals: product.buyingSignals,
              painPoints: product.painPoints,
              valueAngles: product.valueAngles,
            }
          : null,
        fallbackResponse: fallbackResult,
      },
    }

    if (this.provider !== this.fallbackProvider) {
      const startedAt = Date.now()
      try {
        const response = await this.provider.generate(request)
        const parsed = this.parser.parseWithStatus(
          response.output,
          isLeadResearchAIResult,
          fallbackResult,
        )
        await this.usageLogs.safeRecord({
          taskType: AITaskType.LEAD_RESEARCH,
          provider: response.provider,
          model: response.model,
          success: !parsed.usedFallback,
          latencyMs: Date.now() - startedAt,
        })
        if (!parsed.usedFallback) {
          return {
            result: parsed.value,
            provider: response.provider,
            model: response.model,
          }
        }
      } catch {
        await this.usageLogs.safeRecord({
          taskType: AITaskType.LEAD_RESEARCH,
          provider: this.provider.name,
          model: this.provider.model,
          success: false,
          latencyMs: Date.now() - startedAt,
        })
      }
    }

    const fallbackStartedAt = Date.now()
    const response = await this.fallbackProvider.generate(request)
    const result = this.parser.parse(
      response.output,
      isLeadResearchAIResult,
      fallbackResult,
    )
    await this.usageLogs.safeRecord({
      taskType: AITaskType.LEAD_RESEARCH,
      provider: response.provider,
      model: response.model,
      success: true,
      latencyMs: Date.now() - fallbackStartedAt,
    })
    return { result, provider: response.provider, model: response.model }
  }

  private buildAIFallback(
    lead: ResearchableLead,
    product: ProductResearchContext | null | undefined,
    base: LeadResearchResult,
  ): LeadResearchAIResult {
    const content = lead.postContent.trim()
    const productTerms = product
      ? [
          product.productName,
          product.category,
          product.industry,
          ...product.applications,
          ...product.keywords,
        ]
      : []
    const matchingTerms = productTerms.filter(
      (term) =>
        term.length > 2 &&
        content.toLowerCase().includes(term.toLowerCase()),
    )
    const hasCompany = Boolean(lead.company)
    const hasEvidence = Boolean(
      hasCompany || content || base.buyingSignals.length,
    )
    const matchScore = product
      ? Math.min(
          100,
          (matchingTerms.length > 0 ? 45 : 10) +
            (lead.industry === product.industry ? 30 : 0) +
            (base.buyingSignals.length > 0 ? 25 : 0),
        )
      : 0
    const industryFit = !product
      ? UNKNOWN
      : matchingTerms.length > 0 || lead.industry === product.industry
        ? `Verified Lead content or industry aligns with ${product.productName}.`
        : 'No verified product-to-industry match was found.'
    const businessFit = hasCompany
      ? `${lead.company} is a verified company subject in the Lead evidence.`
      : UNKNOWN
    const contactReason =
      base.buyingSignalDetails[0]?.evidence ??
      (hasCompany && content
        ? `The source contains verifiable activity from ${lead.company}.`
        : UNKNOWN)
    const recommendedAngle =
      hasEvidence && product
        ? base.salesAngle.valueProposition
        : UNKNOWN
    const riskFactors = [
      !product ? 'No ProductProfile was selected.' : null,
      !hasCompany ? 'No verified company subject.' : null,
      base.buyingSignals.length === 0
        ? 'No explicit buying signal or procurement event.'
        : null,
      !content ? 'No original Lead content.' : null,
    ].filter((value): value is string => Boolean(value))
    const evidence = [
      lead.company ? `Lead company: ${lead.company}` : null,
      lead.industry ? `Lead industry: ${lead.industry}` : null,
      lead.country ? `Lead location: ${lead.country}` : null,
      content ? `Lead content: ${content.slice(0, 300)}` : null,
      product ? `Selected product: ${product.productName}` : null,
      ...base.buyingSignalDetails.map(
        (signal) => `Buying signal evidence: ${signal.evidence}`,
      ),
    ].filter((value): value is string => Boolean(value))

    return {
      matchScore,
      purchaseLikelihood:
        base.buyingSignals.length > 0
          ? base.priority === 'A'
            ? 'High'
            : 'Medium'
          : hasEvidence
            ? 'Low'
            : UNKNOWN,
      industryFit,
      businessFit,
      recommendedAngle,
      contactReason,
      riskFactors,
      evidence,
    }
  }

  private isCurrentIntelligence(value: unknown): boolean {
    return Boolean(
      value &&
        typeof value === 'object' &&
        (value as { intelligenceVersion?: number }).intelligenceVersion === 1,
    )
  }

  analyze(lead: ResearchableLead): LeadResearchResult {
    const metadata = this.metadata(lead.sourceMetadata)
    const content = lead.postContent.trim()
    const website = this.readString(metadata, ['website', 'companyWebsite'])
    const company =
      lead.company ?? this.readString(metadata, ['companyName', 'company'])
    const leadType = this.readString(metadata, ['leadType'])
    const contactName = this.readString(metadata, [
      'contactName',
      'personName',
      'fullName',
    ])
    const contactInfo =
      this.readString(metadata, ['email', 'contactEmail', 'phone']) ??
      this.readStringArray(metadata, ['emails', 'phones'])[0] ??
      null
    const evidencePainPoints = this.readStringArray(metadata, ['painPoints'])
    const evidenceBuyingSignals = this.readStringArray(metadata, [
      'buyingIntent',
      'buyingSignals',
      'buyingSignal',
    ])
    const painPoints =
      evidencePainPoints.length > 0
        ? evidencePainPoints
        : this.extractPainPoints(content)
    const buyingSignals =
      evidenceBuyingSignals.length > 0
        ? evidenceBuyingSignals
        : this.extractBuyingSignals(content)
    const procurementSignal =
      buyingSignals.some((signal) =>
        /procurement|purchasing|sourcing|quotation|rfq|purchase/i.test(signal),
      ) ||
      /\b(procurement|purchasing|sourcing|rfq|request for quote|quotation|tender|bid invitation)\b/i.test(
        content,
      )
    const supplierSeekingSignal =
      buyingSignals.some((signal) =>
        /supplier|vendor|solution search/i.test(signal),
      ) ||
      /\b(looking for|seeking|need|require|recommend)\b.{0,100}\b(supplier|vendor|manufacturer|solution|equipment)\b/i.test(
        content,
      )
    const vendorContent =
      /\b(we provide|we offer|our products?|our solutions?|manufacturer|supplier of)\b/i.test(
        content,
      )
    const contentPenalty = this.contentPenalty(lead.platform, content)
    let commercialScore = 10
    if (procurementSignal) commercialScore += 30
    if (supplierSeekingSignal) commercialScore += 25
    if (lead.jobTitle) commercialScore += 15
    if (website) commercialScore += 15
    if (contactInfo) commercialScore += 10
    commercialScore = Math.max(0, Math.min(100, commercialScore - contentPenalty))

    const leadCategory: LeadResearchResult['leadCategory'] =
      procurementSignal || supplierSeekingSignal
        ? 'buyer'
        : leadType === 'company' && Boolean(company)
          ? 'company'
          : leadType === 'person' || Boolean(contactName || lead.jobTitle)
            ? 'person'
            : leadType === 'community' || lead.platform === 'Reddit'
              ? 'community'
              : 'content'
    const leadQuality: LeadResearchResult['leadQuality'] =
      commercialScore >= 70
        ? 'high'
        : commercialScore >= 40
          ? 'medium'
          : 'low'
    const salesRecommendation: LeadResearchResult['salesRecommendation'] =
      leadQuality === 'high' && leadCategory === 'buyer'
        ? 'contact_now'
        : leadQuality === 'medium' ||
            (leadQuality === 'high' && leadCategory !== 'content') ||
            (buyingSignals.length > 0 && Boolean(company))
          ? 'nurture'
          : 'ignore'
    const industry = lead.industry || UNKNOWN
    const companyType =
      !leadType && !company && !contactName && !lead.jobTitle
        ? UNKNOWN
        :
      leadCategory === 'buyer'
        ? 'Buyer'
        : leadCategory === 'company'
          ? vendorContent
            ? 'Supplier'
            : 'Company'
          : leadCategory === 'person'
            ? 'Contact person'
            : leadCategory === 'community'
              ? 'Community user'
              : 'Content author'
    const customerPersona = lead.jobTitle
      ? `${lead.jobTitle}${company ? ` at ${company}` : ''}`
      : leadCategory === 'company'
        ? 'Company account'
        : UNKNOWN
    const companySummary = company
      ? [
          `${company} is identified as a ${industry} lead`,
          website ? `with website ${website}` : null,
          `from ${lead.platform}`,
        ]
          .filter(Boolean)
          .join(' ') + '.'
      : UNKNOWN
    const communicationStyle = content
      ? lead.platform === 'Reddit'
        ? 'Direct, practical, and discussion-oriented'
        : 'Concise, evidence-based, and professional'
      : UNKNOWN
    const recommendedApproach =
      salesRecommendation === 'contact_now'
        ? 'Reference the verified buying signal, ask a discovery question, and offer a relevant case study.'
        : salesRecommendation === 'nurture'
          ? 'Confirm the current business priority before presenting a solution or proposal.'
          : 'Do not initiate direct sales outreach unless new commercial evidence appears.'

    const positiveReasons = [
      procurementSignal ? 'verified procurement signal' : null,
      supplierSeekingSignal ? 'supplier search signal' : null,
      lead.jobTitle ? 'identified job title' : null,
      website ? 'verified company website' : null,
      contactInfo ? 'available contact information' : null,
    ].filter((value): value is string => Boolean(value))
    const negativeReasons = [
      contentPenalty > 0 ? 'content-led source' : null,
      !company ? 'no verified company subject' : null,
      !procurementSignal && !supplierSeekingSignal
        ? 'no explicit buying requirement'
        : null,
    ].filter((value): value is string => Boolean(value))
    const qualityReason =
      [...positiveReasons, ...negativeReasons].join('; ') || UNKNOWN

    const buyingSignalDetails = this.buildSignalDetails(
      buyingSignals,
      content,
      metadata,
    )
    const priority: LeadResearchResult['priority'] =
      buyingSignalDetails.length > 0 &&
      (procurementSignal || supplierSeekingSignal)
        ? 'A'
        : leadCategory === 'company' || leadCategory === 'person'
          ? 'B'
          : 'C'
    const profileEvidence = [
      company ? `Company field: ${company}` : null,
      website ? `Website field: ${website}` : null,
      lead.jobTitle ? `Job title field: ${lead.jobTitle}` : null,
      lead.country ? `Location field: ${lead.country}` : null,
      leadType ? `Lead type field: ${leadType}` : null,
    ].filter((value): value is string => Boolean(value))
    const companyProfile: LeadResearchResult['companyProfile'] = {
      companyType,
      industry,
      businessModel: vendorContent
        ? 'Supplier'
        : leadCategory === 'buyer'
          ? 'Potential buyer'
          : UNKNOWN,
      estimatedRole: lead.jobTitle ?? UNKNOWN,
      location: lead.country || UNKNOWN,
      evidence: profileEvidence,
    }
    const primaryPainPoint = painPoints[0] ?? UNKNOWN
    const valueProposition =
      primaryPainPoint !== UNKNOWN
        ? `Show evidence of how the offering addresses ${primaryPainPoint.toLowerCase()}.`
        : `Share one relevant ${industry} case study and validate operational fit.`
    const firstMessageHook =
      buyingSignalDetails[0]?.evidence ??
      (company
        ? `I noticed ${company}'s activity in ${industry}.`
        : UNKNOWN)
    const salesAngle: LeadResearchResult['salesAngle'] = {
      recommendedApproach,
      painPoint: primaryPainPoint,
      valueProposition,
      firstMessageHook,
    }
    const outreachPlan = this.buildOutreachPlan({
      company,
      industry,
      jobTitle: lead.jobTitle,
      signal: buyingSignalDetails[0]?.signal ?? null,
      evidence: buyingSignalDetails[0]?.evidence ?? null,
      painPoint: primaryPainPoint,
      priority,
    })

    const evidenceCount = [
      company,
      website,
      content || null,
      lead.jobTitle,
      painPoints.length ? painPoints : null,
      buyingSignals.length ? buyingSignals : null,
    ].filter(Boolean).length

    return {
      companySummary,
      industry,
      companyType,
      customerPersona,
      painPoints,
      buyingSignals,
      communicationStyle,
      recommendedApproach,
      confidenceScore: Math.min(100, 20 + evidenceCount * 13),
      leadQuality,
      leadCategory,
      salesRecommendation,
      qualityReason,
      companyProfile,
      buyingSignalDetails,
      salesAngle,
      outreachPlan,
      priority,
      intelligenceVersion: 1,
    }
  }

  private buildSignalDetails(
    signals: string[],
    content: string,
    metadata: Record<string, unknown>,
  ): LeadResearchResult['buyingSignalDetails'] {
    const metadataEvidence = this.readString(metadata, [
      'buyingNeed',
      'originalContent',
      'evidence',
    ])
    return signals.map((signal) => {
      const evidence =
        this.findEvidenceSentence(content, signal) ??
        metadataEvidence ??
        `Provider signal: ${signal}`
      return {
        signal,
        evidence,
        confidence: content && evidence !== `Provider signal: ${signal}` ? 85 : 65,
      }
    })
  }

  private findEvidenceSentence(content: string, signal: string): string | null {
    if (!content) return null
    const keywords = signal
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length >= 5)
    const sentences = content
      .split(/(?<=[.!?])\s+|\r?\n+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
    const match = sentences.find((sentence) =>
      keywords.some((keyword) => sentence.toLowerCase().includes(keyword)),
    )
    const fallback = sentences.find((sentence) =>
      /\b(looking for|seeking|need|require|rfq|procurement|sourcing|upgrade|replace|project|hiring)\b/i.test(
        sentence,
      ),
    )
    const evidence = match ?? fallback
    return evidence ? evidence.slice(0, 360) : null
  }

  private buildOutreachPlan(input: {
    company: string | null
    industry: string
    jobTitle: string | null
    signal: string | null
    evidence: string | null
    painPoint: string
    priority: 'A' | 'B' | 'C'
  }): LeadResearchResult['outreachPlan'] {
    if (input.priority === 'C') {
      return {
        emailSubject: UNKNOWN,
        openingLine: UNKNOWN,
        body: 'Direct outreach is not recommended because no verified commercial opportunity was found.',
        cta: 'Monitor for a verified company, role, project, or buying signal.',
        linkedinMessage: UNKNOWN,
        whatsappMessage: UNKNOWN,
        followUpCadence: ['Monitor and reassess when new evidence appears.'],
      }
    }

    const company = input.company ?? 'your company'
    const topic = input.signal ?? `${input.industry} priorities`
    const openingLine = input.evidence
      ? `I noticed this verified signal: "${input.evidence}".`
      : `I noticed ${company}'s work in ${input.industry}.`
    const cta =
      'Would a brief 15-minute conversation to validate fit be useful?'
    return {
      emailSubject: `${company}: ${topic}`,
      openingLine,
      body: [
        openingLine,
        input.painPoint !== UNKNOWN
          ? `The evidence suggests ${input.painPoint.toLowerCase()} may be relevant.`
          : null,
        `We can share a relevant ${input.industry} example and first validate whether it applies to your current priorities.`,
      ]
        .filter(Boolean)
        .join(' '),
      cta,
      linkedinMessage: `${openingLine} We can share one relevant example if this is a current priority. ${cta}`,
      whatsappMessage: `${openingLine} If useful, I can send one concise, relevant example. ${cta}`,
      followUpCadence:
        input.priority === 'A'
          ? [
              'Day 1: Evidence-led email',
              'Day 3: LinkedIn follow-up',
              'Day 7: Share one relevant case study',
              'Day 14: Final confirmation message',
            ]
          : [
              'Day 1: Low-pressure introduction',
              'Day 7: Share one relevant insight',
              'Day 21: Reassess for new buying signals',
            ],
    }
  }

  private contentPenalty(platform: Platform, content: string): number {
    let penalty = platform === 'YouTube' ? 10 : 0
    if (
      /\b(news|press release|announcement|reported|according to)\b/i.test(
        content,
      )
    ) {
      penalty += 20
    }
    if (
      /\b(tutorial|how to|explained|beginner|training|guide)\b/i.test(content)
    ) {
      penalty += 20
    }
    if (
      /\b(industry outlook|industry trends?|opinion|thought leadership|commentary)\b/i.test(
        content,
      )
    ) {
      penalty += 10
    }
    return Math.min(40, penalty)
  }

  private extractPainPoints(content: string): string[] {
    if (!content) return []
    const rules: Array<[RegExp, string]> = [
      [/\b(downtime|failure|unreliable|reliability)\b/i, 'Reliability and downtime'],
      [/\b(cost|budget|price|expensive)\b/i, 'Cost and budget pressure'],
      [/\b(delay|lead time|delivery)\b/i, 'Delivery and lead-time risk'],
      [/\b(compliance|validation|regulation)\b/i, 'Compliance and validation'],
      [/\b(integration|compatibility|legacy)\b/i, 'Integration and compatibility'],
    ]
    return rules
      .filter(([pattern]) => pattern.test(content))
      .map(([, label]) => label)
  }

  private extractBuyingSignals(content: string): string[] {
    if (!content) return []
    const rules: Array<[RegExp, string]> = [
      [/\b(looking for|seeking|need|require)\b.{0,100}\b(supplier|vendor|solution|system|equipment)\b/i, 'Active supplier or solution search'],
      [/\b(rfq|request for quote|quotation)\b/i, 'Request for quotation'],
      [/\b(procurement|purchasing|sourcing)\b/i, 'Procurement activity'],
      [/\b(upgrade|replace|retrofit|new production line)\b/i, 'Upgrade or new project'],
      [/\b(expanding|expansion|new facility|increase capacity)\b/i, 'Production expansion'],
      [/\b(hiring|recruiting|job opening)\b.{0,80}\b(procurement|automation|engineering|packaging)\b/i, 'Hiring a relevant role'],
      [/\b(project announced|new project|project launch|tender|bid invitation)\b/i, 'Relevant project published'],
    ]
    return rules
      .filter(([pattern]) => pattern.test(content))
      .map(([, label]) => label)
  }

  private metadata(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private readString(
    metadata: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = metadata[key]
      if (
        typeof value === 'string' &&
        value.trim() &&
        !/^(?:unknown|n\/?a|null|none)$/i.test(value.trim())
      ) {
        return value.trim()
      }
    }
    return null
  }

  private readStringArray(
    metadata: Record<string, unknown>,
    keys: string[],
  ): string[] {
    for (const key of keys) {
      const value = metadata[key]
      if (Array.isArray(value)) {
        return value.filter(
          (item): item is string =>
            typeof item === 'string' && Boolean(item.trim()),
        )
      }
      if (typeof value === 'string' && value.trim()) return [value.trim()]
    }
    return []
  }
}

function isLeadResearchAIResult(
  value: unknown,
): value is LeadResearchAIResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const result = value as Record<string, unknown>
  return (
    typeof result.matchScore === 'number' &&
    Number.isFinite(result.matchScore) &&
    result.matchScore >= 0 &&
    result.matchScore <= 100 &&
    typeof result.purchaseLikelihood === 'string' &&
    typeof result.industryFit === 'string' &&
    typeof result.businessFit === 'string' &&
    typeof result.recommendedAngle === 'string' &&
    typeof result.contactReason === 'string' &&
    isStringArray(result.riskFactors) &&
    isStringArray(result.evidence)
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export const leadResearch = new LeadResearchService()
