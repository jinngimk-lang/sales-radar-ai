import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
    angle: 'reduce_risk',
    priority: 'A',
    evidence: ['Acme is expanding a new production line in Ohio'],
    buyingSignals: [
      {
        signal: 'Production expansion',
        evidence: 'Acme is expanding a new production line in Ohio',
        confidence: 91,
      },
    ],
    painPoint: 'delivery reliability',
    valueProposition: 'shorten commissioning risk with validated automation options',
    ...overrides,
  }
}

const machinePhrases =
  /\b(i noticed recently|i noticed|comprehensive solution|leading solution|unlock value|synergy|we specialize in|looking forward to cooperation)\b/i

function questionCount(value: string) {
  return (value.match(/[?？]/g) ?? []).length
}

describe('human outreach quality contract', () => {
  it('rule-based fallback uses one observation without repeating the opening in the body', async () => {
    const result = await provider.generateOutreach(context())

    assert.doesNotMatch(result.email.opening, machinePhrases)
    assert.doesNotMatch(result.email.body, machinePhrases)
    assert.equal(
      result.email.body.toLowerCase().includes(result.email.opening.toLowerCase()),
      false,
      'email body must not repeat the opening observation',
    )
    assert.equal(questionCount(result.email.cta), 1)
    assert.ok(result.email.body.split(/\s+/).length <= 70)
  })

  it('Chinese fallback stays direct and avoids generic AI sales language', async () => {
    const result = await provider.generateOutreach(
      context({
        communicationStyle: {
          language: 'zh',
          tone: 'concise',
          preferredPlatform: 'LinkedIn',
          observedTopics: ['自动化', '扩产'],
          evidenceExcerpt: '公开信息显示公司正在扩建生产线。',
        },
        preferences: { language: 'auto', tone: 'mirror' },
      }),
    )

    const serialized = JSON.stringify(result)
    assert.doesNotMatch(
      serialized,
      /赋能|领先解决方案|全方位解决方案|一站式解决方案|携手共赢|期待合作|我们专注于|我司专注于/,
    )
    assert.equal(
      result.email.body.includes(result.email.opening),
      false,
      'Chinese email body must not duplicate the opening observation',
    )
    assert.equal(questionCount(result.email.cta), 1)
  })

  it('hosted-model prompt and quality gate explicitly reject robotic outreach patterns', async () => {
    const source = await readFile(
      new URL('../src/services/outreach-agent.service.ts', import.meta.url),
      'utf8',
    )

    assert.match(source, /one verified observation/i)
    assert.match(source, /must not repeat|do not repeat/i)
    assert.match(source, /low-pressure question|easy-to-answer question/i)
    assert.match(
      source,
      /i noticed recently|comprehensive solution|unlock value|looking forward to cooperation/i,
    )
  })
})
