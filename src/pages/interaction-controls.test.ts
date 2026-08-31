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

test('discovery mode switch keeps recommendation and proactive search as one understandable job', async () => {
  const [switcher, market, search] = await Promise.all([
    readSource('../components/discovery/DiscoveryModeSwitch.tsx'),
    readSource('./MarketIntelligenceWorkspacePage.tsx'),
    readSource('./TargetAwareDiscoverPage.tsx'),
  ])

  assert.match(switcher, /推荐信号/)
  assert.match(switcher, /主动搜索/)
  assert.match(switcher, /\/app\/market/)
  assert.match(switcher, /\/app\/discover/)
  assert.match(market, /mode="recommend"/)
  assert.match(search, /mode="search"/)
})
