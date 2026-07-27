import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { toSafeJson } from './safe-json.service.js'

export type ChannelType =
  | 'distributor'
  | 'reseller'
  | 'system_integrator'
  | 'trading_company'
  | 'partner'
  | 'unknown'

export interface ChannelAnalysis {
  channelType: ChannelType
  companyName: string
  industry: string
  region: string
  website: string
  evidence: string[]
  channelScore: number
  confidence: number
  recommendationReason: string
  cooperationStrategy: string
}

export interface ChannelLead {
  id: string
  company: string | null
  industry: string
  region: string
  country: string
  sourceUrl: string
  postContent: string
  sourceMetadata: Prisma.JsonValue | null
  searchTask: { regions: string[] } | null
}

export interface ChannelDiscoveryRepository {
  findLead(leadId: string): Promise<ChannelLead | null>
  findProfile(leadId: string): Promise<unknown | null>
  upsertProfile(leadId: string, result: ChannelAnalysis): Promise<unknown>
}

const prismaChannelRepository: ChannelDiscoveryRepository = {
  findLead: (leadId) =>
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        company: true,
        industry: true,
        region: true,
        country: true,
        sourceUrl: true,
        postContent: true,
        sourceMetadata: true,
        searchTask: { select: { regions: true } },
      },
    }),
  findProfile: (leadId) =>
    prisma.channelProfile.findUnique({ where: { leadId } }),
  upsertProfile: (leadId, result) =>
    prisma.channelProfile.upsert({
      where: { leadId },
      create: {
        leadId,
        ...result,
        evidence: toSafeJson(result.evidence),
      },
      update: {
        ...result,
        evidence: toSafeJson(result.evidence),
      },
    }),
}

const UNKNOWN = 'Unknown'

export class ChannelDiscoveryService {
  constructor(
    private readonly repository: ChannelDiscoveryRepository =
      prismaChannelRepository,
  ) {}

  async discover(leadId: string): Promise<unknown> {
    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
    return this.repository.upsertProfile(leadId, this.analyze(lead))
  }

  async get(leadId: string): Promise<unknown | null> {
    return this.repository.findProfile(leadId)
  }

  analyze(lead: ChannelLead): ChannelAnalysis {
    const metadata = this.record(lead.sourceMetadata)
    const metadataText = this.selectedMetadataText(metadata)
    const text = `${lead.postContent} ${metadataText} ${lead.sourceUrl}`
    const evidence: string[] = []

    const channelType = this.detectChannelType(text)
    const hasChannelExperience = channelType !== 'unknown'
    const sellsRelatedProducts =
      /\b(sell|selling|supply|supplies|distribute|distributing|product portfolio|solutions provider|equipment supplier)\b/i.test(
        text,
      ) &&
      /\b(industrial|manufactur|automation|equipment|machinery|control|robot|packaging|component|software|medical|electronic)\b/i.test(
        text,
      )
    const hasPartnerPage =
      /\/(partners?|dealers?|distributors?|resellers?|channel-program)\b/i.test(
        lead.sourceUrl,
      ) ||
      /\b(partner program|become a partner|partner network|channel partners?)\b/i.test(
        text,
      )
    const targetRegions = lead.searchTask?.regions ?? []
    const regionMatched =
      targetRegions.length > 0 &&
      targetRegions.some(
        (region) =>
          region.toLowerCase() === lead.region.toLowerCase() ||
          region.toLowerCase() === lead.country.toLowerCase(),
      )
    const industryRelevant =
      lead.industry !== UNKNOWN &&
      (sellsRelatedProducts ||
        /\b(industry|industrial|manufactur|automation|equipment|technology)\b/i.test(
          text,
        ))

    let channelScore = 0
    if (hasChannelExperience) {
      channelScore += 30
      evidence.push(
        `Source explicitly describes a ${channelType.replaceAll('_', ' ')} role.`,
      )
    }
    if (sellsRelatedProducts) {
      channelScore += 25
      evidence.push('Source describes sales or supply of relevant products.')
    }
    if (regionMatched) {
      channelScore += 20
      evidence.push(
        `Lead region ${lead.region} matches the originating search region.`,
      )
    }
    if (hasPartnerPage) {
      channelScore += 15
      evidence.push('Source contains an explicit partner or channel page signal.')
    }
    if (industryRelevant) {
      channelScore += 10
      evidence.push(`Source is relevant to ${lead.industry}.`)
    }

    if (!hasChannelExperience && !sellsRelatedProducts && !hasPartnerPage) {
      channelScore = Math.max(0, channelScore - 25)
    }

    const website = this.website(metadata, lead.sourceUrl)
    const confidence = Math.min(
      100,
      (hasChannelExperience ? 35 : 0) +
        (sellsRelatedProducts ? 25 : 0) +
        (hasPartnerPage ? 20 : 0) +
        (website !== UNKNOWN ? 10 : 0) +
        (lead.company ? 10 : 0),
    )
    const isChannel = channelType !== 'unknown' && evidence.length > 0

    return {
      channelType: isChannel ? channelType : 'unknown',
      companyName: lead.company ?? UNKNOWN,
      industry: lead.industry || UNKNOWN,
      region: lead.country || lead.region || UNKNOWN,
      website,
      evidence:
        evidence.length > 0
          ? evidence
          : ['No verified distributor, reseller, integrator, trading, or partner evidence.'],
      channelScore: Math.min(100, channelScore),
      confidence,
      recommendationReason: isChannel
        ? evidence.join(' ')
        : 'No reliable commercial channel evidence was found in the existing Lead source.',
      cooperationStrategy: isChannel
        ? this.strategy(channelType)
        : UNKNOWN,
    }
  }

