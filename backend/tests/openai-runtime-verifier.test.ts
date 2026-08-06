import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OpenAIRuntimeVerifier } from '../src/services/openai-runtime-verifier.service.js'

describe('OpenAI runtime verifier', () => {
  it('reports not_configured without exposing credentials', async () => {
    const verifier = new OpenAIRuntimeVerifier({ environment: {} })

    const result = await verifier.verify()

    assert.deepEqual(result, {
      status: 'not_configured',
      provider: 'openai',
      model: 'gpt-5.2',
      checkedAt: null,
      errorCode: 'missing_api_key',
    })
    assert.equal(JSON.stringify(result).includes('apiKey'), false)
  })

  it('performs one minimal Responses API request and caches success', async () => {
    let calls = 0
    const verifier = new OpenAIRuntimeVerifier({
      environment: {
        OPENAI_API_KEY: 'secret-test-key',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        OPENAI_MODEL: 'gpt-test',
      },
      now: () => new Date('2026-08-06T03:00:00.000Z'),
      fetcher: async (input, init) => {
        calls += 1
        assert.equal(String(input), 'https://api.openai.com/v1/responses')
        assert.equal(init?.method, 'POST')
        assert.equal(
          (init?.headers as Record<string, string>).Authorization,
          'Bearer secret-test-key',
        )
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        assert.equal(body.model, 'gpt-test')
        assert.equal(body.max_output_tokens, 8)
        return new Response(JSON.stringify({ id: 'resp_test', model: 'gpt-test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    })

    const first = await verifier.verify()
    const second = await verifier.verify()

    assert.equal(first.status, 'ready')
    assert.equal(first.model, 'gpt-test')
    assert.equal(first.checkedAt, '2026-08-06T03:00:00.000Z')
    assert.equal(first.errorCode, null)
    assert.deepEqual(second, first)
    assert.equal(calls, 1)
  })

  it('sanitizes authentication and model failures', async () => {
    const authVerifier = new OpenAIRuntimeVerifier({
      environment: { OPENAI_API_KEY: 'bad-key', OPENAI_MODEL: 'gpt-test' },
      fetcher: async () => new Response('invalid secret details', { status: 401 }),
    })
    const modelVerifier = new OpenAIRuntimeVerifier({
      environment: { OPENAI_API_KEY: 'valid-key', OPENAI_MODEL: 'missing-model' },
      fetcher: async () => new Response('model details', { status: 404 }),
    })

    const auth = await authVerifier.verify()
    const model = await modelVerifier.verify()

    assert.equal(auth.status, 'error')
    assert.equal(auth.errorCode, 'authentication_failed')
    assert.equal(model.status, 'error')
    assert.equal(model.errorCode, 'model_not_found')
    assert.equal(JSON.stringify([auth, model]).includes('invalid secret details'), false)
  })

  it('reports timeout without throwing or crashing health checks', async () => {
    const verifier = new OpenAIRuntimeVerifier({
      environment: {
        OPENAI_API_KEY: 'test-key',
        OPENAI_RUNTIME_VERIFY_TIMEOUT_MS: '5',
      },
      fetcher: async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted')
            error.name = 'AbortError'
            reject(error)
          })
        }),
    })

    const result = await verifier.verify()

    assert.equal(result.status, 'error')
    assert.equal(result.errorCode, 'timeout')
  })
})
