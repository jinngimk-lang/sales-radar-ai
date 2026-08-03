import type { AIProvider } from './ai-provider.interface.js'
import { OpenAIResponsesProvider } from './openai-responses.provider.js'
import { ruleBasedAIProvider } from './rule-based-ai.provider.js'
import { QwenAIProvider } from './qwen-ai.provider.js'
import { AITaskType } from './ai-task-type.js'

export interface AIProviderConfig {
  provider: string
  model: string
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
}

export function readAIProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  const explicitProvider = environment.AI_PROVIDER?.trim().toLowerCase()
  const provider =
    explicitProvider ||
    (environment.OPENAI_API_KEY?.trim() ? 'openai' : 'rule-based')
  const isOpenAI = provider === 'openai'
  const reasoningEffort = parseReasoningEffort(
    environment.OPENAI_REASONING_EFFORT,
  )

  return {
    provider,
    model:
      environment.AI_MODEL?.trim() ||
      (isOpenAI ? environment.OPENAI_MODEL?.trim() || 'gpt-5.6-sol' : '') ||
      (provider === 'rule-based' ? 'rules-v1' : ''),
    apiKey:
      (isOpenAI
        ? environment.OPENAI_API_KEY?.trim() || environment.AI_API_KEY?.trim()
        : environment.AI_API_KEY?.trim()) || undefined,
    baseUrl:
      (isOpenAI
        ? environment.OPENAI_BASE_URL?.trim() ||
          environment.AI_BASE_URL?.trim() ||
          'https://api.openai.com/v1'
        : environment.AI_BASE_URL?.trim()) || undefined,
    timeoutMs:
      Number.parseInt(
        (isOpenAI
          ? environment.OPENAI_TIMEOUT_MS
          : environment.AI_TIMEOUT_MS) ?? '',
        10,
      ) || (isOpenAI ? 120_000 : 15_000),
    reasoningEffort,
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
        apiKey: config.provider === 'qwen' ? config.apiKey : undefined,
        model: config.model,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
      }),
    )
    this.register(
      new OpenAIResponsesProvider({
        apiKey: config.provider === 'openai' ? config.apiKey : undefined,
        model: config.provider === 'openai' ? config.model : undefined,
        baseUrl: config.provider === 'openai' ? config.baseUrl : undefined,
        timeoutMs: config.timeoutMs,
        reasoningEffort: config.reasoningEffort,
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

function parseReasoningEffort(
  value: string | undefined,
): AIProviderConfig['reasoningEffort'] {
  return ['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(
    value?.trim() ?? '',
  )
    ? (value!.trim() as AIProviderConfig['reasoningEffort'])
    : 'medium'
}

export const aiProviderFactory = new AIProviderFactory()
