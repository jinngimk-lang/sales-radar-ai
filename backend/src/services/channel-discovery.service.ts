import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import {
  publicWebsiteDiscovery,
  type PublicWebsiteDiscoveryInput,
  type PublicWebsiteDiscoveryResult,
} from './public-business-discovery.service.js'
import { toSafeJson } from './safe-json.service.js'

export type ChannelType =
  | 'distributor'
  | 'reseller'
  | 'system_integrator'
  | 'trading_company'
  | 'supplier'
  | 'intermediary'
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
  normalizedDomain: string | null
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

export interface PublicChannelDiscoveryProvider {
  discover(input: PublicWebsiteDiscoveryInput): Promise<PublicWebsiteDiscoveryResult>
}

const prismaChannelRepository: ChannelDiscoveryRepository = {
  findLead: (leadId) =>
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        company: true,
        normalizedDomain: true,
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
    private readonly publicDiscovery: PublicChannelDiscoveryProvider =
      publicWebsiteDiscovery,
  ) {}

  async discover(leadId: string): Promise<unknown> {
    const lead = await this.repository.findLead(leadId)
    if (!lead) throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
    const publicResult = await this.safePublicDiscovery({
      seedUrls: this.publicSeedUrls(lead),
      companyName: lead.company,
    })
    return this.repository.upsertProfile(
      leadId,
      this.analyze(lead, publicResult),
    )
  }

  async get(leadId: string): Promise<unknown | null> {
    return this.repository.findProfile(leadId)
  }

  analyze(
    lead: ChannelLead,
    publicResult: PublicWebsiteDiscoveryResult | null = null,
  ): ChannelAnalysis {
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
      Boolean(
        publicResult?.pagesVisited.some((url) =>
          /\/(partners?|dealers?|distributors?|resellers?|suppliers?|vendors?|agents?|brokers?)\b/i.test(
            new URL(url).pathname,
          ),
        ),
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
        `Source ${lead.sourceUrl} explicitly describes a ${channelType.replaceAll('_', ' ')} role.`,
      )
    }
    if (sellsRelatedProducts) {
      channelScore += 25
      evidence.push(
        `Source ${lead.sourceUrl} describes sales or supply of relevant products.`,
      )
    }
    if (regionMatched) {
      channelScore += 20
      evidence.push(
        `Lead region ${lead.region} matches the originating search region.`,
      )
    }
    if (hasPartnerPage) {
      channelScore += 15
      evidence.push('An observed source contains an explicit partner, supplier, intermediary, or channel page signal.')
    }
    if (industryRelevant) {
      channelScore += 10
      evidence.push(`Source is relevant to ${lead.industry}.`)
    }

    if (!hasChannelExperience && !sellsRelatedProducts && !hasPartnerPage) {
      channelScore = Math.max(0, channelScore - 25)
    }

    this.appendPublicEvidence(evidence, publicResult)

    const website =
      publicResult?.organization?.website ??
      this.website(metadata, lead.sourceUrl)
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
          : ['No verified supplier, intermediary, distributor, reseller, integrator, trading, or partner evidence.'],
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
    if (/\b(supplier|vendor|manufacturer|equipment supplier)\b/i.test(text)) {
      return 'supplier'
    }
    if (/\b(broker|commercial agent|sales agent|representative|intermediary|sourcing agent)\b/i.test(text)) {
      return 'intermediary'
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
      supplier:
        'Validate product fit, capacity, certifications, commercial terms, and delivery performance before supplier outreach.',
      intermediary:
        'Validate mandate, territory, represented principals, fee model, and customer ownership before intermediary cooperation.',
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

  private publicSeedUrls(lead: ChannelLead): string[] {
    const metadata = this.record(lead.sourceMetadata)
    const seeds = [
      ...['website', 'companyWebsite', 'companyUrl', 'domain', 'companyDomain']
        .map((key) => metadata[key])
        .filter((value): value is string =>
          typeof value === 'string' && Boolean(value.trim()),
        ),
      lead.normalizedDomain,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => (value.includes('://') ? value : `https://${value}`))
    return [...new Set(seeds)]
  }

  private async safePublicDiscovery(
    input: PublicWebsiteDiscoveryInput,
  ): Promise<PublicWebsiteDiscoveryResult> {
    try {
      return await this.publicDiscovery.discover(input)
    } catch (error) {
      return {
        status: 'BLOCKED',
        seedUrl: input.seedUrls[0] ?? null,
        pagesVisited: [],
        organization: null,
        contacts: [],
        relatedBusinesses: [],
        errors: [
          {
            url: input.seedUrls[0] ?? UNKNOWN,
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
      }
    }
  }

  private appendPublicEvidence(
    evidence: string[],
    result: PublicWebsiteDiscoveryResult | null,
  ): void {
    if (!result) return
    const observedFields = result.organization?.evidence.filter((item) =>
      ['email', 'phone', 'socialProfile', 'website'].includes(item.field),
    ) ?? []
    for (const item of observedFields) {
      evidence.push(
        `Observed ${item.field}: ${item.value} (source: ${item.sourceUrl}; method: ${item.extractionMethod}; status: ${item.verificationStatus}).`,
      )
    }
    for (const business of result.relatedBusinesses) {
      const sourceUrl = business.evidence[0]?.sourceUrl ?? result.seedUrl ?? UNKNOWN
      evidence.push(
        `Observed related ${business.relationship}: ${business.name} — ${business.website} (source: ${sourceUrl}).`,
      )
    }
    if (result.status === 'BLOCKED' || result.status === 'PARTIAL') {
      evidence.push(
        `Public website discovery status: ${result.status}. ${result.errors.map((item) => `${item.url}: ${item.reason}`).join(' | ')}`,
      )
    }
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
