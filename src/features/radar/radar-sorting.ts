import type { RadarResultCluster, RadarSortKey } from './radar-types.ts'

const RISK_WEIGHT = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const

export function sortRadarClusters(
  clusters: RadarResultCluster[],
  sort: RadarSortKey,
): RadarResultCluster[] {
  if (sort === 'recommended') {
    return [...clusters].sort((left, right) => left.originalIndex - right.originalIndex)
  }

  return [...clusters].sort((left, right) => {
    if (sort === 'match-desc') return right.matchScore - left.matchScore
    if (sort === 'match-asc') return left.matchScore - right.matchScore
    if (sort === 'confidence-desc') {
      return right.confidenceScore - left.confidenceScore
    }
    if (sort === 'confidence-asc') {
      return left.confidenceScore - right.confidenceScore
    }
    if (sort === 'risk-asc') {
      return RISK_WEIGHT[left.riskLevel] - RISK_WEIGHT[right.riskLevel]
    }
    if (sort === 'risk-desc') {
      return RISK_WEIGHT[right.riskLevel] - RISK_WEIGHT[left.riskLevel]
    }

    const difference = sourceTime(right) - sourceTime(left)
    return sort === 'latest' ? difference : -difference
  })
}

function sourceTime(cluster: RadarResultCluster): number {
  const value = new Date(cluster.latestPublishedAt).getTime()
  return Number.isFinite(value) ? value : 0
}
