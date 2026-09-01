import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const browserSource = await readFile(
  new URL('./MarketBrowserWorkspace.tsx', import.meta.url),
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

test('recommendation browser immediately renders the selected public webpage visual without operator unlock', () => {
  assert.match(browserSource, /网页画面/)
  assert.match(browserSource, /<LiveWebPreview/)
  assert.match(browserSource, /selectedSource/)
  assert.match(browserSource, /filteredSources\[0\]/)
  assert.doesNotMatch(browserSource, /MarketLiveBrowserPanel/)
  assert.doesNotMatch(browserSource, /REVENUE_OPERATOR_TOKEN/)
  assert.doesNotMatch(browserSource, /启动 Live/)
  assert.doesNotMatch(browserSource, /Browserbase/i)
})

test('generic page visuals are honest snapshots and can fall back to evidence-backed summaries', () => {
  assert.match(browserSource, /buildSnapshotUrl\(media\.url\)/)
  assert.match(browserSource, /media\.type === 'page'/)
  assert.match(browserSource, /网页快照/)
  assert.match(browserSource, /onFallbackToSummary/)
  assert.match(browserSource, /onError={fallBackSilently}/)
  assert.match(browserSource, /image\.thum\.io\/get\/noanimate/)
})

test('market signal judgment stays in the current market workspace instead of routing to legacy discover', () => {
  assert.doesNotMatch(assessmentSource, /to="\/app\/discover"/)
  assert.doesNotMatch(assessmentSource, /from 'react-router-dom'/)
  assert.match(assessmentSource, /onFocusAssessment/)
  assert.match(assessmentSource, /继续判断当前信号/)
  assert.match(marketPageSource, /id="sales-opportunity-assessment"/)
  assert.match(marketPageSource, /scrollIntoView/)
})
