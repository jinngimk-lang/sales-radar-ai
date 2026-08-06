import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('protects every revenue live route with the operator middleware', async () => {
  const source = await readSource('../src/routes/revenue.routes.ts')

  assert.match(source, /requireRevenueOperator/)
  assert.match(
    source,
    /revenueRouter\.get\(\s*['"]\/live\/status['"],\s*requireRevenueOperator,\s*asyncRoute\(getRevenueLiveStatus\),?\s*\)/s,
  )
  assert.match(
    source,
    /revenueRouter\.post\(\s*['"]\/live\/runs['"],\s*requireRevenueOperator,\s*asyncRoute\(startRevenueLiveRun\),?\s*\)/s,
  )
  assert.match(
    source,
    /revenueRouter\.post\(\s*['"]\/live\/runs\/:id\/stop['"],\s*requireRevenueOperator,\s*asyncRoute\(stopRevenueLiveRun\),?\s*\)/s,
  )
})

test('uses the active workspace and accepts no arbitrary prompt or URL', async () => {
  const source = await readSource('../src/controllers/revenue-live.controller.ts')

  assert.match(source, /response\.locals\.userId/)
  assert.match(source, /request\.body\?\.opportunityId/)
  assert.doesNotMatch(source, /request\.body\?\.(prompt|task|url|sourceUrl)/)
  assert.match(source, /response\.status\(202\)/)
  assert.match(source, /revenueLiveService\.getStatus/)
  assert.match(source, /revenueLiveService\.startRun/)
  assert.match(source, /revenueLiveService\.stopRun/)
})

test('marks protected live view responses private and non-cacheable', async () => {
  const source = await readSource('../src/controllers/revenue-live.controller.ts')

  assert.match(source, /Cache-Control/)
  assert.match(source, /private, no-store/)
  assert.match(source, /setRevenueLiveNoStore/)
})
