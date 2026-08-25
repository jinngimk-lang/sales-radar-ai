import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFile(new URL(path, root), 'utf8')

test('persistent commercial target has a user-scoped database table', async () => {
  const migration = await read(
    'prisma/migrations/20260825042000_add_commercial_targets/migration.sql',
  )

  assert.match(migration, /CREATE TABLE "CommercialTarget"/)
  assert.match(migration, /"userId" TEXT NOT NULL/)
  assert.match(migration, /REFERENCES "User"\("id"\) ON DELETE CASCADE/)
  assert.match(migration, /FIND_BUYERS/)
  assert.match(migration, /FIND_SUPPLIERS/)
  assert.match(migration, /FIND_PARTNERS/)
  assert.match(migration, /FIND_DISTRIBUTORS/)
  assert.match(migration, /RESEARCH_COMPETITORS/)
  assert.match(migration, /EXPLORE_MARKET/)
})

test('commercial targets are mounted behind the workspace user boundary', async () => {
  const app = await read('src/app.ts')
  const routes = await read('src/routes/commercial-target.routes.ts')

  assert.match(app, /\/api\/commercial-targets/)
  assert.match(app, /attachDemoWorkspaceUser, commercialTargetRouter/)
  assert.match(routes, /commercialTargetRouter\.get\('\/'/)
  assert.match(routes, /commercialTargetRouter\.post\('\/'/)
  assert.match(routes, /commercialTargetRouter\.put\('\/:id'/)
})

test('commercial target parser rejects unknown goals instead of silently changing user intent', async () => {
  const controller = await read('src/controllers/commercial-target.controller.ts')

  assert.match(controller, /COMMERCIAL_TARGET_GOAL_INVALID/)
  assert.match(controller, /MARKET_RESEARCH_GOALS/)
  assert.doesNotMatch(controller, /goal:\s*['\"]FIND_BUYERS['\"]/)
})

test('repository scopes list and update operations by user id', async () => {
  const service = await read('src/services/commercial-target.service.ts')

  assert.match(service, /WHERE "userId" = \$\{userId\}/)
  assert.match(service, /WHERE "id" = \$\{id\} AND "userId" = \$\{userId\}/)
})
