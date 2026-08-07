import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const accountSource = readFileSync(
  new URL('./AccountPage.tsx', import.meta.url),
  'utf8',
)
const apiSource = readFileSync(
  new URL('../services/api.ts', import.meta.url),
  'utf8',
)
const boundarySource = readFileSync(
  new URL('../components/errors/AppErrorBoundary.tsx', import.meta.url),
  'utf8',
)
const mainSource = readFileSync(
  new URL('../main.tsx', import.meta.url),
  'utf8',
)

test('settings tolerates partial runtime capability responses', () => {
  assert.match(accountSource, /normalizeRuntimeCapabilities/)
  assert.match(accountSource, /capability\?: RuntimeCapability/)
  assert.match(accountSource, /尚未报告运行状态/)
})

test('runtime capability requests time out instead of loading forever', () => {
  assert.match(apiSource, /DEFAULT_API_TIMEOUT_MS/)
  assert.match(apiSource, /AbortController/)
  assert.match(apiSource, /REQUEST_TIMEOUT/)
  assert.match(accountSource, /重新读取服务状态/)
})

test('the application owns a recoverable React error boundary', () => {
  assert.match(boundarySource, /componentDidCatch/)
  assert.match(boundarySource, /重新加载当前页面/)
  assert.match(mainSource, /AppErrorBoundary/)
})
