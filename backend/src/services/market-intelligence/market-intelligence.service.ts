import type { MarketSignal, MarketSignalType, Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client.js'
import type { SearchResult } from '../../providers/search/search-provider.interface.js'
import { AgentReachMarketSourceAdapter } from './agentreach.adapter.js'
import { ExaMarketSourceAdapter } from './exa.adapter.js'
import type {
  MarketSignalCandidate,
  MarketSourceAdapter,
} from './market-source-adapter.interface.js'

export interface CaptureMarketSignalInput {
  userId: string
  provider: string
  result: SearchResult
  detectedAt?: Date
}

export interface MarketSignalRepository {
  upsert(
    userId: string,
    candidate: MarketSignalCandidate,
  ): Promise<MarketSignal>
  list(userId: string): Promise<MarketSignal[]>
}

const prismaMarketSignalRepository: MarketSignalRepository = {
  upsert(userId, candidate) {
    const data = {
      userId,
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      title: candidate.title,
      summary: candidate.summary,
      content: candidate.content,
      companyName: candidate.companyName,
      country: candidate.country,
      region: candidate.region,
      signalType: candidate.signalType,
      confidence: clampConfidence(candidate.confidence),
      detectedAt: candidate.detectedAt,
    } satisfies Prisma.MarketSignalUncheckedCreateInput

    return prisma.marketSignal.upsert({
      where: {
        userId_sourceUrl_signalType: {
          userId,
          sourceUrl: candidate.sourceUrl,
          signalType: candidate.signalType,
        },
      },
      create: data,
      update: {
        sourceType: data.sourceType,
        title: data.title,
        summary: data.summary,
        content: data.content,
        companyName: data.companyName,
        country: data.country,
        region: data.region,
        confidence: data.confidence,
        detectedAt: data.detectedAt,
      },
    })
  },
  list(userId) {
    return prisma.marketSignal.findMany({
      where: { userId },
      orderBy: [{ detectedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    })
  },
}

export class MarketIntelligenceService {
  constructor(
    private readonly repository: MarketSignalRepository =
      prismaMarketSignalRepository,
    private readonly adapters: MarketSourceAdapter[] = [
      new AgentReachMarketSourceAdapter(),
      new ExaMarketSourceAdapter(),
    ],
  ) {}

  async captureSearchResult(input: CaptureMarketSignalInput) {
    if (!input.userId.trim()) return []

    const adapter = this.adapters.find((candidate) =>
      candidate.canHandle({
        provider: input.provider,
        result: input.result,
        detectedAt: input.detectedAt,
      }),
    )
    if (!adapter) return []

    const candidates = await adapter.fetchSignals({
      provider: input.provider,
      result: input.result,
      detectedAt: input.detectedAt,
    })

    return Promise.all(
      candidates.map((candidate) =>
        this.repository.upsert(input.userId, candidate),
      ),
    )
  }

  listForUser(userId: string) {
    return this.repository.list(userId)
  }
}

export interface MarketSignalCapture {
  captureSearchResult(
    input: CaptureMarketSignalInput,
  ): Promise<Array<{ signalType: MarketSignalType }>>
}

export async function captureMarketSignalsSafely(
  input: CaptureMarketSignalInput,
  service: MarketSignalCapture = marketIntelligence,
) {
  try {
    return await service.captureSearchResult(input)
  } catch (error) {
    console.error(
      `[MarketIntelligence] Signal capture failed for ${input.result.sourceUrl}:`,
      error,
    )
    return []
  }
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export const marketIntelligence = new MarketIntelligenceService()
