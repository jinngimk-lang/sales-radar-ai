import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

test('commercial targets are a first-class persisted workspace surface', async () => {
  const [app, layout, page, api] = await Promise.all([
    read('../App.tsx'),
    read('../components/layout/AppLayout.tsx'),
    read('./CommercialTargetsPage.tsx'),
    read('../services/commercial-targets.ts'),
  ])

  assert.match(app, /path="targets"/)
  assert.match(layout, /to: '\/app\/targets', label: '目标'/)
  assert.match(page, /listCommercialTargets/)
  assert.match(page, /createCommercialTarget/)
  assert.match(page, /updateCommercialTarget/)
  assert.match(page, /去市场雷达/)
  assert.match(page, /targetId=/)
  assert.match(api, /\/commercial-targets/)
  assert.match(api, /method: 'POST'/)
  assert.match(api, /method: 'PUT'/)
})

test('market radar restores an exact persisted target and records only successful exact-context runs', async () => {
  const market = await read('./MarketIntelligenceWorkspacePage.tsx')

  assert.match(market, /useSearchParams/)
  assert.match(market, /getCommercialTarget/)
  assert.match(market, /searchParams\.get\('targetId'\)/)
  assert.match(market, /commercialTargetToMarketTarget\(persistedTarget\)/)
  assert.match(market, /setTarget\(restoredTarget\)/)
  assert.match(market, /canRecordCommercialTargetRun\(target, persistedTargetSnapshot\)/)
  assert.match(market, /updateCommercialTarget/)
  assert.match(market, /lastRunAt: result\.completedAt/)
})
