import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  OpenAISalesAgentService,
  readOpenAISalesAgentConfig,
  type OpenAIResponseClient,
  type SalesToolExecutor,
} from '../src/services/openai-sales-agent.service.js'

describe('OpenAI sales agent', () => {
  it('selects GPT-5.6 Sol and OpenAI credentials by default', () => {
    const config = readOpenAISalesAgentConfig({
      OPENAI_API_KEY: 'test-key',
    })

    assert.equal(config.model, 'gpt-5.6-sol')
    assert.equal(config.baseUrl, 'https://api.openai.com/v1')
    assert.equal(config.reasoningEffort, 'medium')
    assert.equal(config.apiKey, 'test-key')
  })

  it('executes requested tools and returns a visible action trace', async () => {
    const requests: Array<Record<string, unknown>> = []
    const responses = [
      {
        model: 'gpt-5.6-sol',
        output: [
          {
            type: 'function_call',
            name: 'list_sales_candidates',
            call_id: 'call_1',
            arguments: '{"limit":5}',
          },
        ],
      },
      {
        model: 'gpt-5.6-sol',
        output_text: '已找到 1 个真实对象，并给出下一步。',
        output: [],
      },
    ]
    const client: OpenAIResponseClient = {
      async create(request) {
        requests.push(request)
        return responses.shift() ?? { output: [] }
      },
    }
    const calls: Array<{ tool: string; input: Record<string, unknown> }> = []
    const executor: SalesToolExecutor = {
      async execute(tool, input) {
        calls.push({ tool, input })
        return {
          total: 1,
          leads: [{ id: 'cmscuhnxg0002p2012gnahlrx', displayName: 'Alex' }],
        }
      },
    }
    const service = new OpenAISalesAgentService(
      {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        timeoutMs: 1_000,
        maxToolRounds: 3,
      },
      client,
      executor,
    )

    const result = await service.run({ message: '选出最好的客户' })

    assert.equal(calls.length, 1)
    assert.equal(calls[0]?.tool, 'list_sales_candidates')
    assert.equal(result.actions.length, 1)
    assert.equal(result.actions[0]?.status, 'completed')
    assert.equal(result.message, '已找到 1 个真实对象，并给出下一步。')
    assert.deepEqual(result.leadIds, ['cmscuhnxg0002p2012gnahlrx'])
    assert.equal(requests.length, 2)
    assert.equal(requests[0]?.store, false)
  })

  it('does not pretend GPT is active without a backend key', async () => {
    const service = new OpenAISalesAgentService(
      {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        timeoutMs: 1_000,
        maxToolRounds: 3,
      },
      { create: async () => ({ output: [] }) },
      { execute: async () => ({}) },
    )

    await assert.rejects(
      service.run({ message: '寻找客户' }),
      (error: unknown) =>
        error instanceof Error && /OPENAI_API_KEY/.test(error.message),
    )
  })

  it('uses a server-approved model selected by the customer', async () => {
    const requests: Array<Record<string, unknown>> = []
    const service = new OpenAISalesAgentService(
      {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        timeoutMs: 1_000,
        maxToolRounds: 3,
      },
      {
        async create(request) {
          requests.push(request)
          return { model: 'gpt-5.6-luna', output_text: '完成', output: [] }
        },
      },
      { execute: async () => ({}) },
    )

    const result = await service.run({
      message: '快速筛选现有客户',
      model: 'gpt-5.6-luna',
    })

    assert.equal(requests[0]?.model, 'gpt-5.6-luna')
    assert.equal(result.model, 'gpt-5.6-luna')
  })

  it('rejects arbitrary client model ids', async () => {
    const service = new OpenAISalesAgentService(
      {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        timeoutMs: 1_000,
        maxToolRounds: 3,
      },
      { create: async () => ({ output: [] }) },
      { execute: async () => ({}) },
    )

    await assert.rejects(
      service.run({ message: '寻找客户', model: 'arbitrary-model' }),
      (error: unknown) =>
        error instanceof Error && /not enabled/.test(error.message),
    )
  })
})
