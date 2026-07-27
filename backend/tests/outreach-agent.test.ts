import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { OutreachContext } from '../src/providers/ai/ai-provider.interface.js'
import { RuleBasedOutreachProvider } from '../src/providers/ai/rule-based-outreach.provider.js'

const provider = new RuleBasedOutreachProvider()

function context(
  overrides: Partial<OutreachContext> = {},
): OutreachContext {
  return {
    contactName: 'Alex Morgan',
    company: 'Acme Manufacturing',
    industry: 'IndustrialManufacturing',
    role: 'procurement',
    jobTitle: 'Procurement Manager',
    location: 'United States',
    stage: 'explicit_purchase',
    angle: 'improve_efficiency',
    priority: 'A',
    evidence: ['Company field: Acme Manufacturing'],
    buyingSignals: [
      {
        signal: 'Active supplier search',
        evidence: 'We are looking for an automation equipment supplier.',
        confidence: 90,
      },
    ],
    painPoint: 'Reliability and downtime',
    valueProposition: 'Reduce downtime with validated automation options.',
    ...overrides,
  }
}

describe('AI Outreach Agent v1', () => {
  it('generates evidence-led outreach for an A-priority buyer', async () => {
    const result = await provider.generateOutreach(context())

    assert.equal(result.email.subjectOptions.length, 3)
    assert.match(result.email.opening, /looking for an automation/)
    assert.match(result.email.body, /cost|delivery reliability|supply stability/)
    assert.match(result.email.cta, /15-minute/)
    assert.ok(result.callScript.questions.length >= 3)
    assert.doesNotMatch(
      JSON.stringify(result),
      /Dear Sir|Hope this email finds you well/i,
    )
  })

  it('generates low-pressure nurturing outreach for a B lead', async () => {
    const result = await provider.generateOutreach(
      context({
        role: 'engineering',
        stage: 'potential_need',
        priority: 'B',
        buyingSignals: [],
        evidence: ['Company field: Acme Manufacturing'],
      }),
    )

    assert.equal(result.email.subjectOptions.length, 3)
    assert.match(result.email.body, /first confirm whether/)
    assert.match(result.linkedin.firstMessage, /validate whether/)
  })

  it('returns observation advice instead of strong outreach for C content', async () => {
    const result = await provider.generateOutreach(
      context({
        company: 'Unknown',
        role: 'content_user',
        stage: 'observation',
        priority: 'C',
        evidence: [],
        buyingSignals: [],
      }),
    )

    assert.deepEqual(result.email.subjectOptions, [])
    assert.equal(result.email.opening, 'Unknown')
    assert.match(result.email.body, /not recommended/)
    assert.deepEqual(result.callScript.questions, [])
    assert.ok(result.observationAdvice)
  })

  it('generates a cooperation invitation for a verified channel', async () => {
    const result = await provider.generateOutreach(
      context({
        outreachType: 'channel',
        channelProfile: {
          channelType: 'system_integrator',
          channelScore: 85,
          recommendationReason: 'Verified integration services.',
          cooperationStrategy:
            'Explore a solution-integration partnership through a pilot.',
        },
      }),
    )

    assert.match(result.email.body, /complement your current portfolio/i)
    assert.match(result.email.cta, /possible pilot/i)
    assert.match(result.callScript.questions.join(' '), /customer segments/i)
  })
})
