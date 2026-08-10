import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { OutreachContext } from '../src/providers/ai/ai-provider.interface.js'
import { AIProviderFactory } from '../src/providers/ai-platform/ai-provider.factory.js'
import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIProvider,
} from '../src/providers/ai-platform/ai-provider.interface.js'
import { AITaskType } from '../src/providers/ai-platform/ai-task-type.js'
import { RuleBasedAIProvider } from '../src/providers/ai-platform/rule-based-ai.provider.js'
import { AIResponseParser } from '../src/services/ai-response-parser.service.js'
import {
  OutreachAgentService,
  deriveCommunicationStyle,
} from '../src/services/outreach-agent.service.js'
import {
  PromptTemplateService,
  type PromptTemplateRepository,
} from '../src/services/prompt-template.service.js'

const outreachContext: OutreachContext = {
  contactName: 'Alex Morgan',
  company: 'Acme Manufacturing',
  industry: 'IndustrialManufacturing',
  role: 'procurement',
  jobTitle: 'Procurement Manager',
  location: 'United States',
  stage: 'explicit_purchase',
  angle: 'improve_efficiency',
  priority: 'A',
  evidence: ['Verified company and role'],
  buyingSignals: [
    {
      signal: 'Supplier search',
      evidence: 'Looking for an automation supplier',
      confidence: 90,
    },
  ],
  painPoint: 'Production downtime',
  valueProposition: 'Improve production efficiency',
}

class StaticProvider implements AIProvider {
  constructor(
    readonly name: string,
    readonly model: string,
    private readonly output: unknown,
    private readonly unavailable = false,
  ) {}

  async generate(_request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (this.unavailable) throw new Error('provider unavailable')
    return { output: this.output, provider: this.name, model: this.model }
  }
}

const noPrompt = new PromptTemplateService({
  findLatest: async () => null,
})

describe('AI Provider Platform v1', () => {
  it('runs the default RuleBased AI Provider', async () => {
    const provider = new RuleBasedAIProvider()
    const result = await provider.generate({
      taskType: AITaskType.OUTREACH_GENERATION,
      prompt: 'Generate outreach',
      context: {
        outreachContext: outreachContext as unknown as Record<string, unknown>,
      },
    })
    assert.equal(result.provider, 'rule-based')
    assert.equal(typeof result.output, 'object')
  })

  it('selects the configured provider through the factory', () => {
    const fallback = new StaticProvider('rule-based', 'rules-v1', {})
    const deepSeek = new StaticProvider('deepseek', 'deepseek-chat', {})
    const factory = new AIProviderFactory(
      { provider: 'deepseek', model: 'deepseek-chat', apiKey: 'test-only' },
      fallback,
    )
    factory.register(deepSeek)
    assert.equal(
      factory.resolve(AITaskType.PRODUCT_UNDERSTANDING),
      deepSeek,
    )
    assert.equal(
      factory.resolve(AITaskType.OUTREACH_GENERATION),
      deepSeek,
    )
    assert.equal(factory.getConfig().model, 'deepseek-chat')
  })

  it('derives language, tone and evidence from observed public content', () => {
    const style = deriveCommunicationStyle({
      postContent:
        '我们正在评估 MES API 与自动化系统集成方案，重点关注技术参数和交付可靠性。',
      platform: 'LinkedIn',
      interestTags: ['MES', '自动化', '系统集成'],
    })

    assert.equal(style.language, 'mixed')
    assert.equal(style.tone, 'technical')
    assert.equal(style.preferredPlatform, 'LinkedIn')
    assert.deepEqual(style.observedTopics, ['MES', '自动化', '系统集成'])
    assert.match(style.evidenceExcerpt, /交付可靠性/)
  })

  it('returns a safe fallback for illegal JSON and missing fields', () => {
    const parser = new AIResponseParser()
    const fallback = { status: 'safe', content: '' }
    const validator = (
      value: unknown,
    ): value is { status: string; content: string } =>
      Boolean(value) &&
      typeof value === 'object' &&
      typeof (value as { status?: unknown }).status === 'string' &&
      typeof (value as { content?: unknown }).content === 'string'

    assert.deepEqual(parser.parse('{invalid', validator, fallback), fallback)
    assert.deepEqual(
      parser.parse('{"status":"ok"}', validator, fallback),
      fallback,
    )
  })

  it('reads the latest Prompt Template by task type', async () => {
    let receivedTask: AITaskType | null = null
    const repository: PromptTemplateRepository = {
      findLatest: async (taskType) => {
        receivedTask = taskType
        return {
          id: 'prompt-1',
          name: 'Outreach prompt',
          taskType,
          template: 'Use verified evidence only.',
          version: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
    }
    const service = new PromptTemplateService(repository)
    const prompt = await service.getByTaskType(
      AITaskType.OUTREACH_GENERATION,
    )
    assert.equal(receivedTask, AITaskType.OUTREACH_GENERATION)
    assert.equal(prompt?.version, 2)
  })

  it('uses the unified AI Provider from Outreach Agent', async () => {
    const fallback = new RuleBasedAIProvider()
    const generated = await fallback.generate({
      taskType: AITaskType.OUTREACH_GENERATION,
      prompt: 'Generate outreach',
      context: {
        outreachContext: outreachContext as unknown as Record<string, unknown>,
      },
    })
    const primary = new StaticProvider(
      'openai',
      'configured-model',
      JSON.stringify(generated.output),
    )
    const service = new OutreachAgentService(primary, fallback, noPrompt)
    const result = await service.generateContent(outreachContext)

    assert.equal(result.provider, 'openai')
    assert.match(result.content.email.body, /improve production efficiency/i)
    assert.doesNotMatch(result.content.email.body, /already buying|confirmed purchase/i)
  })

  it('falls back when the configured AI Provider is unavailable', async () => {
    const fallback = new RuleBasedAIProvider()
    const unavailable = new StaticProvider(
      'deepseek',
      'deepseek-chat',
      null,
      true,
    )
    const service = new OutreachAgentService(
      unavailable,
      fallback,
      noPrompt,
    )
    const result = await service.generateContent(outreachContext)

    assert.equal(result.provider, 'rule-based')
    assert.match(result.content.email.body, /improve production efficiency/i)
    assert.doesNotMatch(result.content.email.body, /already buying|confirmed purchase/i)
  })
})
