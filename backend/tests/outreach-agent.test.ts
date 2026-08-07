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
    assert.match(result.email.opening, /looking for an automation/i)
    assert.match(result.email.body, /cost|delivery reliability|supply stability/i)
    assert.match(result.email.cta, /actively evaluating|leave it for later/i)
    assert.equal(result.email.body.includes(result.email.opening), false)
    assert.ok(result.callScript.questions.length >= 3)
    assert.doesNotMatch(
      JSON.stringify(result),
      /Dear Sir|Hope this email finds you well|I noticed|comprehensive solution/i,
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
    assert.match(result.email.body, /technical fit|current priority|useful/i)
    assert.match(result.linkedin.firstMessage, /short example|useful/i)
    assert.doesNotMatch(result.email.cta, /15-minute/i)
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

    assert.match(result.email.body, /portfolio|customer coverage|real gap/i)
    assert.match(result.email.cta, /customer use case|commercial/i)
    assert.match(result.callScript.questions.join(' '), /customer segments/i)
    assert.equal(result.email.body.includes(result.email.opening), false)
  })

  it('mirrors Chinese public content and applies the requested objective', async () => {
    const result = await provider.generateOutreach(
      context({
        communicationStyle: {
          language: 'zh',
          tone: 'concise',
          preferredPlatform: 'LinkedIn',
          observedTopics: ['MES', '自动化'],
          evidenceExcerpt: '正在评估 MES 与自动化集成方案。',
        },
        preferences: {
          language: 'auto',
          tone: 'mirror',
          objective: '分享相关案例并确认是否愿意进一步交流',
        },
      }),
    )

    assert.match(result.email.body, /分享相关案例/)
    assert.match(result.email.cta, /现在值得聊|晚一点再联系/)
    assert.match(result.linkedin.connectionMessage, /相关|连接/)
    assert.equal(result.email.body.includes(result.email.opening), false)
  })
})
