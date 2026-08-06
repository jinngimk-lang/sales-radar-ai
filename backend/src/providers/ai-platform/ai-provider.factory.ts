import type { AIProvider } from './ai-provider.interface.js'
import { OpenAICompatibleAIProvider } from './openai-compatible-ai.provider.js'
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

interface ProviderDefaults {
  apiKeyVariable: string
  baseUrlVariable: string
  modelVariable: string
  baseUrl: string
  model: string
  timeoutMs: number
}

const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  qwen: {
    apiKeyVariable: 'QWEN_API_KEY',
    baseUrlVariable: 'QWEN_BASE_URL',
    modelVariable: 'QWEN_MODEL',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen3.7-plus',
    timeoutMs: 30_000,
  },
  glm: {
    apiKeyVariable: 'GLM_API_KEY',
    baseUrlVariable: 'GLM_BASE_URL',
    modelVariable: 'GLM_MODEL',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-5.2',
    timeoutMs: 30_000,
  },
  kimi: {
    apiKeyVariable: 'KIMI_API_KEY',
    baseUrlVariable: 'KIMI_BASE_URL',
    modelVariable: 'KIMI_MODEL',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'kimi-k2.6',
    timeoutMs: 30_000,
  },
  openai: {
    apiKeyVariable: 'OPENAI_API_KEY',
    baseUrlVariable: 'OPENAI_BASE_URL',
    modelVariable: 'OPENAI_MODEL',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.6-sol',
    timeoutMs: 120_000,
  },
}

export function readAIProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  const provider = resolveProvider(environment)
  if (provider === 'rule-based') {
    return {
      provider,
      model: 'rules-v1',
      timeoutMs: readPositiveInteger(environment.AI_TIMEOUT_MS) ?? 15_000,
      reasoningEffort: parseReasoningEffort(
        environment.OPENAI_REASONING_EFFORT,
      ),
    }
  }

  const defaults = PROVIDER_DEFAULTS[provider]
  if (!defaults) {
    return {
      provider,
      model: environment.AI_MODEL?.trim() || '',
      apiKey: environment.AI_API_KEY?.trim() || undefined,
      baseUrl: environment.AI_BASE_URL?.trim() || undefined,
      timeoutMs:
        readPositiveInteger(environment.AI_TIMEOUT_MS) ?? 30_000,
      reasoningEffort: parseReasoningEffort(
        environment.OPENAI_REASONING_EFFORT,
      ),
    }
  }

  const providerApiKey = environment[defaults.apiKeyVariable]?.trim()
  const providerBaseUrl = environment[defaults.baseUrlVariable]?.trim()
  const providerModel = environment[defaults.modelVariable]?.trim()

  return {
    provider,
    model:
      environment.AI_MODEL?.trim() || providerModel || defaults.model,
    apiKey:
      environment.AI_API_KEY?.trim() || providerApiKey || undefined,
    baseUrl:
      environment.AI_BASE_URL?.trim() ||
      providerBaseUrl ||
      defaults.baseUrl,
    timeoutMs:
      readPositiveInteger(environment.AI_TIMEOUT_MS) ??
      (provider === 'openai'
        ? readPositiveInteger(environment.OPENAI_TIMEOUT_MS)
        : undefined) ??
      defaults.timeoutMs,
    reasoningEffort: parseReasoningEffort(
      environment.OPENAI_REASONING_EFFORT,
    ),
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
        model: config.provider === 'qwen' ? config.model : undefined,
        baseUrl: config.provider === 'qwen' ? config.baseUrl : undefined,
        timeoutMs: config.timeoutMs,
      }),
    )
    this.register(
      new OpenAICompatibleAIProvider({
        name: 'glm',
        apiKey: config.provider === 'glm' ? config.apiKey : undefined,
        model: config.provider === 'glm' ? config.model : undefined,
        baseUrl: config.provider === 'glm' ? config.baseUrl : undefined,
        timeoutMs: config.timeoutMs,
      }),
    )
    this.register(
      new OpenAICompatibleAIProvider({
        name: 'kimi',
        apiKey: config.provider === 'kimi' ? config.apiKey : undefined,
        model: config.provider === 'kimi' ? config.model : undefined,
        baseUrl: config.provider === 'kimi' ? config.baseUrl : undefined,
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

function resolveProvider(environment: NodeJS.ProcessEnv): string {
  const explicit = environment.AI_PROVIDER?.trim().toLowerCase()
  if (explicit) return explicit
  if (environment.OPENAI_API_KEY?.trim()) return 'openai'
  if (environment.QWEN_API_KEY?.trim()) return 'qwen'
  if (environment.GLM_API_KEY?.trim()) return 'glm'
  if (environment.KIMI_API_KEY?.trim()) return 'kimi'
  return 'rule-based'
}

function readPositiveInteger(value: string | undefined): number | undefined {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
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
