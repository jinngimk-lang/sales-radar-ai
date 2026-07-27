import type { AIProvider } from './ai-provider.interface.js'
import { ruleBasedAIProvider } from './rule-based-ai.provider.js'

export interface AIProviderConfig {
  provider: string
  model: string
  apiKey?: string
}

export function readAIProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  return {
    provider: environment.AI_PROVIDER?.trim().toLowerCase() || 'rule-based',
    model: environment.AI_MODEL?.trim() || 'rules-v1',
    apiKey: environment.AI_API_KEY?.trim() || undefined,
  }
}

export class AIProviderFactory {
  private readonly providers = new Map<string, AIProvider>()

  constructor(
    private readonly config: AIProviderConfig = readAIProviderConfig(),
    private readonly fallback: AIProvider = ruleBasedAIProvider,
  ) {
    this.register(fallback)
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider)
  }

  resolve(): AIProvider {
    return (
      this.providers.get(this.config.provider.toLowerCase()) ?? this.fallback
    )
  }

  getFallback(): AIProvider {
    return this.fallback
  }

  getConfig(): AIProviderConfig {
    return { ...this.config }
  }
}

export const aiProviderFactory = new AIProviderFactory()
