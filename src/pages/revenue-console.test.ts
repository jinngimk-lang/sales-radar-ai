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

test('revenue center uses one page heading and embeds the existing dashboard after live execution', () => {
  assert.match(operationsPageSource, /收益中心/)
  assert.match(operationsPageSource, /RevenueLiveOpsPanel/)
  assert.match(operationsPageSource, /data-revenue-dashboard-mode="embedded"/)
  assert.match(operationsPageSource, /RevenueDashboardPage/)
  assert.match(operationsPageSource, /\[&>div>div>header\]:hidden/)
})

test('revenue center renders a real operator-gated cloud browser panel', () => {
  assert.match(operationsPageSource, /getRevenueDashboard/)
  assert.match(livePanelSource, /云端浏览器实时画面/)
  assert.match(livePanelSource, /sessionStorage/)
  assert.match(livePanelSource, /debuggerFullscreenUrl/)
  assert.match(livePanelSource, /Authorization/)
  assert.match(livePanelSource, /每 2 秒/)
  assert.doesNotMatch(livePanelSource, /mock video|模拟直播/i)
})
