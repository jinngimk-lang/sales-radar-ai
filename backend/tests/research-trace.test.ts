import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import type { Request, Response } from 'express'
import {
  CompanyAnalysisStatus,
  CompanyIdentityStatus,
  CompanySourceType,
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { createGetResearchTraceController } from '../src/controllers/opportunity.controller.js'
import { prisma } from '../src/prisma/client.js'
import {
  ResearchTraceService,
  type ResearchTraceStage,
} from '../src/services/research-trace.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const service = new ResearchTraceService()
let ownerId = ''
let otherUserId = ''
let opportunityId = ''
let noSourceOpportunityId = ''

describe('Company Intelligence Research Trace Phase 1', () => {
  before(async () => {
    const [owner, other] = await Promise.all([
      prisma.user.create({
        data: {
          email: `research-trace-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `research-trace-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = other.id

    const task = await prisma.searchTask.create({
      data: {
        userId: ownerId,
        keyword: `European factory expansion ${suffix}`,
        provider: 'agent-reach',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
        completedAt: new Date(),
      },
    })
    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: task.id,
        provider: 'agent-reach',
        externalId: `trace-evidence-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.novatek-${suffix}.com/factory-update`,
        title: 'Novatek Systems GmbH factory update',
        content:
          'Novatek Systems GmbH publishes official information about its European factory expansion.',
        companyName: 'Novatek Systems GmbH',
        normalizedDomain: `novatek-${suffix}.com`,
        website: `https://novatek-${suffix}.com`,
      },
    })

    const [opportunity, noSourceOpportunity] = await Promise.all([
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          task.id,
          `trace-with-source-${suffix}`,
        ),
      }),
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          task.id,
          `trace-no-source-${suffix}`,
        ),
      }),
    ])
    opportunityId = opportunity.id
    noSourceOpportunityId = noSourceOpportunity.id

    await prisma.opportunityEvidence.create({
      data: {
        opportunityId,
        searchEvidenceId: evidence.id,
        excerpt: 'Official information about a European factory expansion.',
        isPrimary: true,
        confidence: 88,
      },
    })

    const profile = await prisma.companyProfile.create({
      data: {
        userId: ownerId,
        identityKey: `novatek-${suffix}.com`,
        companyName: 'Novatek Systems GmbH',
        normalizedDomain: `novatek-${suffix}.com`,
        officialWebsite: `https://novatek-${suffix}.com`,
        identityStatus: CompanyIdentityStatus.VERIFIED,
        identityConfidence: 92,
        analysisStatus: CompanyAnalysisStatus.READY,
        analysisVersion: 'v1',
      },
    })
    const source = await prisma.companySource.create({
      data: {
        companyProfileId: profile.id,
        searchEvidenceId: evidence.id,
        opportunityId,
        url: `https://www.novatek-${suffix}.com/factory-update`,
        title: 'Novatek Systems GmbH factory update',
        sourceType: CompanySourceType.OFFICIAL_WEBSITE,
        excerpt: 'Official factory expansion information.',
        capturedAt: new Date(),
        sourceHash: `trace-source-${suffix}`,
        confidence: 92,
      },
    })
    const snapshot = await prisma.companyIntelligenceSnapshot.create({
      data: {
        companyProfileId: profile.id,
        opportunityId,
        productContextSnapshot: {
          product: 'Industrial automation SaaS',
          region: 'Europe',
        },
        identitySnapshot: {
          companyName: 'Novatek Systems GmbH',
          officialWebsite: `https://novatek-${suffix}.com`,
        },
        understandingSnapshot: {
          reasons: [
            '企业官网提供了制造业务信息。',
          ],
        },
        relevanceAssessment: {
          reasons: [
            '工厂扩张变化与保存的工业自动化产品方向相关。',
          ],
        },
        researchHints: {
          verificationQuestions: [
            '确认扩张项目是否包含数字化生产系统。',
          ],
        },
        sourceIds: [source.id],
        analysisVersion: 'v1',
        analysisStatus: CompanyAnalysisStatus.READY,
        confidence: 88,
        analysisKey: `trace-snapshot-${suffix}`,
      },
    })
    await prisma.companyProfile.update({
      where: { id: profile.id },
      data: {
        currentSnapshotId: snapshot.id,
        currentVersion: 1,
      },
    })
    await prisma.companyOpportunity.create({
      data: {
        companyProfileId: profile.id,
        opportunityId,
        relationshipType: 'EVENT_SUBJECT',
      },
    })
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('isolates users and returns 404 across the trust boundary', async () => {
    await assert.rejects(
      () => service.getForUser(opportunityId, otherUserId),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'RESEARCH_TRACE_NOT_FOUND',
    )
  })

  it('does not expose a Research Trace for an Opportunity without Evidence', async () => {
    await assert.rejects(
      () => service.getForUser(noSourceOpportunityId, ownerId),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'RESEARCH_TRACE_NOT_FOUND',
    )
  })

  it('keeps Opportunity as an assessment instead of a procurement fact', async () => {
    const trace = await service.getForUser(opportunityId, ownerId)
    const step = trace.steps.find(
      (item) => item.stage === 'OPPORTUNITY_ASSESSMENT',
    )

    assert.equal(step?.informationType, 'ASSESSMENT')
    assert.ok((step?.reasons.length ?? 0) > 0)
    assert.ok(
      step?.pendingVerifications.includes(
        '尚未确认企业存在采购需求。',
      ),
    )
  })

  it('keeps CompanyProfile as an enterprise identity, not a Customer', async () => {
    const trace = await service.getForUser(opportunityId, ownerId)
    const step = trace.steps.find(
      (item) => item.stage === 'COMPANY_IDENTITY',
    )

    assert.equal(step?.informationType, 'FACT')
    assert.match(step?.summary ?? '', /企业画像/)
    assert.doesNotMatch(
      JSON.stringify(step?.outputReferences ?? []),
      /LEAD|CUSTOMER|CONTACT/,
    )
  })

  it('does not write domain data while generating the trace', async () => {
    const before = await domainCounts(ownerId)
    await service.getForUser(opportunityId, ownerId)
    const afterRead = await domainCounts(ownerId)

    assert.deepEqual(afterRead, before)
  })

  it('returns steps in the defined user research order', async () => {
    const trace = await service.getForUser(opportunityId, ownerId)
    const expected: ResearchTraceStage[] = [
      'PRODUCT_CONTEXT',
      'EVIDENCE_VALIDATION',
      'OPPORTUNITY_ASSESSMENT',
      'COMPANY_IDENTITY',
      'COMPANY_RESEARCH',
      'SALES_PREPARATION',
    ]

    assert.deepEqual(
      trace.steps.map((step) => step.stage),
      expected,
    )
  })

  it('returns the API envelope using authenticated user context', async () => {
    let received: { opportunityId: string; userId: string } | undefined
    let payload: unknown
    const controller = createGetResearchTraceController({
      async getForUser(requestOpportunityId, requestUserId) {
        received = {
          opportunityId: requestOpportunityId,
          userId: requestUserId,
        }
        return { opportunityId: requestOpportunityId, steps: [] }
      },
    })
    const request = {
      params: { id: 'opportunity-1' },
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
      opportunityId: 'opportunity-1',
      userId: 'user-1',
    })
    assert.deepEqual(payload, {
      data: { opportunityId: 'opportunity-1', steps: [] },
    })
  })
})

