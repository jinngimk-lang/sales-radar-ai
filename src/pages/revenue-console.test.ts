import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appSource = await readFile(new URL('../App.tsx', import.meta.url), 'utf8')
const layoutSource = await readFile(
  new URL('../components/layout/AppLayout.tsx', import.meta.url),
  'utf8',
)
const pageSource = await readFile(
  new URL('./RevenueDashboardPage.tsx', import.meta.url),
  'utf8',
)
const operationsPageSource = await readFile(
  new URL('./RevenueOperationsPage.tsx', import.meta.url),
  'utf8',
)
const livePanelSource = await readFile(
  new URL('../features/revenue/RevenueLiveOpsPanel.tsx', import.meta.url),
  'utf8',
)
const liveApiSource = await readFile(
  new URL('../features/revenue/revenue-live-api.ts', import.meta.url),
  'utf8',
)

test('revenue center is reachable from the marketplace workspace navigation', () => {
  assert.match(appSource, /path="revenue"/)
  assert.match(appSource, /RevenueOperationsPage/)
  assert.match(layoutSource, /to: '\/app\/revenue', label: '收益'/)
})

test('revenue center separates potential rewards from confirmed revenue', () => {
  assert.match(pageSource, /潜在收益/)
  assert.match(pageSource, /已确认收益/)
  assert.match(pageSource, /已到账/)
  assert.match(pageSource, /不计入已确认收益/)
})

test('revenue center explains how market research becomes execution and settlement', () => {
  assert.match(operationsPageSource, /把发现推进到收入/)
  assert.match(operationsPageSource, /发现机会/)
  assert.match(operationsPageSource, /判断/)
  assert.match(operationsPageSource, /Live 执行/)
  assert.match(operationsPageSource, /结算/)
  assert.match(operationsPageSource, /to="\/app\/market"/)
  assert.match(operationsPageSource, /to="\/app\/home"/)
  assert.match(operationsPageSource, /去市场雷达发现机会/)
})

test('revenue center shows real operational metrics and reveals Live Ops only on demand', () => {
  assert.match(operationsPageSource, /可执行机会/)
  assert.match(operationsPageSource, /执行中/)
  assert.match(operationsPageSource, /已确认收入/)
  assert.match(operationsPageSource, /showLiveOps/)
  assert.match(operationsPageSource, /setShowLiveOps/)
  assert.match(operationsPageSource, /showLiveOps\s*\?/)
  assert.match(operationsPageSource, /RevenueLiveOpsPanel/)
  assert.match(operationsPageSource, /data-revenue-dashboard-mode="embedded"/)
  assert.match(operationsPageSource, /RevenueDashboardPage/)
  assert.match(operationsPageSource, /\[&>div>div>header\]:hidden/)
})

test('revenue supervision renders a real operator-gated interactive cloud browser panel', () => {
  assert.match(operationsPageSource, /getRevenueDashboard/)
  assert.match(livePanelSource, /收益执行云端浏览器/)
  assert.match(livePanelSource, /sessionStorage/)
  assert.match(livePanelSource, /debuggerFullscreenUrl/)
  assert.match(liveApiSource, /Authorization:\s*`Bearer \$\{token\}`/)
  assert.match(livePanelSource, /2_000/)
  assert.match(livePanelSource, /data-live-mode="interactive"/)
  assert.match(livePanelSource, /独立接管/)
  assert.doesNotMatch(livePanelSource, /mock video|模拟直播/i)
})
