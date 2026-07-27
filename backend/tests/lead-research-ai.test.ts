import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CustomerType,
  Industry,
  Platform,
} from '@prisma/client'
import type {
  AIGenerateRequest,
  AIGenerateResult,
  AIProvider,
} from '../src/providers/ai-platform/ai-provider.interface.js'
import { QwenAIProvider } from '../src/providers/ai-platform/qwen-ai.provider.js'
import { RuleBasedAIProvider } from '../src/providers/ai-platform/rule-based-ai.provider.js'
import { AITaskType } from '../src/providers/ai-platform/ai-task-type.js'
import { AIResponseParser } from '../src/services/ai-response-parser.service.js'
import {
  AIUsageLogService,
  type AIUsageEntry,
} from '../src/services/ai-usage-log.service.js'
import {
  LeadResearchService,
  type LeadResearchAIResult,
  type LeadResearchRepository,
  type ProductResearchContext,
  type ResearchableLead,
} from '../src/services/lead-research.service.js'
import { PromptTemplateService } from '../src/services/prompt-template.service.js'

const aiResult: LeadResearchAIResult = {
  matchScore: 86,
  purchaseLikelihood: 'High',
  industryFit: 'The verified manufacturing activity fits industrial robotics.',
  businessFit: 'The company operates a production facility.',
  recommendedAngle: 'Lead with automation throughput and integration risk.',
  contactReason: 'The source explicitly describes an automation project.',
  riskFactors: ['Project timing is not verified.'],
  evidence: ['Lead content: seeking robotic automation for a production line.'],
}

const verifiedLead: ResearchableLead = {
  id: 'lead-1',
  userId: 'user-1',
  company: 'Acme Manufacturing',
  industry: Industry.IndustrialManufacturing,
  customerType: CustomerType.Buyer,
  jobTitle: 'Engineering Manager',
  platform: Platform.LinkedIn,
  sourceUrl: 'https://example.com/acme-project',
  country: 'United States',
  postContent:
    'Acme is seeking robotic automation for a production line upgrade.',
  sourceMetadata: { leadType: 'company' },
}

const product: ProductResearchContext = {
  id: 'product-1',
  userId: 'user-1',
  productName: 'Industrial Robots',
  category: 'Industrial Automation Equipment',
  industry: 'Industrial Automation',
  applications: ['Production line upgrades'],
  keywords: ['robotic automation'],
  buyerPersona: [],
  buyerKeywords: ['industrial robot procurement'],
  buyingSignals: ['Automation project'],
  painPoints: ['Integration complexity'],
  valueAngles: ['Improve throughput'],
}

class StaticAIProvider implements AIProvider {
  constructor(
    readonly name: string,
    readonly model: string,
    private readonly output: unknown,
    private readonly fail = false,
  ) {}

  async generate(_request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (this.fail) throw new Error('provider failed')
    return { output: this.output, provider: this.name, model: this.model }
  }
}

function harness(options?: {
  lead?: ResearchableLead
  product?: ProductResearchContext | null
  provider?: AIProvider
}) {
  let stored: unknown | null = null
  let creates = 0
  let updates = 0
  let requestedProductUser: string | undefined
  const usageEntries: AIUsageEntry[] = []
  const repository: LeadResearchRepository = {
    findLead: async () => options?.lead ?? verifiedLead,
    findResearch: async () => stored,
    createResearch: async (_leadId, result) => {
      creates += 1
      stored = { id: 'research-1', leadId: 'lead-1', ...result }
      return stored
    },
    updateResearch: async (_leadId, result) => {
      updates += 1
      stored = { ...(stored as object), ...result }
      return stored
    },
    findProductProfile: async (_id, userId) => {
      requestedProductUser = userId
      return options?.product === undefined ? product : options.product
    },
  }
  const usage = new AIUsageLogService({
    create: async (entry) => {
      usageEntries.push(entry)
      return entry
    },
  })
  const service = new LeadResearchService(
    repository,
    options?.provider ??
      new StaticAIProvider('qwen', 'qwen-plus', JSON.stringify(aiResult)),
    new RuleBasedAIProvider(),
    new PromptTemplateService({ findLatest: async () => null }),
    new AIResponseParser(),
    usage,
  )
  return {
    service,
    usageEntries,
    state: () => ({
      stored: stored as Record<string, unknown> | null,
      creates,
      updates,
      requestedProductUser,
    }),
  }
}

