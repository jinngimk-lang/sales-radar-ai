import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFile(new URL(path, root), 'utf8')

test('persistent commercial target has a user-scoped Prisma model', async () => {
  const schema = await read('prisma/schema.prisma')

  assert.match(schema, /enum CommercialTargetStatus \{[\s\S]*DRAFT[\s\S]*ACTIVE[\s\S]*PAUSED[\s\S]*CLOSED[\s\S]*\}/)
  assert.match(schema, /model CommercialTarget \{[\s\S]*userId\s+String/)
  assert.match(schema, /goal\s+RadarCustomerGoal/)
  assert.match(schema, /signalFocus\s+String/)
  assert.match(schema, /lastRunAt\s+DateTime\?/)
  assert.match(schema, /commercialTargets\s+CommercialTarget\[\]/)
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
