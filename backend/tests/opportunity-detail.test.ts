import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import type { Request, Response } from 'express'
import {
  CompanyAnalysisStatus,
  CompanyIdentityStatus,
  CompanyType,
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { createGetOpportunityDetailController } from '../src/controllers/opportunity.controller.js'
import { prisma } from '../src/prisma/client.js'
import { OpportunityService } from '../src/services/opportunity.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const service = new OpportunityService()
let ownerId = ''
let otherUserId = ''
let taskId = ''
let unresearchedOpportunityId = ''
let researchedOpportunityId = ''
let failedOpportunityId = ''
let evidenceId = ''

describe('Opportunity Detail Phase 1', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `opportunity-detail-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `opportunity-detail-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id

    const [task, failedTask] = await Promise.all([
      prisma.searchTask.create({
        data: {
          userId: ownerId,
          keyword: `European manufacturing expansion ${suffix}`,
          provider: 'agent-reach',
          status: 'COMPLETED',
          platforms: [Platform.Website],
          regions: [Region.Europe],
        },
      }),
      prisma.searchTask.create({
        data: {
          userId: ownerId,
          keyword: `failed opportunity detail ${suffix}`,
          provider: 'agent-reach',
          status: 'FAILED',
          platforms: [Platform.Website],
          regions: [Region.Europe],
        },
      }),
    ])
    taskId = task.id

    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: task.id,
        provider: 'agent-reach',
        externalId: `detail-evidence-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.keba.com/en/news/${suffix}`,
        title: 'KEBA announces a European digital manufacturing project',
        content:
          'KEBA published official information about a European digital manufacturing project.',
      },
    })
    evidenceId = evidence.id

    const [unresearched, researched, failed] = await Promise.all([
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          task.id,
          `unresearched-${suffix}`,
          'Manufacturing expansion opportunity',
        ),
      }),
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          task.id,
          `researched-${suffix}`,
          'Digital manufacturing opportunity',
        ),
      }),
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          failedTask.id,
          `failed-${suffix}`,
          'Failed search opportunity',
        ),
      }),
    ])
    unresearchedOpportunityId = unresearched.id
    researchedOpportunityId = researched.id
    failedOpportunityId = failed.id

    await Promise.all([
      prisma.opportunityEvidence.create({
        data: {
          opportunityId: unresearched.id,
          searchEvidenceId: evidence.id,
          excerpt: 'Official information about a manufacturing project.',
          isPrimary: true,
          confidence: 84,
        },
      }),
      prisma.opportunityEvidence.create({
        data: {
          opportunityId: researched.id,
          searchEvidenceId: evidence.id,
          excerpt: 'Official information about a digital project.',
          isPrimary: true,
          confidence: 86,
        },
      }),
    ])

    const profile = await prisma.companyProfile.create({
      data: {
        userId: ownerId,
        identityKey: `keba-${suffix}.com`,
        companyName: 'KEBA Industrial Automation GmbH',
        normalizedDomain: `keba-${suffix}.com`,
        officialWebsite: 'https://www.keba.com',
        companyType: CompanyType.MANUFACTURER,
        identityStatus: CompanyIdentityStatus.VERIFIED,
        identityConfidence: 92,
        analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
      },
    })
    const snapshot = await prisma.companyIntelligenceSnapshot.create({
      data: {
        companyProfileId: profile.id,
        opportunityId: researched.id,
        productContextSnapshot: {
          product: 'Industrial automation SaaS',
          region: 'Europe',
        },
        identitySnapshot: {
          companyName: 'KEBA Industrial Automation GmbH',
          officialWebsite: 'https://www.keba.com',
        },
        understandingSnapshot: {
          status: 'NOT_ANALYZED',
        },
        relevanceAssessment: {
          status: 'NOT_ASSESSED',
        },
        researchHints: {
          status: 'NOT_GENERATED',
        },
        analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
        confidence: 92,
        analysisKey: `opportunity-detail-${suffix}`,
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
        opportunityId: researched.id,
        relationshipType: 'EVENT_SUBJECT',
      },
    })
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('returns opportunity, Evidence and Product Context without inventing research', async () => {
    const detail = await service.getDetailForUser(
      unresearchedOpportunityId,
      ownerId,
    )

    assert.equal(detail.id, unresearchedOpportunityId)
    assert.equal(detail.searchTaskId, taskId)
    assert.equal(detail.companyResearchStatus, 'NOT_STARTED')
    assert.deepEqual(detail.companies, [])
    assert.equal(detail.evidence.length, 1)
    assert.equal(detail.evidence[0]?.searchEvidence.id, evidenceId)
    assert.equal(
      detail.evidence[0]?.searchEvidence.rawUrl.includes('keba.com'),
      true,
    )
    assert.deepEqual(detail.productContextSnapshot, {
      product: 'Industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Manufacturing companies',
    })
  })

  it('returns existing CompanyProfile summaries and research status', async () => {
    const detail = await service.getDetailForUser(
      researchedOpportunityId,
      ownerId,
    )

    assert.equal(detail.companyResearchStatus, 'NEEDS_REVIEW')
    assert.equal(detail.companies.length, 1)
    assert.equal(
      detail.companies[0]?.companyName,
      'KEBA Industrial Automation GmbH',
    )
    assert.equal(detail.companies[0]?.relationshipType, 'EVENT_SUBJECT')
    assert.equal(
      detail.companies[0]?.currentSnapshot?.analysisStatus,
      'NEEDS_REVIEW',
    )
  })

  it('isolates another user and excludes Opportunities from failed searches', async () => {
    await assert.rejects(
      () =>
        service.getDetailForUser(
          unresearchedOpportunityId,
          otherUserId,
        ),
      isNotFound,
    )
    await assert.rejects(
      () => service.getDetailForUser(failedOpportunityId, ownerId),
      isNotFound,
    )
  })

  it('returns the API envelope with the authenticated user context', async () => {
    let receivedId = ''
    let receivedUserId = ''
    let payload: unknown
    const controller = createGetOpportunityDetailController({
      async getDetailForUser(id, userId) {
        receivedId = id
        receivedUserId = userId
        return { id, companyResearchStatus: 'NOT_STARTED' }
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

    assert.equal(receivedId, 'opportunity-1')
    assert.equal(receivedUserId, 'user-1')
    assert.deepEqual(payload, {
      data: {
        id: 'opportunity-1',
        companyResearchStatus: 'NOT_STARTED',
      },
    })
  })

  it('does not create Leads or Contacts while reading detail', async () => {
    const before = {
      leads: await prisma.lead.count({ where: { userId: ownerId } }),
      contacts: await prisma.contactProfile.count({
        where: { lead: { userId: ownerId } },
      }),
    }

    await service.getDetailForUser(researchedOpportunityId, ownerId)

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

function opportunityData(
  userId: string,
  searchTaskId: string,
  dedupeKey: string,
  title: string,
) {
  return {
    userId,
    searchTaskId,
    type: OpportunityType.DIGITAL_UPGRADE,
    dedupeKey,
    companyName: null,
    title,
    summary: 'A sourced company change that may merit sales research.',
    whyItMatters:
      'The change may be relevant to the saved product direction.',
    recommendedNextStep:
      'Review the source and confirm the company before taking action.',
    confidence: 84,
    productContextSnapshot: {
      product: 'Industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Manufacturing companies',
    },
  }
}

function isNotFound(error: unknown) {
  return (
    error instanceof AppError &&
    error.statusCode === 404 &&
    error.code === 'OPPORTUNITY_NOT_FOUND'
  )
}
