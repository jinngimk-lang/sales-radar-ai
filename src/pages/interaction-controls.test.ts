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
  assert.match(composer, /Agent 回答/)
  assert.match(composer, /全网联系人搜索/)
  assert.match(composer, /onSearch/)
})

test('desktop sidebar remains above fixed composer and the composer cannot intercept sidebar clicks', async () => {
  const layout = await readSource('../components/layout/AppLayout.tsx')
  const page = await readSource('./AICommandCenterPage.tsx')

  assert.match(layout, /app-sidebar[^"\n]*z-40/)
  assert.match(page, /pointer-events-none/)
  assert.match(page, /pointer-events-auto/)
  assert.match(page, /lg:left-\[228px\]/)
  assert.doesNotMatch(page, /lg:pl-\[260px\]/)
})

test('revenue supervision always shows its process and interactive Browserbase live view', async () => {
  const operations = await readSource('./RevenueOperationsPage.tsx')
  const panel = await readSource('../features/revenue/RevenueLiveOpsPanel.tsx')

  assert.match(operations, /收益监督流程/)
  assert.match(operations, /发现机会/)
  assert.match(operations, /核验规则/)
  assert.match(operations, /执行实验/)
  assert.match(operations, /确认收益/)
  assert.match(operations, /结算到账/)
  assert.match(panel, /data-live-mode="interactive"/)
  assert.match(panel, /clipboard-read; clipboard-write/)
  assert.match(panel, /browserbase-disconnected/)
  assert.doesNotMatch(panel, /pointer-events:\s*none|pointer-events-none/)
})
