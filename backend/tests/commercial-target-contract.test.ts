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

test('commercial target run lifecycle is server-owned and persists truthful progress', async () => {
  const [migration, targetController, targetService, marketController] =
    await Promise.all([
      read('prisma/migrations/20260827180000_add_commercial_target_run_state/migration.sql'),
      read('src/controllers/commercial-target.controller.ts'),
      read('src/services/commercial-target.service.ts'),
      read('src/controllers/market-signal.controller.ts'),
    ])

  assert.match(migration, /"lastRunStatus" TEXT/)
  assert.match(migration, /"lastRunStartedAt" TIMESTAMP\(3\)/)
  assert.match(migration, /"lastRunCompletedAt" TIMESTAMP\(3\)/)
  assert.match(migration, /"lastRunSourceCount" INTEGER/)
  assert.match(migration, /"lastRunSignalCount" INTEGER/)
  assert.match(migration, /"lastRunErrorCode" TEXT/)

  assert.doesNotMatch(targetController, /input\.lastRunAt/)
  assert.doesNotMatch(targetController, /input\.lastRunStatus/)
  assert.match(targetService, /recordRunStarted/)
  assert.match(targetService, /recordRunCompleted/)
  assert.match(targetService, /recordRunFailed/)
  assert.match(marketController, /COMMERCIAL_TARGET_INACTIVE/)
  assert.match(marketController, /recordRunStarted/)
  assert.match(marketController, /recordRunCompleted/)
  assert.match(marketController, /recordRunFailed/)
  assert.match(marketController, /sources\.length/)
  assert.match(marketController, /signals\.length/)
})

test('lastRunAt remains successful-run evidence rather than generic activity time', async () => {
  const [targetService, marketController] = await Promise.all([
    read('src/services/commercial-target.service.ts'),
    read('src/controllers/market-signal.controller.ts'),
  ])

  assert.match(targetService, /"lastRunAt" = \$\{completedAt\}/)
  assert.match(marketController, /recordRunCompleted/)
  assert.doesNotMatch(marketController, /recordSuccessfulRun/)
})
