import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BrowserbaseAgentProvider,
  type BrowserbaseFetch,
} from '../src/providers/browserbase-agent.provider.js'

interface RecordedCall {
  url: string
  init?: RequestInit
}

function createRecorder(
  responder: (url: URL, init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: RecordedCall[] = []
  const fetchImpl: BrowserbaseFetch = async (input, init) => {
    const url = new URL(String(input))
    calls.push({ url: url.toString(), init })
    return responder(url, init)
  }
  return { calls, fetchImpl }
}

test('creates an agent run through the official endpoint with server-owned restrictions', async () => {
  const { calls, fetchImpl } = createRecorder(() =>
    Response.json({
      runId: 'run-1',
      status: 'PENDING',
      task: 'read-only task',
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:00Z',
    }),
  )
  const provider = new BrowserbaseAgentProvider({
    apiKey: 'bb_test',
    baseUrl: 'https://api.browserbase.test/',
    fetchImpl,
  })

  const run = await provider.createRun('read-only task')

  assert.equal(run.runId, 'run-1')
  assert.equal(calls[0]?.url, 'https://api.browserbase.test/v1/agents/runs')
  assert.equal(calls[0]?.init?.method, 'POST')
  const headers = new Headers(calls[0]?.init?.headers)
  assert.equal(headers.get('X-BB-API-Key'), 'bb_test')
  const body = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>
  assert.equal(body.task, 'read-only task')
  assert.deepEqual(body.browserSettings, { proxies: false, verified: false })
  assert.equal((body.resultSchema as { type?: string }).type, 'object')
})

test('retrieves a run and polls messages with a cursor', async () => {
  const { calls, fetchImpl } = createRecorder((url) => {
    if (url.pathname.endsWith('/messages')) {
      return Response.json({
        data: [
          {
            id: 'message-1',
            createdAt: '2026-08-06T00:00:01Z',
            message: { role: 'assistant', content: 'Opened public page' },
          },
        ],
        nextSince: 'message-1',
      })
    }
    return Response.json({
      runId: 'run-1',
      status: 'RUNNING',
      task: 'read-only task',
      sessionId: 'session-1',
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:01Z',
    })
  })
  const provider = new BrowserbaseAgentProvider({
    apiKey: 'bb_test',
    baseUrl: 'https://api.browserbase.test',
    fetchImpl,
  })

  const run = await provider.retrieveRun('run-1')
  const messages = await provider.listMessages('run-1', 'message-0')

  assert.equal(run.sessionId, 'session-1')
  assert.equal(messages.nextSince, 'message-1')
  assert.equal(messages.data[0]?.id, 'message-1')
  assert.equal(
    calls[0]?.url,
    'https://api.browserbase.test/v1/agents/runs/run-1',
  )
  assert.equal(
    calls[1]?.url,
    'https://api.browserbase.test/v1/agents/runs/run-1/messages?all=true&since=message-0',
  )
})

test('returns only safe Browserbase Live View fields', async () => {
  const { fetchImpl } = createRecorder(() =>
    Response.json({
      debuggerFullscreenUrl: 'https://www.browserbase.com/sessions/fullscreen',
      debuggerUrl: 'https://www.browserbase.com/sessions/debug',
      wsUrl: 'wss://secret-connect-url',
      signingKey: 'secret-signing-key',
      pages: [
        {
          id: 'page-1',
          debuggerFullscreenUrl: 'https://www.browserbase.com/pages/fullscreen',
          debuggerUrl: 'https://www.browserbase.com/pages/debug',
          faviconUrl: 'https://example.com/favicon.ico',
          title: 'Example opportunity',
          url: 'https://example.com/bounty?token=secret#private',
        },
      ],
    }),
  )
  const provider = new BrowserbaseAgentProvider({
    apiKey: 'bb_test',
    baseUrl: 'https://api.browserbase.test',
    fetchImpl,
  })

  const liveView = await provider.getLiveView('session-1')

  assert.deepEqual(liveView, {
    debuggerFullscreenUrl: 'https://www.browserbase.com/sessions/fullscreen',
    debuggerUrl: 'https://www.browserbase.com/sessions/debug',
    pages: [
      {
        id: 'page-1',
        debuggerFullscreenUrl: 'https://www.browserbase.com/pages/fullscreen',
        debuggerUrl: 'https://www.browserbase.com/pages/debug',
        faviconUrl: 'https://example.com/favicon.ico',
        title: 'Example opportunity',
        url: 'https://example.com/bounty',
      },
    ],
  })
  assert.equal('wsUrl' in liveView, false)
  assert.equal('signingKey' in liveView, false)
})

test('releases a Browserbase session through REQUEST_RELEASE', async () => {
  const { calls, fetchImpl } = createRecorder(() =>
    Response.json({
      id: 'session-1',
      status: 'COMPLETED',
      createdAt: '2026-08-06T00:00:00Z',
      updatedAt: '2026-08-06T00:00:01Z',
      startedAt: '2026-08-06T00:00:00Z',
      expiresAt: '2026-08-06T01:00:00Z',
      keepAlive: false,
      projectId: 'project-1',
      proxyBytes: 0,
      region: 'ap-southeast-1',
    }),
  )
  const provider = new BrowserbaseAgentProvider({
    apiKey: 'bb_test',
    baseUrl: 'https://api.browserbase.test',
    fetchImpl,
  })

  await provider.releaseSession('session-1')

  assert.equal(
    calls[0]?.url,
    'https://api.browserbase.test/v1/sessions/session-1',
  )
  assert.equal(calls[0]?.init?.method, 'POST')
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    status: 'REQUEST_RELEASE',
  })
})

test('throws a sanitized application error for provider failures', async () => {
  const { fetchImpl } = createRecorder(() =>
    Response.json(
      { error: 'invalid key bb_secret_should_not_escape' },
      { status: 401 },
    ),
  )
  const provider = new BrowserbaseAgentProvider({
    apiKey: 'bb_secret_should_not_escape',
    baseUrl: 'https://api.browserbase.test',
    fetchImpl,
  })

  await assert.rejects(
    () => provider.retrieveRun('run-1'),
    (error: unknown) => {
      assert.equal(typeof error, 'object')
      assert.equal((error as { code?: string }).code, 'BROWSERBASE_REQUEST_FAILED')
      assert.doesNotMatch(String((error as Error).message), /bb_secret|invalid key/i)
      return true
    },
  )
})
