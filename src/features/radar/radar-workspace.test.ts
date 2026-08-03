import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { RadarAssessment } from '../../types/index.ts'
import {
  groupRadarAssessments,
  splitRadarAssessments,
} from './radar-grouping.ts'
import { filterRadarClusters } from './radar-filtering.ts'
import { sortRadarClusters } from './radar-sorting.ts'
import { buildRadarCsv } from './radar-export.ts'
import { reasonCodeLabel } from './radar-presentation.ts'

describe('Radar result grouping', () => {
  it('groups the same explicit company event and month across sources', () => {
    const clusters = groupRadarAssessments([
      assessment({ id: 'a1', evidenceId: 'e1', url: 'https://acme.com/news/factory?utm_source=x' }),
      assessment({ id: 'a2', evidenceId: 'e2', url: 'https://news.example.com/acme-factory' }),
    ])

    assert.equal(clusters.length, 1)
    assert.equal(clusters[0]?.assessments.length, 2)
    assert.equal(clusters[0]?.sourceCount, 2)
  })

  it('keeps different explicit events for the same company separate', () => {
    const clusters = groupRadarAssessments([
      assessment({ id: 'a1', reasonCodes: ['NEW_FACTORY_SIGNAL'] }),
      assessment({ id: 'a2', reasonCodes: ['INVESTMENT_SIGNAL'] }),
    ])

    assert.equal(clusters.length, 2)
  })

  it('never merges unknown entities only because their context matches', () => {
    const clusters = groupRadarAssessments([
      assessment({ id: 'a1', evidenceId: 'e1', companyName: null }),
      assessment({ id: 'a2', evidenceId: 'e2', companyName: null }),
    ])

    assert.equal(clusters.length, 2)
  })

  it('deduplicates canonical source URLs within a cluster', () => {
    const clusters = groupRadarAssessments([
      assessment({ id: 'a1', evidenceId: 'e1', url: 'HTTPS://ACME.COM/news/?utm_source=radar#top' }),
      assessment({ id: 'a2', evidenceId: 'e2', url: 'https://acme.com/news' }),
    ])

    assert.equal(clusters[0]?.sourceCount, 1)
  })

  it('selects primary assessment by match, confidence, then recency', () => {
    const clusters = groupRadarAssessments([
      assessment({ id: 'lower-match', matchScore: 70, confidenceScore: 99 }),
      assessment({ id: 'older', matchScore: 80, confidenceScore: 75, createdAt: '2026-01-01T00:00:00.000Z' }),
      assessment({ id: 'newer', matchScore: 80, confidenceScore: 75, createdAt: '2026-01-20T00:00:00.000Z' }),
    ])

    assert.equal(clusters[0]?.primaryAssessment.id, 'newer')
  })
})

describe('Radar result filtering and sorting', () => {
  const clusters = groupRadarAssessments([
    assessment({ id: 'high', companyName: 'High Co', matchScore: 90, confidenceScore: 60, riskLevel: 'HIGH', decision: 'OPPORTUNITY_CREATED' }),
    assessment({ id: 'trusted', companyName: 'Trusted Co', matchScore: 70, confidenceScore: 95, riskLevel: 'LOW', decision: 'POTENTIAL_OPPORTUNITY' }),
    assessment({ id: 'medium', companyName: 'Medium Co', matchScore: 80, confidenceScore: 75, riskLevel: 'MEDIUM', decision: 'MARKET_SIGNAL_ONLY' }),
  ])

  it('sorts by match score', () => {
    assert.deepEqual(sortRadarClusters(clusters, 'match-desc').map((item) => item.primaryAssessment.id), ['high', 'medium', 'trusted'])
  })

  it('sorts by confidence score', () => {
    assert.deepEqual(sortRadarClusters(clusters, 'confidence-desc').map((item) => item.primaryAssessment.id), ['trusted', 'medium', 'high'])
  })

  it('sorts by risk in the requested direction', () => {
    assert.deepEqual(sortRadarClusters(clusters, 'risk-asc').map((item) => item.primaryAssessment.id), ['trusted', 'medium', 'high'])
  })

  it('filters by Decision without changing stored decisions', () => {
    const filtered = filterRadarClusters(clusters, {
      decision: 'POTENTIAL_OPPORTUNITY',
      entityRole: 'ALL',
      risk: 'ALL',
      sourceType: 'ALL',
      identity: 'ALL',
      matchMin: 0,
      confidenceMin: 0,
    })

    assert.deepEqual(filtered.map((item) => item.primaryAssessment.id), ['trusted'])
  })

  it('keeps blocked data accessible but outside the primary results', () => {
    const split = splitRadarAssessments([
      assessment({ id: 'visible' }),
      assessment({ id: 'blocked', decision: 'BLOCKED' }),
    ])

    assert.deepEqual(split.visible.map((item) => item.id), ['visible'])
    assert.deepEqual(split.blocked.map((item) => item.id), ['blocked'])
  })
})

