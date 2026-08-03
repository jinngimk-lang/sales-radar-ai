import type { RadarAssessment } from '../../types/index.ts'
import type {
  RadarClusterSource,
  RadarResultCluster,
} from './radar-types.ts'

const EVENT_REASON_CODES = [
  'INVESTMENT_SIGNAL',
  'NEW_FACTORY_SIGNAL',
  'FACTORY_EXPANSION_SIGNAL',
  'AUTOMATION_UPGRADE_SIGNAL',
  'DIGITAL_UPGRADE_SIGNAL',
] as const

export function splitRadarAssessments(
  assessments: RadarAssessment[],
): {
  visible: RadarAssessment[]
  blocked: RadarAssessment[]
} {
  return assessments.reduce(
    (result, assessment) => {
      if (assessment.decision === 'BLOCKED') result.blocked.push(assessment)
      else result.visible.push(assessment)
      return result
    },
    { visible: [], blocked: [] } as {
      visible: RadarAssessment[]
      blocked: RadarAssessment[]
    },
  )
}

export function groupRadarAssessments(
  assessments: RadarAssessment[],
): RadarResultCluster[] {
  const grouped = new Map<
    string,
    { assessments: RadarAssessment[]; originalIndex: number }
  >()

  assessments.forEach((assessment, index) => {
    const key = clusterKey(assessment)
    const current = grouped.get(key)
    if (current) current.assessments.push(assessment)
    else grouped.set(key, { assessments: [assessment], originalIndex: index })
  })

  return [...grouped.entries()].map(([id, group]) =>
    buildCluster(id, group.assessments, group.originalIndex),
  )
}

export function canonicalizeSourceUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()

    for (const key of [...url.searchParams.keys()]) {
      if (
        key.toLowerCase().startsWith('utm_') ||
        ['fbclid', 'gclid', 'msclkid'].includes(key.toLowerCase())
      ) {
        url.searchParams.delete(key)
      }
    }

    url.searchParams.sort()
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '')
    return url.toString().replace(/\?$/, '').replace(/\/$/, '')
  } catch {
    return value.trim()
  }
}

function clusterKey(assessment: RadarAssessment): string {
  const entityKey = entityGroupingKey(assessment)
  const eventKey = eventGroupingKey(assessment)
  const month = sourceMonth(assessment)
  return `${assessment.searchTaskId}::${entityKey}::${eventKey}::${month}`
}

function entityGroupingKey(assessment: RadarAssessment): string {
  const companyName = assessment.evidence.companyName?.trim()
  if (companyName) return `company:${companyName.toLocaleLowerCase()}`

  const normalizedDomain = assessment.evidence.normalizedDomain?.trim()
  if (normalizedDomain) return `domain:${normalizedDomain.toLocaleLowerCase()}`

  return `evidence:${assessment.searchEvidenceId}`
}

function eventGroupingKey(assessment: RadarAssessment): string {
  const codes = EVENT_REASON_CODES.filter((code) =>
    assessment.reasonCodes.includes(code),
  )
  return codes.length > 0
    ? `event:${codes.sort().join('+')}`
    : `evidence:${assessment.searchEvidenceId}`
}

function sourceMonth(assessment: RadarAssessment): string {
  const value = assessmentTimeValue(assessment)
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    : `unknown:${assessment.searchEvidenceId}`
}

function buildCluster(
  id: string,
  assessments: RadarAssessment[],
  originalIndex: number,
): RadarResultCluster {
  const ordered = [...assessments].sort(comparePrimaryAssessment)
  const primaryAssessment = ordered[0]!
  const normalizedDomain = primaryAssessment.evidence.normalizedDomain?.trim() || null
  const companyName = primaryAssessment.evidence.companyName?.trim()
  const sources = collectSources(assessments)
  const decisions = new Set(assessments.map((item) => item.decision))

  return {
    id,
    searchTaskId: primaryAssessment.searchTaskId,
    entityKey: entityGroupingKey(primaryAssessment),
    eventKey: eventGroupingKey(primaryAssessment),
    entityName: companyName || normalizedDomain || '企业主体待确认',
    normalizedDomain,
    hasExplicitEntity: Boolean(companyName || normalizedDomain),
    eventSummary: primaryAssessment.evidence.title?.trim() || '来源摘要待确认',
    primaryAssessment,
    assessments: ordered,
    sources,
    sourceCount: sources.length,
    latestPublishedAt: latestSourceTime(sources, primaryAssessment.createdAt),
    decision: primaryAssessment.decision,
    entityRole: primaryAssessment.entityRole,
    matchScore: primaryAssessment.matchScore,
    confidenceScore: primaryAssessment.confidenceScore,
    riskLevel: primaryAssessment.riskLevel,
    originalIndex,
    hasMultipleDecisions: decisions.size > 1,
  }
}

function comparePrimaryAssessment(
  left: RadarAssessment,
  right: RadarAssessment,
): number {
  return (
    right.matchScore - left.matchScore ||
    right.confidenceScore - left.confidenceScore ||
    assessmentTime(right) - assessmentTime(left)
  )
}

function collectSources(
  assessments: RadarAssessment[],
): RadarClusterSource[] {
  const sources = new Map<string, RadarClusterSource>()

  for (const assessment of assessments) {
    const canonicalUrl = canonicalizeSourceUrl(assessment.evidence.rawUrl)
    const existing = sources.get(canonicalUrl)
    if (existing) {
      existing.assessmentIds.push(assessment.id)
      if (!existing.title && assessment.evidence.title) {
        existing.title = assessment.evidence.title
      }
      if (!existing.excerpt && assessment.evidence.excerpt) {
        existing.excerpt = assessment.evidence.excerpt
      }
      continue
    }

    sources.set(canonicalUrl, {
      id: assessment.evidence.id,
      url: assessment.evidence.rawUrl,
      canonicalUrl,
      title: assessment.evidence.title,
      excerpt: assessment.evidence.excerpt?.trim() || null,
      sourceType: assessment.evidence.platform,
      provider: assessment.evidence.provider,
      identityStatus: assessment.evidence.identityStatus ?? null,
      evidenceStatus: assessment.evidence.evidenceStatus ?? null,
      publishedAt: assessment.evidence.publishedAt ?? null,
      createdAt: assessment.evidence.createdAt,
      assessmentIds: [assessment.id],
    })
  }

  return [...sources.values()].sort(
    (left, right) => sourceTime(right) - sourceTime(left),
  )
}

function latestSourceTime(
  sources: RadarClusterSource[],
  fallback: string,
): string {
  return sources[0]?.publishedAt || sources[0]?.createdAt || fallback
}

function assessmentTime(assessment: RadarAssessment): number {
  const time = new Date(assessmentTimeValue(assessment)).getTime()
  return Number.isFinite(time) ? time : 0
}

function assessmentTimeValue(assessment: RadarAssessment): string {
  return (
    assessment.evidence.publishedAt ||
    assessment.evidence.createdAt ||
    assessment.createdAt
  )
}

function sourceTime(source: RadarClusterSource): number {
  const value = new Date(source.publishedAt || source.createdAt).getTime()
  return Number.isFinite(value) ? value : 0
}
