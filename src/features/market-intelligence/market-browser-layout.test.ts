import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const browserSource = await readFile(
  new URL('./MarketBrowserWorkspace.tsx', import.meta.url),
  'utf8',
)
const liveBrowserSource = await readFile(
  new URL('./MarketLiveBrowserPanel.tsx', import.meta.url),
  'utf8',
)
const timelineSource = await readFile(
  new URL('./SignalTimeline.tsx', import.meta.url),
  'utf8',
)
const assessmentSource = await readFile(
  new URL('./SignalAssessmentPanel.tsx', import.meta.url),
  'utf8',
)
const marketPageSource = await readFile(
  new URL('../../pages/MarketIntelligenceWorkspacePage.tsx', import.meta.url),
  'utf8',
)

test('market browser and signal timeline share one viewport-aware desktop workspace height', () => {
  assert.match(browserSource, /MARKET_WORKSPACE_HEIGHT/)
  assert.match(timelineSource, /MARKET_WORKSPACE_HEIGHT/)
  assert.match(browserSource, /min-h-0/)
  assert.match(timelineSource, /min-h-0/)
})

test('market browser scrolls vertically and keeps horizontal overflow hidden', () => {
  assert.match(browserSource, /overflow-y-auto/)
  assert.match(browserSource, /overflow-x-hidden/)
  assert.match(timelineSource, /overflow-y-auto/)
})

test('source categories expose real state and do not act like useful controls when empty', () => {
  assert.match(browserSource, /aria-pressed={activeSourceType === sourceType}/)
  assert.match(browserSource, /disabled={count === 0}/)
  assert.match(browserSource, /本次扫描没有该类来源/)
})

test('market browser clearly separates a static snapshot from an interactive cloud session', () => {
  assert.match(browserSource, /MarketLiveBrowserPanel/)
  assert.match(browserSource, /网页快照（不可交互）/)
  assert.match(liveBrowserSource, /启动 Live/)
  assert.match(liveBrowserSource, /REVENUE_OPERATOR_TOKEN/)
  assert.match(liveBrowserSource, /MARKET_LIVE_OPERATOR_TOKEN_KEY/)
  assert.match(liveBrowserSource, /title="交互式云浏览器"/)
  assert.doesNotMatch(
    browserSource,
    /网页快照已按完整桌面宽度适配；上下滚动查看页面/,
  )
})

test('interactive market Live View uses a viewport-sized frame and supports fullscreen research', () => {
  assert.doesNotMatch(liveBrowserSource, /h-\[360px\]/)
  assert.match(liveBrowserSource, /min-h-\[560px\]/)
  assert.match(liveBrowserSource, /h-\[68vh\]/)
  assert.match(liveBrowserSource, /Maximize2/)
  assert.match(liveBrowserSource, /Minimize2/)
  assert.match(liveBrowserSource, /fixed inset-0 z-\[80\]/)
  assert.match(liveBrowserSource, /全屏查看/)
  assert.match(liveBrowserSource, /退出全屏/)
})

test('market signal judgment stays in the current market workspace instead of routing to legacy discover', () => {
  assert.doesNotMatch(assessmentSource, /to="\/app\/discover"/)
  assert.doesNotMatch(assessmentSource, /from 'react-router-dom'/)
  assert.match(assessmentSource, /onFocusAssessment/)
  assert.match(assessmentSource, /继续判断当前信号/)
  assert.match(marketPageSource, /id="sales-opportunity-assessment"/)
  assert.match(marketPageSource, /scrollIntoView/)
})

test('generic cross-origin pages never masquerade as a live browser', () => {
  assert.match(browserSource, /buildSnapshotUrl\(media\.url\)/)
  assert.match(browserSource, /media\.type === 'page'/)
  assert.doesNotMatch(browserSource, /真实云端浏览器.*buildSnapshotUrl/s)
})

test('snapshot failure falls back to the evidence-backed research summary', () => {
  assert.match(browserSource, /onFallbackToSummary/)
  assert.match(browserSource, /onError={fallBackSilently}/)
  assert.match(browserSource, /image\.thum\.io\/get\/noanimate/)
})
