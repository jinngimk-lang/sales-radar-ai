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

test('live iframe renders a complete 1440px desktop viewport and dynamically fits its container', () => {
  assert.match(browserSource, /PREVIEW_DESKTOP_WIDTH = 1440/)
  assert.match(browserSource, /ResizeObserver/)
  assert.match(browserSource, /previewContainerRef/)
  assert.match(browserSource, /Math\.min\(1, availableWidth \/ PREVIEW_DESKTOP_WIDTH\)/)
  assert.match(browserSource, /width: PREVIEW_DESKTOP_WIDTH/)
  assert.match(browserSource, /transform: `scale\(\$\{previewScale\}\)`/)
  assert.match(browserSource, /transformOrigin: 'top left'/)
  assert.doesNotMatch(browserSource, /PREVIEW_VIEWPORT_SCALE/)
})