describe('Radar export and explanations', () => {
  it('exports only stored result fields and canonical source URLs', () => {
    const [cluster] = groupRadarAssessments([
      assessment({
        companyName: 'ACME, Inc.',
        title: 'Factory expansion',
        url: 'https://acme.com/news?utm_source=radar',
      }),
    ])

    const csv = buildRadarCsv(cluster ? [cluster] : [])

    assert.match(csv, /"ACME, Inc\."/)
    assert.match(csv, /Factory expansion/)
    assert.match(csv, /https:\/\/acme\.com\/news/)
    assert.doesNotMatch(csv, /utm_source/)
    assert.doesNotMatch(csv, /purchase|budget|buyer email/i)
  })

  it('shows an explicit safe fallback for unknown reason codes', () => {
    assert.equal(
      reasonCodeLabel('FUTURE_REASON_CODE'),
      '其他判断依据（FUTURE_REASON_CODE）',
    )
  })
})

interface AssessmentOverrides {
  id?: string
  evidenceId?: string
  companyName?: string | null
  url?: string
  title?: string
  decision?: RadarAssessment['decision']
  entityRole?: RadarAssessment['entityRole']
  matchScore?: number
  confidenceScore?: number
  riskLevel?: RadarAssessment['riskLevel']
  reasonCodes?: string[]
  createdAt?: string
}

function assessment(overrides: AssessmentOverrides = {}): RadarAssessment {
  const id = overrides.id ?? 'assessment-1'
  const createdAt = overrides.createdAt ?? '2026-01-15T00:00:00.000Z'
  return {
    id,
    searchTaskId: 'task-1',
    searchEvidenceId: overrides.evidenceId ?? `evidence-${id}`,
    assessmentVersion: 'v1',
    detectionVersion: 'v2',
    userIntentSnapshot: {},
    entityRole: overrides.entityRole ?? 'END_CUSTOMER',
    customerGoal: 'FIND_BUYERS',
    decision: overrides.decision ?? 'POTENTIAL_OPPORTUNITY',
    recommendedAction: 'VERIFY_ENTITY',
    confidenceScore: overrides.confidenceScore ?? 70,
    matchScore: overrides.matchScore ?? 80,
    riskLevel: overrides.riskLevel ?? 'MEDIUM',
    reasonCodes: overrides.reasonCodes ?? ['NEW_FACTORY_SIGNAL'],
    scoreBreakdown: {
      confidence: {
        evidenceQuality: 18,
        eventSignal: 24,
        identityConfidence: 8,
        total: overrides.confidenceScore ?? 70,
      },
      match: {
        productRelevance: 18,
        entityRoleFit: 18,
        userIntentFit: 18,
        eventRelevance: 26,
        total: overrides.matchScore ?? 80,
      },
    },
    createdAt,
    evidence: {
      id: overrides.evidenceId ?? `evidence-${id}`,
      companyName:
        overrides.companyName === undefined ? 'Acme Manufacturing' : overrides.companyName,
      rawUrl: overrides.url ?? `https://source.example.com/${id}`,
      title: overrides.title ?? 'Acme announces a new factory',
      provider: 'agent-reach',
      platform: 'Website',
      publishedAt: createdAt,
      createdAt,
    },
  }
}
