import assert from 'node:assert/strict'
import test from 'node:test'
import type { ChatSession, ContactProfile } from '@/types'
import { getPotentialBand, sortCommandSessions } from './resultPresentation'

function makeSession({
  id,
  overall,
  contacts = 0,
}: {
  id: string
  overall?: number
  contacts?: number
}): ChatSession {
  return {
    id,
    customerName: id,
    displayName: id,
    company: `${id} Co`,
    initials: id.slice(0, 2).toUpperCase(),
    platform: 'Website',
    jobTitle: 'Buyer',
    sourceUrl: `https://example.com/${id}`,
    profileUrl: `https://example.com/${id}`,
    postContent: 'public buying signal',
    contacts: Array.from({ length: contacts }, (_, index) => ({
      id: `${id}-contact-${index}`,
      leadId: id,
      name: `Contact ${index}`,
      jobTitle: 'Procurement',
      company: `${id} Co`,
      source: 'website',
      profileUrl: '',
      email: '',
      phone: '',
      contactRole: 'unknown',
      confidence: 80,
      evidence: [],
      contactScore: null,
      priorityRank: null,
      recommendationReason: null,
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T00:00:00.000Z',
    })) as ContactProfile[],
    assistantScores:
      typeof overall === 'number'
        ? { overall, intent: overall, identity: overall, evidence: overall, contact: overall }
        : undefined,
    communicationProfile: {
      language: 'en',
      tone: 'concise',
      preferredPlatform: 'Website',
      observedTopics: [],
      evidenceExcerpt: '',
      basis: 'public source',
    },
    lastMessage: 'Review source',
    updatedAt: '2026-08-07T00:00:00.000Z',
  }
}

test('sortCommandSessions prioritizes overall score, then observed contact count, without mutating input', () => {
  const input = [
    makeSession({ id: 'unscored', contacts: 5 }),
    makeSession({ id: 'same-score-fewer-contacts', overall: 80, contacts: 1 }),
    makeSession({ id: 'highest', overall: 92, contacts: 0 }),
    makeSession({ id: 'same-score-more-contacts', overall: 80, contacts: 3 }),
  ]
  const originalOrder = input.map((session) => session.id)

  const sorted = sortCommandSessions(input)

  assert.deepEqual(sorted.map((session) => session.id), [
    'highest',
    'same-score-more-contacts',
    'same-score-fewer-contacts',
    'unscored',
  ])
  assert.deepEqual(input.map((session) => session.id), originalOrder)
})

test('getPotentialBand maps only the existing overall score into display bands', () => {
  assert.deepEqual(getPotentialBand(75), { label: '高潜', tone: 'strong' })
  assert.deepEqual(getPotentialBand(74), { label: '中潜', tone: 'medium' })
  assert.deepEqual(getPotentialBand(50), { label: '中潜', tone: 'medium' })
  assert.deepEqual(getPotentialBand(49), { label: '低潜', tone: 'low' })
  assert.deepEqual(getPotentialBand(undefined), { label: '未评分', tone: 'neutral' })
  assert.deepEqual(getPotentialBand(Number.NaN), { label: '未评分', tone: 'neutral' })
})
