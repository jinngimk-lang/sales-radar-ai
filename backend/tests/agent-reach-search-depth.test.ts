import assert from 'node:assert/strict'
import test from 'node:test'
import { Platform, Region } from '@prisma/client'
import {
  buildAgentReachSearchPlans,
  resolveAgentReachResultLimit,
} from '../src/providers/search/agent-reach-search-planner.js'

test('direct search supports a 30-result target without the former hard clamp at ten', () => {
  assert.equal(resolveAgentReachResultLimit(30, {}), 30)
  assert.equal(resolveAgentReachResultLimit(100, {}), 50)
  assert.equal(resolveAgentReachResultLimit(undefined, {}), 30)
})

test('mixed website and social search creates separate bounded upstream plans', () => {
  const plans = buildAgentReachSearchPlans({
    keyword: 'battery procurement contacts',
    platforms: [Platform.Website, Platform.LinkedIn, Platform.X, Platform.Reddit],
    regions: [Region.SoutheastAsia],
    maxResults: 30,
  })

  assert.equal(plans.length, 3)
  assert.equal(plans.reduce((sum, plan) => sum + plan.maxResults, 0), 30)
  assert.ok(plans.every((plan) => plan.maxResults <= 10))
  assert.deepEqual(plans[0]?.platforms, [Platform.Website])
  const socialPlatforms = plans.slice(1).flatMap((plan) => plan.platforms)
  assert.ok(socialPlatforms.includes(Platform.LinkedIn))
  assert.ok(socialPlatforms.includes(Platform.X))
  assert.ok(socialPlatforms.includes(Platform.Reddit))
  assert.ok(plans.slice(1).every((plan) => !plan.platforms.includes(Platform.Website)))
})
