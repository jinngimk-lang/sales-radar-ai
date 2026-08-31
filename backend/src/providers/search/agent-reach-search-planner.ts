import { Platform, type Region } from '@prisma/client'
import type { SearchProviderInput } from './search-provider.interface.js'

const DEFAULT_RESULT_TARGET = 30
const MAX_RESULT_TARGET = 50
const MAX_RESULTS_PER_UPSTREAM_CALL = 10

const COMMERCIAL_QUERY_VARIANTS = [
  'buyer procurement purchasing sourcing RFQ tender 求购 采购 询价 招标',
  'supplier manufacturer vendor distributor importer wholesaler 供应商 制造商 经销商 进口商',
  'seeking looking for quotation project procurement sourcing partner 采购需求 供应需求',
]

export interface AgentReachSearchPlan {
  query: string
  platforms: Platform[]
  regions: Region[]
  maxResults: number
}

export function resolveAgentReachResultLimit(
  requested: number | undefined,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const configured = positiveInteger(environment.AGENT_REACH_MAX_RESULTS)
  const value = requested ?? configured ?? DEFAULT_RESULT_TARGET
  return Math.min(Math.max(1, Math.trunc(value)), MAX_RESULT_TARGET)
}

export function buildAgentReachSearchPlans(
  input: SearchProviderInput,
): AgentReachSearchPlan[] {
  const total = resolveAgentReachResultLimit(input.maxResults)
  const platforms = input.platforms.length > 0
    ? [...new Set(input.platforms)]
    : Object.values(Platform)
  const websiteRequested = platforms.includes(Platform.Website)
  const socialPlatforms = platforms.filter(
    (platform) => platform !== Platform.Website,
  )
  const plans: AgentReachSearchPlan[] = []
  let remaining = total
  let variantIndex = 0

  if (websiteRequested && remaining > 0) {
    plans.push(
      plan(
        commercialQuery(input.keyword, variantIndex++),
        [Platform.Website],
        input.regions,
        remaining,
      ),
    )
    remaining -= plans.at(-1)!.maxResults
  }

  if (socialPlatforms.length > 0 && remaining > 0) {
    const desiredBatches = Math.min(
      Math.ceil(remaining / MAX_RESULTS_PER_UPSTREAM_CALL),
      socialPlatforms.length,
    )
    const groups = splitEvenly(socialPlatforms, desiredBatches)
    for (const group of groups) {
      if (remaining <= 0) break
      const next = plan(
        commercialQuery(input.keyword, variantIndex++),
        group,
        input.regions,
        remaining,
      )
      plans.push(next)
      remaining -= next.maxResults
    }
  }

  while (remaining > 0) {
    const fallbackPlatforms = websiteRequested
      ? [Platform.Website]
      : socialPlatforms
    const next = plan(
      commercialQuery(input.keyword, variantIndex++),
      fallbackPlatforms,
      input.regions,
      remaining,
    )
    plans.push(next)
    remaining -= next.maxResults
  }

  return plans
}

function commercialQuery(keyword: string, variantIndex: number) {
  const terms = COMMERCIAL_QUERY_VARIANTS[
    variantIndex % COMMERCIAL_QUERY_VARIANTS.length
  ]!
  return `${keyword.trim()} ${terms}`.trim()
}

function plan(
  query: string,
  platforms: Platform[],
  regions: Region[],
  remaining: number,
): AgentReachSearchPlan {
  return {
    query: query.trim(),
    platforms,
    regions,
    maxResults: Math.min(remaining, MAX_RESULTS_PER_UPSTREAM_CALL),
  }
}

function splitEvenly<T>(values: T[], groupCount: number): T[][] {
  if (groupCount <= 0) return []
  const groups = Array.from({ length: groupCount }, () => [] as T[])
  values.forEach((value, index) => {
    groups[index % groupCount]!.push(value)
  })
  return groups.filter((group) => group.length > 0)
}

function positiveInteger(value: string | undefined) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
