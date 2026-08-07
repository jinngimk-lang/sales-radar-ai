import { AppError } from '../../utils/app-error.js'
import {
  MarketWebResearchService,
  type MarketResearchSession,
  type MarketResearchTarget,
} from './market-web-research.service.js'

type MarketWebResearchOptions = ConstructorParameters<
  typeof MarketWebResearchService
>[0]

export class ResilientMarketWebResearchService {
  private readonly environment: NodeJS.ProcessEnv

  constructor(private readonly options: MarketWebResearchOptions = {}) {
    this.environment = options.environment ?? process.env
  }

  async run(
    userId: string,
    target: MarketResearchTarget,
  ): Promise<MarketResearchSession> {
    const primary = new MarketWebResearchService(this.options)
    try {
      return await primary.run(userId, target)
    } catch (error) {
      if (!canFallbackToExa(error, this.environment)) throw error

      const fallbackEnvironment: NodeJS.ProcessEnv = {
        ...this.environment,
        OPENAI_API_KEY: undefined,
        AI_PROVIDER: undefined,
        AI_API_KEY: undefined,
        AI_BASE_URL: undefined,
        MARKET_RESEARCH_MODEL: undefined,
      }
      const fallback = new MarketWebResearchService({
        ...this.options,
        environment: fallbackEnvironment,
      })
      return fallback.run(userId, target)
    }
  }
}

export function canFallbackToExa(
  error: unknown,
  environment: NodeJS.ProcessEnv,
) {
  if (!environment.EXA_API_KEY?.trim()) return false
  if (!(error instanceof AppError)) return false
  if (error.code !== 'MARKET_RESEARCH_UPSTREAM_ERROR') return false
  return (
    /\b429\b|rate.?limit|quota|credit|billing|no credits remaining/i.test(
      error.message,
    ) || error.statusCode === 429
  )
}

export const resilientMarketWebResearch =
  new ResilientMarketWebResearchService()