  private detectChannelType(text: string): ChannelType {
    if (/\b(system integrator|systems integrator|integration partner)\b/i.test(text)) {
      return 'system_integrator'
    }
    if (/\b(authorized distributor|industrial distributor|distributor)\b/i.test(text)) {
      return 'distributor'
    }
    if (/\b(reseller|value-added reseller|\bvar\b)\b/i.test(text)) {
      return 'reseller'
    }
    if (/\b(trading company|import.export company|export trading)\b/i.test(text)) {
      return 'trading_company'
    }
    if (/\b(channel partner|partner network|strategic partner)\b/i.test(text)) {
      return 'partner'
    }
    return 'unknown'
  }

  private strategy(channelType: ChannelType): string {
    return {
      distributor:
        'Explore a regional distribution agreement with territory, margin, enablement, and service responsibilities validated first.',
      reseller:
        'Explore a reseller program with product training, deal registration, and commercial terms.',
      system_integrator:
        'Explore a solution-integration partnership focused on technical compatibility, project delivery, and joint customer support.',
      trading_company:
        'Explore an export or market-access cooperation model with compliance, logistics, and customer ownership clarified.',
      partner:
        'Explore a scoped industry partnership with shared target accounts and a low-risk pilot.',
      unknown: UNKNOWN,
    }[channelType]
  }

  private website(
    metadata: Record<string, unknown>,
    sourceUrl: string,
  ): string {
    for (const key of ['website', 'companyWebsite', 'domain']) {
      const value = metadata[key]
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        return value
      }
    }
    return /linkedin|reddit|youtube|facebook|instagram|tiktok|x\.com/i.test(
      sourceUrl,
    )
      ? UNKNOWN
      : /^https?:\/\//i.test(sourceUrl)
        ? sourceUrl
        : UNKNOWN
  }

  private selectedMetadataText(metadata: Record<string, unknown>): string {
    return [
      metadata.channelType,
      metadata.description,
      metadata.companyDescription,
      metadata.businessModel,
      metadata.products,
      metadata.partnerProgram,
    ]
      .flatMap((value) =>
        Array.isArray(value) ? value : typeof value === 'string' ? [value] : [],
      )
      .join(' ')
  }

  private record(value: Prisma.JsonValue | null): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }
}

export const channelDiscovery = new ChannelDiscoveryService()
