import { Prisma } from '@prisma/client'
import type {
  AIProvider,
  BuyerRole,
  BuyingStage,
  OutreachContent,
  OutreachContext,
  SalesAngle,
} from '../providers/ai/ai-provider.interface.js'
import { ruleBasedOutreachProvider } from '../providers/ai/rule-based-outreach.provider.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { leadResearch } from './lead-research.service.js'
import { toSafeJson } from './safe-json.service.js'

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
    private readonly provider: AIProvider = ruleBasedOutreachProvider,
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
    const content = await this.provider.generateOutreach(context)
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
      provider: this.provider.name,
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
