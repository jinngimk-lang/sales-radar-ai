import type { RadarResultCluster } from './radar-types.ts'

const HEADERS = [
  '企业',
  '事件摘要',
  'Decision',
  'Entity Role',
  'Match Score',
  'Confidence Score',
  'Risk',
  '来源数量',
  '主要来源 URL',
  '最新时间',
]

export function buildRadarCsv(clusters: RadarResultCluster[]): string {
  const rows = clusters.map((cluster) => [
    cluster.entityName,
    cluster.eventSummary,
    cluster.decision,
    cluster.entityRole,
    String(cluster.matchScore),
    String(cluster.confidenceScore),
    cluster.riskLevel,
    String(cluster.sourceCount),
    cluster.sources[0]?.canonicalUrl ?? '',
    cluster.latestPublishedAt,
  ])

  return [HEADERS, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}
