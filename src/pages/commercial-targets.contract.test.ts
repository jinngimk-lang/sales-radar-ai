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
  assert.match(page, /去搜索/)
  assert.match(page, /targetId=/)
  assert.match(api, /\/commercial-targets/)
  assert.match(api, /method: 'POST'/)
  assert.match(api, /method: 'PUT'/)
})

test('saved target cards expose real lifecycle, run progress, edit, close and workflow actions', async () => {
  const [page, api] = await Promise.all([
    read('./CommercialTargetsPage.tsx'),
    read('../services/commercial-targets.ts'),
  ])

  assert.match(api, /lastRunStatus: CommercialTargetRunStatus \| null/)
  assert.match(api, /lastRunStartedAt: string \| null/)
  assert.match(api, /lastRunCompletedAt: string \| null/)
  assert.match(api, /lastRunSourceCount: number \| null/)
  assert.match(api, /lastRunSignalCount: number \| null/)
  assert.match(api, /lastRunErrorCode: string \| null/)

  assert.match(page, /立即运行/)
  assert.match(page, /查看进度/)
  assert.match(page, /编辑/)
  assert.match(page, /关闭/)
  assert.match(page, /已关闭/)
  assert.match(page, /runMarketResearch/)
  assert.match(page, /targetId: target\.id/)
  assert.match(page, /status:\s*'CLOSED'/)
  assert.match(page, /lastRunStatus/)
  assert.match(page, /lastRunSourceCount/)
  assert.match(page, /lastRunSignalCount/)
  assert.match(page, /lastRunErrorCode/)
  assert.doesNotMatch(page, /\b\d+%\b/)
})

test('inactive targets cannot masquerade as active target context in market or proactive search', async () => {
  const [market, bridge] = await Promise.all([
    read('./MarketIntelligenceWorkspacePage.tsx'),
    read('./TargetAwareDiscoverPage.tsx'),
  ])

  assert.match(market, /persistedTarget\.status !== 'ACTIVE'/)
  assert.match(market, /目标已暂停或关闭/)
  assert.match(bridge, /value\.status !== 'ACTIVE'/)
  assert.match(bridge, /目标已暂停或关闭/)
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

test('saved target dimensions initialize the real discover filters and manual edits downgrade exact attribution', async () => {
  const [bridge, discover, mapping] = await Promise.all([
    read('./TargetAwareDiscoverPage.tsx'),
    read('./DiscoverPage.tsx'),
    read('../features/market-intelligence/discover-target-filters.ts'),
  ])

  assert.match(bridge, /mapCommercialTargetToDiscoverFilters/)
  assert.match(bridge, /discoverTargetFiltersMatch/)
  assert.match(bridge, /initialTargetFilters=/)
  assert.match(bridge, /onTargetFiltersChange=/)
  assert.match(bridge, /部分目标条件未映射/)
  assert.match(bridge, /当前关键词或结构化筛选已修改/)
  assert.match(bridge, /!exact && !hasUnmappedTargetFilters/)

  assert.match(discover, /initialTargetFilters\?\.region/)
  assert.match(discover, /initialTargetFilters\?\.customerType/)
  assert.match(discover, /initialTargetFilters\?\.industry/)
  assert.match(discover, /onTargetFiltersChange\?\./)

  assert.match(mapping, /ALL_INDUSTRIES\.find/)
  assert.match(mapping, /unmappedDimensions/)
  assert.match(mapping, /current\.region === expected\.region/)
  assert.match(mapping, /current\.customerType === expected\.customerType/)
})
