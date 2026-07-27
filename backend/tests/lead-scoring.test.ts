import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CustomerType,
  Platform,
  RecommendedAction,
} from '@prisma/client'
import { LeadScoringService } from '../src/services/lead-scoring.service.js'

const scoring = new LeadScoringService()

describe('LeadScoringService', () => {
  it('scores an explicit procurement post as high intent', () => {
    const result = scoring.score({
      platform: Platform.Reddit,
      sourceUrl: 'https://reddit.com/r/automation/comments/buyer',
      rawContent:
        'We urgently need an industrial automation supplier and are requesting an RFQ this week.',
      customerType: CustomerType.Buyer,
    })

    assert.ok(result.intentScore >= 80)
    assert.ok(result.buyingSignal.length >= 2)
    assert.equal(result.urgencyLevel, 'CRITICAL')
    assert.equal(result.recommendedAction, RecommendedAction.contact_now)
    assert.ok(result.confidence >= 70)
  })

  it('scores an ordinary product discussion as medium intent', () => {
    const result = scoring.score({
      platform: Platform.Reddit,
      sourceUrl: 'https://reddit.com/r/automation/comments/discussion',
      rawContent:
        'What are your thoughts on these automation systems? I am comparing their features and reliability.',
      customerType: CustomerType.Agent,
    })

    assert.ok(result.intentScore >= 45 && result.intentScore < 75)
    assert.equal(result.urgencyLevel, 'MEDIUM')
    assert.equal(result.recommendedAction, RecommendedAction.follow_up)
  })

  it('scores a corporate promotional video as low intent', () => {
    const result = scoring.score({
      platform: Platform.YouTube,
      sourceUrl: 'https://youtube.com/watch?v=corporate',
      rawContent:
        'Official corporate video and company profile: an overview of our product history and factory.',
      customerType: CustomerType.Company,
    })

    assert.ok(result.intentScore < 35)
    assert.equal(result.urgencyLevel, 'LOW')
    assert.equal(result.recommendedAction, RecommendedAction.monitor)
  })

  it('applies commercial enrichment dimensions', () => {
    const result = scoring.score({
      platform: Platform.LinkedIn,
      sourceUrl: 'https://linkedin.com/posts/qualified',
      rawContent:
        'We are looking for an industrial automation supplier for procurement.',
      customerType: CustomerType.Buyer,
      sourceMetadata: {
        jobTitle: 'Procurement Manager',
        companyWebsite: 'https://acme.example',
        location: 'United States',
      },
    })

    assert.equal(result.intentScore, 100)
    assert.ok(result.buyingSignal.includes('Procurement intent detected'))
    assert.ok(result.buyingSignal.includes('Actively seeking a supplier'))
  })
})
