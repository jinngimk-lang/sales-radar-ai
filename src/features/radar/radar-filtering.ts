import type { RadarFilters, RadarResultCluster } from './radar-types.ts'

export function filterRadarClusters(
  clusters: RadarResultCluster[],
  filters: RadarFilters,
): RadarResultCluster[] {
  return clusters.filter((cluster) => {
    const decisionMatches =
      filters.decision === 'ALL' || cluster.decision === filters.decision
    const roleMatches =
      filters.entityRole === 'ALL' ||
      cluster.entityRole === filters.entityRole
    const riskMatches =
      filters.risk === 'ALL' || cluster.riskLevel === filters.risk
    const sourceMatches =
      filters.sourceType === 'ALL' ||
      cluster.sources.some(
        (source) => source.sourceType === filters.sourceType,
      )
    const identityMatches =
      filters.identity === 'ALL' ||
      (filters.identity === 'IDENTIFIED'
        ? cluster.hasExplicitEntity
        : !cluster.hasExplicitEntity)

    return (
      decisionMatches &&
      roleMatches &&
      riskMatches &&
      sourceMatches &&
      identityMatches &&
      cluster.matchScore >= filters.matchMin &&
      cluster.confidenceScore >= filters.confidenceMin
    )
  })
}
