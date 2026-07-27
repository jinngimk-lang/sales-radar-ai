import { Prisma } from '@prisma/client'
import type {
  BuyerRole,
  BuyingStage,
  OutreachContent,
  OutreachContext,
  SalesAngle,
} from '../providers/ai/ai-provider.interface.js'
import type { AIProvider } from '../providers/ai-platform/ai-provider.interface.js'
import { aiProviderFactory } from '../providers/ai-platform/ai-provider.factory.js'
import { AITaskType } from '../providers/ai-platform/ai-task-type.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { leadResearch } from './lead-research.service.js'
import { toSafeJson } from './safe-json.service.js'
import { aiResponseParser } from './ai-response-parser.service.js'
import {
  promptTemplates,
  type PromptTemplateService,
} from './prompt-template.service.js'

interface IntelligenceResearch {
  priority: 'A' | 'B' | 'C'
  companyProfile: Prisma.JsonValue | null
  buyingSignalDetails: Prisma.JsonValue | null
  salesAngle: Prisma.JsonValue | null
  painPoints: Prisma.JsonValue
}

export interface OutreachGeneration {
  provider: string
  generatedAt: string
  context: {
    role: BuyerRole
    stage: BuyingStage
    angle: SalesAngle
    priority: 'A' | 'B' | 'C'
  }
  content: OutreachContent
}

export class OutreachAgentService {
  constructor(
    private readonly provider: AIProvider = aiProviderFactory.resolve(),
    private readonly fallbackProvider: AIProvider =
      aiProviderFactory.getFallback(),
    private readonly promptService: PromptTemplateService = promptTemplates,
  ) {}

  async generate(
    leadId: string,
    contactId?: string,
    outreachType: 'buyer' | 'channel' = 'buyer',
  ): Promise<OutreachGeneration> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
    const contact = contactId
      ? await prisma.contactProfile.findFirst({
          where: { id: contactId, leadId },
        })
      : await prisma.contactProfile.findFirst({
          where: { leadId, priorityRank: 1 },
        })
    if (contactId && !contact) {
      throw new AppError(
        404,
        'CONTACT_NOT_FOUND',
        'Contact does not belong to this lead',
      )
    }

    const research = (await leadResearch.research(
      leadId,
    )) as IntelligenceResearch
    const channel =
      outreachType === 'channel'
        ? await prisma.channelProfile.findUnique({ where: { leadId } })
        : null
    if (outreachType === 'channel' && !channel) {
      throw new AppError(
        404,
        'CHANNEL_PROFILE_NOT_FOUND',
        'Run channel discovery before generating channel outreach',
      )
    }
    const context = {
      ...this.buildContext(lead, research, contact),
      outreachType,
      channelProfile: channel
        ? {
            channelType: channel.channelType,
            channelScore: channel.channelScore,
            recommendationReason: channel.recommendationReason,
            cooperationStrategy: channel.cooperationStrategy,
          }
        : undefined,
    }
    const generated = await this.generateContent(context)
    const content = generated.content
    this.assertSafeContent(content)

    const generatedAt = new Date()
    await prisma.$transaction(
      [
        ['email', content.email],
        ['linkedin', content.linkedin],
        ['whatsapp', content.whatsapp],
        ['call', content.callScript],
      ].map(([channel, channelContent]) =>
        prisma.outreachMessage.create({
          data: {
            leadId,
            channel: channel as string,
            content: toSafeJson(channelContent),
            generatedAt,
          },
        }),
      ),
    )

