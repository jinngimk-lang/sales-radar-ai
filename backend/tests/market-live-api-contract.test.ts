import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routesSource = readFileSync(
  new URL('../src/routes/market-signal.routes.ts', import.meta.url),
  'utf8',
)

test('market live browser routes require the existing operator middleware', () => {
  assert.match(routesSource, /requireRevenueOperator/)
  assert.match(
    routesSource,
    /post\(\s*['"]\/live-browser['"],\s*requireRevenueOperator,\s*asyncRoute\(startMarketLiveBrowserController\)/s,
  )
  assert.match(
    routesSource,
    /get\(\s*['"]\/live-browser\/:runId['"],\s*requireRevenueOperator,\s*asyncRoute\(getMarketLiveBrowserController\)/s,
  )
})
