import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('AI home keeps Agent and no-GPT global contact search as separate actions', async () => {
  const page = await readSource('./AICommandCenterPage.tsx')
  const composer = await readSource('../features/command-center/CommandComposer.tsx')

  assert.match(page, /searchCustomers/)
  assert.match(page, /runDirectSearch/)
  assert.match(page, /getChatSessions/)
  assert.match(composer, /onSearch/)
  assert.match(composer, /onSubmit/)
  assert.match(composer, /runningMode === 'search'/)
  assert.match(composer, /runningMode === 'agent'/)
})

test('desktop sidebar remains above fixed composer and the composer cannot intercept sidebar clicks', async () => {
  const layout = await readSource('../components/layout/AppLayout.tsx')
  const page = await readSource('./AICommandCenterPage.tsx')

  assert.match(layout, /app-sidebar[^"\n]*z-40/)
  assert.match(page, /pointer-events-none/)
  assert.match(page, /pointer-events-auto/)
  assert.match(page, /lg:left-\[208px\]/)
  assert.doesNotMatch(page, /lg:pl-\[260px\]/)
})

test('revenue supervision keeps the full process and interactive Browserbase live view after visual compaction', async () => {
  const operations = await readSource('./RevenueOperationsPage.tsx')
  const panel = await readSource('../features/revenue/RevenueLiveOpsPanel.tsx')

  for (const label of ['发现', '核验', '执行', '确认', '到账']) {
    assert.match(operations, new RegExp(label))
  }
  assert.match(panel, /data-live-mode="interactive"/)
  assert.match(panel, /clipboard-read; clipboard-write/)
  assert.match(panel, /browserbase-disconnected/)
  assert.doesNotMatch(panel, /pointer-events:\s*none|pointer-events-none/)
})

test('communication and intent translate missing full backend errors instead of exposing raw runtime copy', async () => {
  const presenter = await readSource('../services/api-errors.ts')
  const communication = await readSource('./CommunicationWorkspacePage.tsx')
  const intent = await readSource('./VerifiedIntentPage.tsx')

  assert.match(presenter, /export function getUserFacingApiError/)
  assert.match(presenter, /BACKEND_NOT_CONFIGURED/)
  assert.match(presenter, /完整后端未连接，当前功能暂不可用/)
  assert.match(communication, /getUserFacingApiError/)
  assert.match(intent, /getUserFacingApiError/)
  assert.doesNotMatch(communication, /cause instanceof Error \? cause\.message/)
  assert.doesNotMatch(intent, /cause instanceof Error \? cause\.message/)
})
