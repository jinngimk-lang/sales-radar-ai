import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import type { Request, Response } from 'express'
import {
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { createResearchOpportunityCompanyController } from '../src/controllers/opportunity.controller.js'
import { prisma } from '../src/prisma/client.js'
import { OpportunityCompanyIntelligenceService } from '../src/services/opportunity-company-intelligence.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const service = new OpportunityCompanyIntelligenceService()
let ownerId = ''
let otherUserId = ''
let searchTaskId = ''
let opportunityId = ''
let evidenceId = ''

describe('Company Intelligence Integration Phase 2', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `opportunity-company-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `opportunity-company-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id

    const task = await prisma.searchTask.create({
      data: {
        userId: ownerId,
        keyword: `European manufacturing expansion ${suffix}`,
        provider: 'agent-reach',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
      },
    })
    searchTaskId = task.id

    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: task.id,
        provider: 'agent-reach',
        externalId: `novatek-official-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.novatek-${suffix}.com/company-update`,
        title: 'Novatek Systems GmbH company update',
        content:
          'Novatek Systems GmbH publishes official information about its European manufacturing operations and digital production systems.',
        rawMetadata: {
          title: 'Novatek Systems GmbH company update',
          companyName: 'Novatek Systems GmbH',
          companyDomain: `novatek-${suffix}.com`,
          companyWebsite: `https://www.novatek-${suffix}.com`,
        },
        companyName: 'Novatek Systems GmbH',
        normalizedDomain: `novatek-${suffix}.com`,
        website: `https://novatek-${suffix}.com`,
      },
    })
    evidenceId = evidence.id

    const opportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId: task.id,
        type: OpportunityType.DIGITAL_UPGRADE,
        dedupeKey: `novatek-upgrade-${suffix}`,
        companyName: 'Novatek Systems GmbH',
        title: 'Novatek digital production update',
        summary: 'A sourced company update for further research.',
        whyItMatters:
          'The update may be relevant to the saved product direction.',
        recommendedNextStep:
          'Verify the company before considering any sales action.',
        confidence: 86,
        productContextSnapshot: {
          product: 'Industrial automation SaaS',
          industry: 'Industrial Manufacturing',
          region: 'Europe',
          customerType: 'Manufacturing companies',
        },
      },
    })
    opportunityId = opportunity.id

    await prisma.opportunityEvidence.create({
      data: {
        opportunityId: opportunity.id,
        searchEvidenceId: evidence.id,
        excerpt:
          'Novatek Systems GmbH publishes official company information.',
        isPrimary: true,
        confidence: 86,
      },
    })
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('returns profile summary, snapshot, sources and research result', async () => {
    const result = await service.research({
      userId: ownerId,
      opportunityId,
      searchEvidenceId: evidenceId,
    })

    assert.equal(result.companyProfile.companyName, 'Novatek Systems GmbH')
    assert.equal(
      result.companyProfile.normalizedDomain,
      `novatek-${suffix}.com`,
    )
    assert.equal(result.snapshot.status, 'NEEDS_REVIEW')
    assert.equal(result.sources.length, 1)
    assert.equal(result.sources[0]?.searchEvidenceId, evidenceId)
    assert.equal(
      result.sources[0]?.url,
      `https://www.novatek-${suffix}.com/company-update`,
    )
    assert.equal(
      (result.researchResult.understanding as Record<string, unknown>)
        .status,
      'NOT_ANALYZED',
    )
  })

  it('isolates users and requires Evidence to be linked to the Opportunity', async () => {
    await assert.rejects(
      () =>
        service.research({
          userId: otherUserId,
          opportunityId,
          searchEvidenceId: evidenceId,
        }),
      isCode('COMPANY_INTELLIGENCE_OPPORTUNITY_NOT_FOUND', 404),
    )

    const unrelatedEvidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId,
        provider: 'agent-reach',
        externalId: `unrelated-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.novatek-${suffix}.com/unrelated`,
        title: 'Unrelated source',
        content: 'Novatek Systems GmbH official company information.',
      },
    })

    await assert.rejects(
      () =>
        service.research({
          userId: ownerId,
          opportunityId,
          searchEvidenceId: unrelatedEvidence.id,
        }),
      isCode('COMPANY_INTELLIGENCE_EVIDENCE_NOT_FOUND', 404),
    )
  })

  it('rejects linked Evidence without a real URL', async () => {
    const invalidEvidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId,
        provider: 'agent-reach',
        externalId: `invalid-source-${suffix}`,
        platform: Platform.Website,
        rawUrl: 'https://example.com/not-a-real-source',
        title: 'Invalid source',
        content: 'A placeholder page is not a real company source.',
      },
    })
    const invalidOpportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId,
        type: OpportunityType.INVESTMENT,
        dedupeKey: `invalid-source-${suffix}`,
        title: 'Source requiring verification',
        summary: 'The source is not eligible for company research.',
        whyItMatters: 'It remains evidence only.',
        recommendedNextStep: 'Find a real company source.',
        confidence: 30,
        productContextSnapshot: {
          product: 'Industrial automation SaaS',
        },
      },
    })
    await prisma.opportunityEvidence.create({
      data: {
        opportunityId: invalidOpportunity.id,
        searchEvidenceId: invalidEvidence.id,
        excerpt: 'Unverified source.',
        confidence: 30,
      },
    })

    await assert.rejects(
      () =>
        service.research({
          userId: ownerId,
          opportunityId: invalidOpportunity.id,
          searchEvidenceId: invalidEvidence.id,
        }),
      isCode('COMPANY_INTELLIGENCE_SOURCE_NOT_ELIGIBLE', 422),
    )
  })

  it('rejects linked Evidence without source body content', async () => {
    const emptyEvidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId,
        provider: 'agent-reach',
        externalId: `empty-source-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.novatek-${suffix}.com/empty`,
        title: 'Empty company source',
        content: ' ',
      },
    })
    const emptyOpportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId,
        type: OpportunityType.INVESTMENT,
        dedupeKey: `empty-source-${suffix}`,
        title: 'Source without正文',
        summary: 'The source has no usable body.',
        whyItMatters: 'It remains evidence only.',
        recommendedNextStep: 'Find a source with company information.',
        confidence: 30,
        productContextSnapshot: {
          product: 'Industrial automation SaaS',
        },
      },
    })
    await prisma.opportunityEvidence.create({
      data: {
        opportunityId: emptyOpportunity.id,
        searchEvidenceId: emptyEvidence.id,
        excerpt: 'No usable source body.',
        confidence: 30,
      },
    })

    await assert.rejects(
      () =>
        service.research({
          userId: ownerId,
          opportunityId: emptyOpportunity.id,
          searchEvidenceId: emptyEvidence.id,
        }),
      isCode('COMPANY_INTELLIGENCE_SOURCE_NOT_ELIGIBLE', 422),
    )
  })

  it('uses authenticated user context and validates the API body', async () => {
    let received:
      | {
          userId: string
          opportunityId: string
          searchEvidenceId: string
        }
      | undefined
    let payload: unknown
    const controller = createResearchOpportunityCompanyController({
      async research(input) {
        received = input
        return { snapshot: { status: 'NEEDS_REVIEW' } }
      },
    })
    const request = {
      params: { id: 'opportunity-1' },
      body: { searchEvidenceId: 'evidence-1' },
      user: { id: 'user-1' },
    } as unknown as Request
    const response = {
      json(body: unknown) {
        payload = body
        return this
      },
    } as unknown as Response

    await controller(request, response, () => undefined)

    assert.deepEqual(received, {
      userId: 'user-1',
      opportunityId: 'opportunity-1',
      searchEvidenceId: 'evidence-1',
    })
    assert.deepEqual(payload, {
      data: { snapshot: { status: 'NEEDS_REVIEW' } },
    })

    await assert.rejects(
      () =>
        controller(
          {
            params: { id: 'opportunity-1' },
            body: {},
            user: { id: 'user-1' },
          } as unknown as Request,
          response,
          () => undefined,
        ),
      isCode('SEARCH_EVIDENCE_ID_REQUIRED', 400),
    )
  })

  it('does not create Leads or Contacts and is idempotent', async () => {
    const before = {
      leads: await prisma.lead.count({ where: { userId: ownerId } }),
      contacts: await prisma.contactProfile.count({
        where: { lead: { userId: ownerId } },
      }),
    }

    const first = await service.research({
      userId: ownerId,
      opportunityId,
      searchEvidenceId: evidenceId,
    })
    const second = await service.research({
      userId: ownerId,
      opportunityId,
      searchEvidenceId: evidenceId,
    })

    assert.equal(first.snapshot.id, second.snapshot.id)
    assert.equal(second.snapshot.created, false)
    assert.equal(
      await prisma.lead.count({ where: { userId: ownerId } }),
      before.leads,
    )
    assert.equal(
      await prisma.contactProfile.count({
        where: { lead: { userId: ownerId } },
      }),
      before.contacts,
    )
  })
})

function isCode(code: string, statusCode: number) {
  return (error: unknown) =>
    error instanceof AppError &&
    error.code === code &&
    error.statusCode === statusCode
}
