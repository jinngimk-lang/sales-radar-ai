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

test('market browser and signal timeline use one shared fixed desktop height', () => {
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

test('known embeddable media keeps a complete 1440px responsive iframe viewport', () => {
  assert.match(browserSource, /PREVIEW_DESKTOP_WIDTH = 1440/)
  assert.match(browserSource, /ResizeObserver/)
  assert.match(browserSource, /previewContainerRef/)
  assert.match(browserSource, /Math\.min\(1, availableWidth \/ PREVIEW_DESKTOP_WIDTH\)/)
  assert.match(browserSource, /width: PREVIEW_DESKTOP_WIDTH/)
  assert.match(browserSource, /transform: `scale\(\$\{previewScale\}\)`/)
  assert.match(browserSource, /transformOrigin: 'top left'/)
  assert.doesNotMatch(browserSource, /PREVIEW_VIEWPORT_SCALE/)
})

test('generic cross-origin pages render a snapshot first instead of trusting iframe load events', () => {
  assert.match(browserSource, /type: 'page' \| 'embed' \| 'image' \| 'video'/)
  assert.match(browserSource, /media\.type === 'page'/)
  assert.match(browserSource, /buildSnapshotUrl\(media\.url\)/)
  assert.match(browserSource, /media\.type === 'embed'/)
  assert.doesNotMatch(browserSource, /type PreviewMode = 'iframe' \| 'snapshot'/)
  assert.doesNotMatch(browserSource, /setPreviewMode\('iframe'\)/)
  assert.doesNotMatch(browserSource, /setPreviewMode\('snapshot'\)/)
})

test('snapshot failure silently falls back to the evidence-backed research summary', () => {
  assert.match(browserSource, /onFallbackToSummary/)
  assert.match(browserSource, /onError={fallBackSilently}/)
  assert.match(browserSource, /image\.thum\.io\/get\/noanimate/)
  assert.doesNotMatch(
    browserSource,
    /该站点没有允许在应用内显示实时画面/,
  )
  assert.doesNotMatch(browserSource, /X-Frame-Options/)
})