describe('Lead Research AI v1', () => {
  it('generates structured Lead Research through AIProvider', async () => {
    const test = harness()
    const result = (await test.service.researchAI(
      'lead-1',
      'product-1',
    )) as Record<string, unknown>
    assert.equal(result.matchScore, 86)
    assert.equal(result.provider, 'qwen')
    assert.equal(result.model, 'qwen-plus')
  })

  it('accepts a Qwen Provider response for Lead Research', async () => {
    const fetcher = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(aiResult) } }],
        }),
        { status: 200 },
      )) as typeof fetch
    const qwen = new QwenAIProvider(
      {
        apiKey: 'test-key',
        model: 'qwen-plus',
        baseUrl: 'https://qwen.invalid',
      },
      fetcher,
    )
    const test = harness({ provider: qwen })
    const result = (await test.service.researchAI(
      'lead-1',
      'product-1',
    )) as Record<string, unknown>
    assert.equal(result.provider, 'qwen')
    assert.equal(result.contactReason, aiResult.contactReason)
  })

  it('falls back when Qwen is unavailable', async () => {
    const qwenWithoutKey = new QwenAIProvider({
      model: 'qwen-plus',
      baseUrl: 'https://qwen.invalid',
    })
    const test = harness({ provider: qwenWithoutKey })
    const result = (await test.service.researchAI(
      'lead-1',
      'product-1',
    )) as Record<string, unknown>
    assert.equal(result.provider, 'rule-based')
    assert.equal(typeof result.matchScore, 'number')
  })

  it('updates one LeadResearch record on repeated analysis', async () => {
    const test = harness()
    await test.service.researchAI('lead-1', 'product-1')
    await test.service.researchAI('lead-1', 'product-1')
    assert.equal(test.state().creates, 1)
    assert.equal(test.state().updates, 1)
  })

  it('returns Unknown safely when evidence is absent', async () => {
    const emptyLead: ResearchableLead = {
      ...verifiedLead,
      company: null,
      jobTitle: null,
      postContent: '',
      sourceMetadata: null,
    }
    const test = harness({
      lead: emptyLead,
      product: null,
      provider: new StaticAIProvider('unavailable', 'none', null, true),
    })
    const result = (await test.service.researchAI(
      'lead-1',
    )) as Record<string, unknown>
    assert.equal(result.industryFit, 'Unknown')
    assert.equal(result.businessFit, 'Unknown')
    assert.equal(result.contactReason, 'Unknown')
  })

  it('records successful and failed LEAD_RESEARCH usage', async () => {
    const success = harness()
    await success.service.researchAI('lead-1', 'product-1')
    assert.ok(
      success.usageEntries.some(
        (entry) =>
          entry.taskType === AITaskType.LEAD_RESEARCH &&
          entry.provider === 'qwen' &&
          entry.success,
      ),
    )

    const failure = harness({
      provider: new StaticAIProvider('qwen', 'qwen-plus', null, true),
    })
    await failure.service.researchAI('lead-1', 'product-1')
    assert.ok(
      failure.usageEntries.some(
        (entry) => entry.provider === 'qwen' && !entry.success,
      ),
    )
  })

  it('associates only a ProductProfile owned by the Lead user', async () => {
    const test = harness()
    const result = (await test.service.researchAI(
      'lead-1',
      'product-1',
    )) as Record<string, unknown>
    assert.equal(test.state().requestedProductUser, 'user-1')
    assert.equal(result.productProfileId, 'product-1')
  })
})
