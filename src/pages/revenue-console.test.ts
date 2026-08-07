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

test('revenue center is reachable from the simplified workspace navigation', () => {
  assert.match(appSource, /path="revenue"/)
  assert.match(appSource, /RevenueOperationsPage/)
  assert.match(layoutSource, /\/app\/revenue/)
  assert.match(layoutSource, /收益中心/)
})

test('revenue center separates potential rewards from confirmed revenue', () => {
  assert.match(pageSource, /潜在收益/)
  assert.match(pageSource, /已确认收益/)
  assert.match(pageSource, /已到账/)
  assert.match(pageSource, /不计入已确认收益/)
})

test('revenue supervision uses a compact shared header and embeds the existing dashboard after live execution', () => {
  assert.match(operationsPageSource, /WorkspaceHeader/)
  assert.match(operationsPageSource, /RevenueSummary/)
  assert.match(operationsPageSource, /RevenueLiveOpsPanel/)
  assert.match(operationsPageSource, /data-revenue-dashboard-mode="embedded"/)
  assert.match(operationsPageSource, /RevenueDashboardPage/)
  assert.match(operationsPageSource, /\[&>div>div>header\]:hidden/)
  assert.doesNotMatch(operationsPageSource, /Revenue Supervision|Supervision Pipeline/)
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
