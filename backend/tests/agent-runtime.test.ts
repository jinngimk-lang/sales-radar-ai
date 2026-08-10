import assert from 'node:assert/strict'
import test from 'node:test'
import { AgentRuntimeFactory } from '../src/providers/agent-runtime/agent-runtime.factory.js'
import { LiveKitAgentRuntime } from '../src/providers/agent-runtime/livekit-agent.runtime.js'

test('agent runtime factory keeps OpenAI as the default implementation', () => {
  const openai = { name: 'openai' as const, run: async () => result('openai') }
  const livekit = { name: 'livekit' as const, run: async () => result('livekit') }
  const factory = new AgentRuntimeFactory({ openai, livekit })

  assert.equal(factory.resolve({}).name, 'openai')
  assert.equal(factory.resolve({ AGENT_RUNTIME_PROVIDER: 'livekit' }).name, 'livekit')
  assert.throws(
    () => factory.resolve({ AGENT_RUNTIME_PROVIDER: 'unsupported' }),
    /Unsupported agent runtime provider/,
  )
})

test('LiveKit bridge uses the stable agent runtime contract and validates output', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const runtime = new LiveKitAgentRuntime({
    baseUrl: 'https://agents.example',
    token: 'runtime-secret',
    fetcher: async (input, init) => {
      calls.push({ url: String(input), init })
      return new Response(JSON.stringify({ data: result('livekit') }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })

  const output = await runtime.run({
    message: '研究这个真实机会',
    userId: 'user-1',
    leadId: 'lead-1',
  })

  assert.equal(output.provider, 'livekit')
  assert.equal(calls[0]?.url, 'https://agents.example/v1/agent/runs')
  assert.equal(
    new Headers(calls[0]?.init?.headers).get('authorization'),
    'Bearer runtime-secret',
  )
  const body = JSON.parse(String(calls[0]?.init?.body))
  assert.equal(body.message, '研究这个真实机会')
  assert.equal(body.userId, 'user-1')
})

test('LiveKit bridge rejects malformed output instead of inventing an answer', async () => {
  const runtime = new LiveKitAgentRuntime({
    baseUrl: 'https://agents.example',
    fetcher: async () => new Response(JSON.stringify({ data: { message: 12 } }), { status: 200 }),
  })

  await assert.rejects(() => runtime.run({ message: 'test' }), /invalid response/i)
})

function result(provider: 'openai' | 'livekit') {
  return {
    message: '基于真实来源，建议先验证项目阶段。',
    actions: [],
    leadIds: [],
    provider,
    model: provider === 'livekit' ? 'livekit-bridge' : 'gpt-5.6-sol',
    traceId: 'trace-1',
    requiresApproval: true,
  }
}
