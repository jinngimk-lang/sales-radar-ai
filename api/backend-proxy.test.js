import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import handler from './backend-proxy.js'

const originalBackendOrigin = process.env.BACKEND_ORIGIN
const originalFetch = globalThis.fetch

afterEach(() => {
  if (originalBackendOrigin === undefined) {
    delete process.env.BACKEND_ORIGIN
  } else {
    process.env.BACKEND_ORIGIN = originalBackendOrigin
  }
  globalThis.fetch = originalFetch
})

function createResponseRecorder() {
  return {
    statusCode: 200,
    headers: new Map(),
    jsonBody: undefined,
    sentBody: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(value) {
      this.jsonBody = value
      return this
    },
    setHeader(key, value) {
      this.headers.set(key.toLowerCase(), value)
    },
    send(value) {
      this.sentBody = value
      return this
    },
  }
}

test('returns an explicit 503 when BACKEND_ORIGIN is missing', async () => {
  delete process.env.BACKEND_ORIGIN
  const response = createResponseRecorder()

  await handler(
    { method: 'GET', headers: {}, query: { path: 'health' } },
    response,
  )

  assert.equal(response.statusCode, 503)
  assert.equal(response.jsonBody.error.code, 'BACKEND_NOT_CONFIGURED')
})

test('forwards API path, query, headers and JSON body to configured backend', async () => {
  process.env.BACKEND_ORIGIN = 'https://backend.example.com/some-ignored-path'
  let observedUrl
  let observedInit

  globalThis.fetch = async (url, init) => {
    observedUrl = String(url)
    observedInit = init
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: {
        'content-type': 'application/json',
        'x-upstream': 'yes',
      },
    })
  }

  const response = createResponseRecorder()
  await handler(
    {
      method: 'POST',
      headers: {
        host: 'sales-radar-ai.vercel.app',
        'content-type': 'application/json',
        authorization: 'Bearer test-token',
        'content-length': '99',
      },
      query: { path: 'search-task/item-1', includeBlocked: 'true' },
      body: { keyword: 'pump' },
    },
    response,
  )

  assert.equal(
    observedUrl,
    'https://backend.example.com/api/search-task/item-1?includeBlocked=true',
  )
  assert.equal(observedInit.method, 'POST')
  assert.equal(observedInit.headers.get('authorization'), 'Bearer test-token')
  assert.equal(observedInit.headers.get('host'), null)
  assert.equal(observedInit.headers.get('content-length'), null)
  assert.equal(observedInit.body, JSON.stringify({ keyword: 'pump' }))
  assert.equal(response.statusCode, 201)
  assert.equal(response.headers.get('x-upstream'), 'yes')
  assert.equal(JSON.parse(response.sentBody.toString()).ok, true)
})