    return {
      provider: generated.provider,
      generatedAt: generatedAt.toISOString(),
      context: {
        role: context.role,
        stage: context.stage,
        angle: context.angle,
        priority: context.priority,
      },
      content,
    }
  }

  async generateContent(
    context: OutreachContext,
  ): Promise<{ content: OutreachContent; provider: string }> {
    const template = await this.promptService
      .getByTaskType(AITaskType.OUTREACH_GENERATION)
      .catch(() => null)
    const prompt =
      template?.template ??
      'Generate structured B2B outreach using only verified context. Return JSON matching the requested outreach schema.'
    const request = {
      taskType: AITaskType.OUTREACH_GENERATION,
      prompt,
      context: {
        outreachContext: context as unknown as Record<string, unknown>,
      },
    }
    const fallbackResult = await this.fallbackProvider.generate(request)
    const fallback = aiResponseParser.parse(
      fallbackResult.output,
      (value): value is OutreachContent => this.isOutreachContent(value),
      this.safeOutreachFallback(),
    )

    if (this.provider === this.fallbackProvider) {
      return { content: fallback, provider: fallbackResult.provider }
    }

    try {
      const result = await this.provider.generate(request)
      const parsed = aiResponseParser.parseWithStatus(
        result.output,
        (value): value is OutreachContent => this.isOutreachContent(value),
        fallback,
      )
      return {
        content: parsed.value,
        provider: parsed.usedFallback
          ? fallbackResult.provider
          : result.provider,
      }
    } catch {
      return { content: fallback, provider: fallbackResult.provider }
    }
  }

  history(leadId: string) {
    return prisma.outreachMessage.findMany({
      where: { leadId },
      orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
    })
  }

  buildContext(
    lead: {
      company: string | null
      industry: string
      jobTitle: string | null
      country: string
      postContent: string
    },
    research: IntelligenceResearch,
    contact?: {
      name: string
      jobTitle: string
      company: string
    } | null,
  ): OutreachContext {
    const profile = this.record(research.companyProfile)
    const salesAngle = this.record(research.salesAngle)
    const signals = this.signalDetails(research.buyingSignalDetails)
    const painPoints = this.stringArray(research.painPoints)
    const role = this.classifyRole(
      contact?.jobTitle ?? lead.jobTitle,
      this.string(profile.companyType),
    )
    const stage: BuyingStage =
      research.priority === 'A'
        ? 'explicit_purchase'
        : research.priority === 'B'
          ? 'potential_need'
          : 'observation'
    const angle = this.selectAngle(
      `${lead.postContent} ${painPoints.join(' ')}`,
      signals,
    )

    return {
      contactName: contact?.name ?? 'Unknown',
      company:
        contact?.company !== 'Unknown'
          ? contact?.company ?? lead.company ?? 'Unknown'
          : lead.company ?? 'Unknown',
      industry: lead.industry,
      role,
      jobTitle: contact?.jobTitle ?? lead.jobTitle ?? 'Unknown',
      location: lead.country || 'Unknown',
      stage,
      angle,
      priority: research.priority,
      evidence: this.stringArray(profile.evidence),
      buyingSignals: signals,
      painPoint: this.string(salesAngle.painPoint) ?? painPoints[0] ?? 'Unknown',
      valueProposition:
        this.string(salesAngle.valueProposition) ?? 'Unknown',
    }
  }

  private classifyRole(
    jobTitle: string | null,
    companyType: string | null,
  ): BuyerRole {
    const value = `${jobTitle ?? ''} ${companyType ?? ''}`
    if (/\b(owner|founder|ceo|president|managing director)\b/i.test(value)) {
      return 'owner'
    }
    if (/\b(procurement|purchasing|sourcing|buyer|supply chain)\b/i.test(value)) {
      return 'procurement'
    }
    if (/\b(engineer|engineering|technical|automation|operations|plant)\b/i.test(value)) {
      return 'engineering'
    }
    if (/content|community/i.test(value)) return 'content_user'
    return 'contact'
  }

  private selectAngle(
    text: string,
    signals: OutreachContext['buyingSignals'],
  ): SalesAngle {
    const value = `${text} ${signals.map((signal) => signal.signal).join(' ')}`
    if (/\b(cost|budget|price|material cost)\b/i.test(value)) {
      return 'reduce_cost'
    }
    if (/\b(downtime|throughput|efficiency|capacity|speed)\b/i.test(value)) {
      return 'improve_efficiency'
    }
    if (/\b(upgrade|retrofit|replace|integration|automation)\b/i.test(value)) {
      return 'technical_upgrade'
    }
    if (/\b(risk|compliance|validation|reliability|delivery)\b/i.test(value)) {
      return 'reduce_risk'
    }
    return 'case_reference'
  }

  private assertSafeContent(content: OutreachContent): void {
    const serialized = JSON.stringify(content)
    if (/dear sir|hope this email finds you well/i.test(serialized)) {
      throw new AppError(
        500,
        'UNSAFE_OUTREACH_CONTENT',
        'Outreach provider returned a prohibited template phrase',
      )
    }
  }

  private isOutreachContent(value: unknown): value is OutreachContent {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const result = value as Record<string, unknown>
    const email = this.record(result.email)
    const linkedin = this.record(result.linkedin)
    const whatsapp = this.record(result.whatsapp)
    const callScript = this.record(result.callScript)
    return (
      Array.isArray(email.subjectOptions) &&
      typeof email.opening === 'string' &&
      typeof email.body === 'string' &&
      typeof email.cta === 'string' &&
      typeof linkedin.connectionMessage === 'string' &&
      typeof linkedin.firstMessage === 'string' &&
      typeof whatsapp.message === 'string' &&
      typeof callScript.opening === 'string' &&
      Array.isArray(callScript.questions)
    )
  }

  private safeOutreachFallback(): OutreachContent {
    const advice =
      'AI output could not be validated. Review the Lead evidence before contacting this account.'
    return {
      email: {
        subjectOptions: [],
        opening: 'Unknown',
        body: advice,
        cta: 'Reassess the verified evidence.',
      },
      linkedin: { connectionMessage: 'Unknown', firstMessage: advice },
      whatsapp: { message: advice },
      callScript: { opening: 'Unknown', questions: [] },
      observationAdvice: advice,
    }
  }

  private signalDetails(
    value: Prisma.JsonValue | null,
  ): OutreachContext['buyingSignals'] {
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return []
      const record = item as Record<string, unknown>
      const signal = this.string(record.signal)
      const evidence = this.string(record.evidence)
      const confidence = record.confidence
      return signal && evidence && typeof confidence === 'number'
        ? [{ signal, evidence, confidence }]
        : []
    })
  }

  private record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private string(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter(
          (item): item is string =>
            typeof item === 'string' && Boolean(item.trim()),
        )
      : []
  }
}

export const outreachAgent = new OutreachAgentService()
