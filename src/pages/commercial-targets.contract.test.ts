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

test('market radar restores an exact persisted target and delegates run evidence to the backend', async () => {
  const market = await read('./MarketIntelligenceWorkspacePage.tsx')

  assert.match(market, /useSearchParams/)
  assert.match(market, /getCommercialTarget/)
  assert.match(market, /searchParams\.get\('targetId'\)/)
  assert.match(market, /commercialTargetToMarketTarget\(persistedTarget\)/)
  assert.match(market, /setTarget\(restoredTarget\)/)
  assert.match(
    market,
    /canRecordCommercialTargetRun\(\s*target,\s*persistedTargetSnapshot,?\s*\)/,
  )
  assert.match(market, /targetId:/)
  assert.doesNotMatch(market, /lastRunAt: result\.completedAt/)
  assert.doesNotMatch(market, /updateCommercialTarget\(commercialTargetId/)
})

test('an exact persisted target crosses from recommendation into target-aware proactive search', async () => {
  const [app, market, bridge, compiler] = await Promise.all([
    read('../App.tsx'),
    read('./MarketIntelligenceWorkspacePage.tsx'),
    read('./TargetAwareDiscoverPage.tsx'),
    read('../features/market-intelligence/commercial-target-search.ts'),
  ])

  assert.match(app, /TargetAwareDiscoverPage/)
  assert.match(market, /params\.set\('targetId', commercialTargetId\)/)
  assert.match(market, /commercialTargetId && targetMatchesPersisted/)
  assert.match(bridge, /getCommercialTarget\(targetId\)/)
  assert.match(bridge, /buildCommercialTargetSearchExpression/)
  assert.match(bridge, /目标意图已应用/)
  assert.match(bridge, /临时关键词/)
  assert.match(bridge, /本次搜索按临时关键词执行，不冒充已保存目标意图/)
  assert.match(bridge, /实际筛选以页面选择为准/)
  assert.match(compiler, /FIND_BUYERS: \['买家', '采购', '采购需求'\]/)
  assert.match(compiler, /FIND_SUPPLIERS: \['供应商', '制造商', '供货'\]/)
  assert.match(compiler, /RESEARCH_COMPETITORS: \['竞品', '竞争对手', '替代方案'\]/)
})
