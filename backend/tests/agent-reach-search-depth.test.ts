import assert from 'node:assert/strict'
import test from 'node:test'
import { Platform, Region } from '@prisma/client'
import {
  buildAgentReachSearchPlans,
  resolveAgentReachResultLimit,
} from '../src/providers/search/agent-reach.provider.js'

test('direct search supports a 30-result target without the former hard clamp at ten', () => {
  assert.equal(resolveAgentReachResultLimit(30, {}), 30)
  assert.equal(resolveAgentReachResultLimit(100, {}), 50)
  assert.equal(resolveAgentReachResultLimit(undefined, {}), 30)
})

test('mixed website and social search creates separate upstream plans so social sources are not swallowed by general web results', () => {
  const plans = buildAgentReachSearchPlans({
    keyword: 'battery procurement contacts',
    platforms: [Platform.Website, Platform.LinkedIn, Platform.X, Platform.Reddit],
    regions: [Region.SoutheastAsia],
    maxResults: 30,
  })

  assert.equal(plans.length, 2)
  assert.equal(plans.reduce((sum, plan) => sum + plan.maxResults, 0), 30)
  assert.match(plans[0]?.query ?? '', /battery procurement contacts/)
  assert.match(plans[1]?.query ?? '', /site:linkedin\.com/)
  assert.match(plans[1]?.query ?? '', /site:x\.com/)
  assert.match(plans[1]?.query ?? '', /site:reddit\.com/)
})