function opportunityData(
  userId: string,
  searchTaskId: string,
  dedupeKey: string,
) {
  return {
    userId,
    searchTaskId,
    type: OpportunityType.COMPANY_EXPANSION,
    dedupeKey,
    companyName: 'Novatek Systems GmbH',
    title: 'Novatek European factory expansion',
    summary: 'The company announced a European factory expansion.',
    whyItMatters:
      'Factory expansion may create future automation and software research opportunities.',
    recommendedNextStep:
      'Verify the project scope and the departments responsible for implementation.',
    confidence: 88,
    productContextSnapshot: {
      version: 'v2',
      context: {
        product: 'Industrial automation SaaS',
        industry: 'Industrial Manufacturing',
        region: 'Europe',
        customerType: 'Manufacturing companies',
      },
    },
  }
}

async function domainCounts(userId: string) {
  return {
    profiles: await prisma.companyProfile.count({ where: { userId } }),
    sources: await prisma.companySource.count({
      where: { companyProfile: { userId } },
    }),
    snapshots: await prisma.companyIntelligenceSnapshot.count({
      where: { companyProfile: { userId } },
    }),
    opportunities: await prisma.opportunity.count({ where: { userId } }),
    leads: await prisma.lead.count({ where: { userId } }),
    contacts: await prisma.contactProfile.count({
      where: { lead: { userId } },
    }),
  }
}
