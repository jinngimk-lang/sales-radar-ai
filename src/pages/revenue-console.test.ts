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

test('revenue console is reachable from the workspace navigation', () => {
  assert.match(appSource, /path="revenue"/)
  assert.match(layoutSource, /\/app\/revenue/)
  assert.match(layoutSource, /收益控制台/)
})

test('revenue console separates potential rewards from confirmed revenue', () => {
  assert.match(pageSource, /潜在收益/)
  assert.match(pageSource, /已确认收益/)
  assert.match(pageSource, /已到账/)
  assert.match(pageSource, /不计入已确认收益/)
})
