import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AIProviderFactory } from '../src/providers/ai-platform/ai-provider.factory.js'
import { AITaskType } from '../src/providers/ai-platform/ai-task-type.js'
import { QwenAIProvider } from '../src/providers/ai-platform/qwen-ai.provider.js'
import { RuleBasedAIProvider } from '../src/providers/ai-platform/rule-based-ai.provider.js'
import { RuleBasedProductUnderstandingProvider } from '../src/providers/product-understanding/rule-based-product-understanding.provider.js'
import { AIResponseParser } from '../src/services/ai-response-parser.service.js'
import {
  AIUsageLogService,
  type AIUsageEntry,
} from '../src/services/ai-usage-log.service.js'
import { ProductUnderstandingService } from '../src/services/product-understanding.service.js'
import { PromptTemplateService } from '../src/services/prompt-template.service.js'

const fallback = new RuleBasedAIProvider()
const productRules = new RuleBasedProductUnderstandingProvider()
const noPrompt = new PromptTemplateService({ findLatest: async () => null })

function fetchResponse(output: unknown): typeof fetch {
  return (async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(output) } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch
}

function usageHarness() {
  const entries: AIUsageEntry[] = []
  const service = new AIUsageLogService({
    create: async (entry) => {
      entries.push(entry)
      return entry
    },
  })
  return { entries, service }
}

async function validProductResult() {
  return productRules.understand('industrial robots')
}

describe('Real AI Provider Integration v1', () => {
  it('calls Qwen through an injected HTTP mock', async () => {
    let requestedUrl = ''
    let authorization = ''
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = String(input)
      authorization = new Headers(init?.headers).get('Authorization') ?? ''
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"status":"ok"}' } }],
        }),
        { status: 200 },
      )
    }) as typeof fetch
    const provider = new QwenAIProvider(
      {
        apiKey: 'test-key',
        model: 'test-model',
        baseUrl: 'https://qwen.invalid/chat/completions',
        timeoutMs: 1000,
      },
      fetcher,
    )
    const result = await provider.generate({
      taskType: AITaskType.PRODUCT_UNDERSTANDING,
      prompt: 'Return JSON',
      context: { query: 'industrial robots' },
    })

    assert.equal(requestedUrl, 'https://qwen.invalid/chat/completions')
    assert.equal(authorization, 'Bearer test-key')
    assert.equal(result.provider, 'qwen')
    assert.equal(result.output, '{"status":"ok"}')
  })

  it('selects Qwen for Product Understanding through the factory', () => {
    const factory = new AIProviderFactory({
      provider: 'qwen',
      model: 'qwen-plus',
      apiKey: 'test-key',
      baseUrl: 'https://qwen.invalid',
      timeoutMs: 1000,
    })
    assert.equal(
      factory.resolve(AITaskType.PRODUCT_UNDERSTANDING).name,
      'qwen',
    )
    assert.equal(
      factory.resolve(AITaskType.LEAD_RESEARCH).name,
      'qwen',
    )
    assert.equal(
      factory.resolve(AITaskType.OUTREACH_GENERATION).name,
      'qwen',
    )
  })

  it('falls back when the Qwen API key is missing', async () => {
    const qwen = new QwenAIProvider({
      model: 'qwen-plus',
      baseUrl: 'https://qwen.invalid',
    })
    const usage = usageHarness()
    const service = new ProductUnderstandingService(
      qwen,
      fallback,
      productRules,
      noPrompt,
      new AIResponseParser(),
      usage.service,
    )
    const result = await service.understand('industrial robots')

    assert.equal(result.provider, 'rule-based')
    assert.equal(result.productUnderstanding.productName, 'Industrial Robots')
    assert.equal(entriesBySuccess(usage.entries, false), 1)
  })

  it('falls back when the Qwen API request fails', async () => {
    const failingFetch = (async () => {
      throw new Error('network unavailable')
    }) as typeof fetch
    const qwen = new QwenAIProvider(
      {
        apiKey: 'test-key',
        model: 'qwen-plus',
        baseUrl: 'https://qwen.invalid',
      },
      failingFetch,
    )
    const usage = usageHarness()
    const service = new ProductUnderstandingService(
      qwen,
      fallback,
      productRules,
      noPrompt,
      new AIResponseParser(),
      usage.service,
    )
    const result = await service.understand('B2B SaaS')

    assert.equal(result.provider, 'rule-based')
    assert.equal(result.productUnderstanding.industry, 'Software')
    assert.equal(entriesBySuccess(usage.entries, false), 1)
  })

  it('uses a valid Qwen result in Product Understanding', async () => {
    const output = await validProductResult()
    output.productUnderstanding.productName = 'AI Industrial Robotics'
    const qwen = new QwenAIProvider(
      {
        apiKey: 'test-key',
        model: 'qwen-plus',
        baseUrl: 'https://qwen.invalid',
      },
      fetchResponse(output),
    )
    const usage = usageHarness()
    const service = new ProductUnderstandingService(
      qwen,
      fallback,
      productRules,
      noPrompt,
      new AIResponseParser(),
      usage.service,
    )
    const result = await service.understand('industrial robots')

    assert.equal(result.provider, 'qwen')
    assert.equal(
      result.productUnderstanding.productName,
      'AI Industrial Robotics',
    )
  })

  it('records successful and failed AI usage without prompt content', async () => {
    const output = await validProductResult()
    const successUsage = usageHarness()
    const successService = new ProductUnderstandingService(
      new QwenAIProvider(
        {
          apiKey: 'test-key',
          model: 'qwen-plus',
          baseUrl: 'https://qwen.invalid',
        },
        fetchResponse(output),
      ),
      fallback,
      productRules,
      noPrompt,
      new AIResponseParser(),
      successUsage.service,
    )
    await successService.understand('industrial robots')

    const failedUsage = usageHarness()
    const failedService = new ProductUnderstandingService(
      new QwenAIProvider({
        model: 'qwen-plus',
        baseUrl: 'https://qwen.invalid',
      }),
      fallback,
      productRules,
      noPrompt,
      new AIResponseParser(),
      failedUsage.service,
    )
    await failedService.understand('industrial robots')

    assert.equal(entriesBySuccess(successUsage.entries, true), 1)
    assert.equal(entriesBySuccess(failedUsage.entries, false), 1)
    assert.ok(
      [...successUsage.entries, ...failedUsage.entries].every(
        (entry) =>
          !('prompt' in entry) &&
          !('context' in entry) &&
          entry.latencyMs >= 0,
      ),
    )
  })
})

function entriesBySuccess(entries: AIUsageEntry[], success: boolean): number {
  return entries.filter(
    (entry) => entry.provider === 'qwen' && entry.success === success,
  ).length
}
