import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AIProviderFactory,
  readAIProviderConfig,
} from '../src/providers/ai-platform/ai-provider.factory.js'
import { AITaskType } from '../src/providers/ai-platform/ai-task-type.js'

describe('AI provider configuration', () => {
  it('reads dedicated Qwen credentials and defaults', () => {
    const config = readAIProviderConfig({
      AI_PROVIDER: 'qwen',
      QWEN_API_KEY: 'qwen-test-key',
    })

    assert.equal(config.provider, 'qwen')
    assert.equal(config.apiKey, 'qwen-test-key')
    assert.equal(config.model, 'qwen3.7-plus')
    assert.equal(
      config.baseUrl,
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    )
  })

  it('reads dedicated GLM credentials and defaults', () => {
    const config = readAIProviderConfig({
      AI_PROVIDER: 'glm',
      GLM_API_KEY: 'glm-test-key',
    })
    const factory = new AIProviderFactory(config)
    const provider = factory.resolve(AITaskType.LEAD_RESEARCH)

    assert.equal(config.apiKey, 'glm-test-key')
    assert.equal(config.model, 'glm-5.2')
    assert.equal(config.baseUrl, 'https://open.bigmodel.cn/api/paas/v4')
    assert.equal(provider.name, 'glm')
    assert.equal(provider.model, 'glm-5.2')
  })

  it('reads dedicated Kimi credentials and defaults', () => {
    const config = readAIProviderConfig({
      AI_PROVIDER: 'kimi',
      KIMI_API_KEY: 'kimi-test-key',
    })
    const factory = new AIProviderFactory(config)
    const provider = factory.resolve(AITaskType.OUTREACH_GENERATION)

    assert.equal(config.apiKey, 'kimi-test-key')
    assert.equal(config.model, 'kimi-k2.6')
    assert.equal(config.baseUrl, 'https://api.moonshot.cn/v1')
    assert.equal(provider.name, 'kimi')
    assert.equal(provider.model, 'kimi-k2.6')
  })

  it('keeps generic AI overrides above provider defaults', () => {
    const config = readAIProviderConfig({
      AI_PROVIDER: 'glm',
      AI_API_KEY: 'generic-key',
      AI_MODEL: 'glm-custom',
      AI_BASE_URL: 'https://gateway.example/v1',
      GLM_API_KEY: 'provider-key',
    })

    assert.equal(config.apiKey, 'generic-key')
    assert.equal(config.model, 'glm-custom')
    assert.equal(config.baseUrl, 'https://gateway.example/v1')
  })
})
