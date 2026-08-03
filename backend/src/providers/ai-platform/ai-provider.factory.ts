import type { AIProvider } from './ai-provider.interface.js'
import { ruleBasedAIProvider } from './rule-based-ai.provider.js'
import { QwenAIProvider } from './qwen-ai.provider.js'
import { AITaskType } from './ai-task-type.js'

export interface AIProviderConfig {
  provider: string
  model: string
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
}

export function readAIProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  const provider =
    environment.AI_PROVIDER?.trim().toLowerCase() || 'rule-based'
  return {
    provider,
    model:
      environment.AI_MODEL?.trim() ||
      (provider === 'rule-based' ? 'rules-v1' : ''),
    apiKey: environment.AI_API_KEY?.trim() || undefined,
    baseUrl: environment.AI_BASE_URL?.trim() || undefined,
    timeoutMs: Number.parseInt(environment.AI_TIMEOUT_MS ?? '', 10) || 15_000,
  }
}

export class AIProviderFactory {
  private readonly providers = new Map<string, AIProvider>()

  constructor(
    private readonly config: AIProviderConfig = readAIProviderConfig(),
    private readonly fallback: AIProvider = ruleBasedAIProvider,
  ) {
    this.register(fallback)
    this.register(
      new QwenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      }),
    )
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider)
  }

  resolve(taskType?: AITaskType): AIProvider {
    if (
      taskType !== AITaskType.PRODUCT_UNDERSTANDING &&
      taskType !== AITaskType.LEAD_RESEARCH &&
      taskType !== AITaskType.OUTREACH_GENERATION
    ) {
      return this.fallback
    }
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
