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
import { createGetCompanyIntelligenceWorkspaceController } from '../src/controllers/opportunity.controller.js'
import { prisma } from '../src/prisma/client.js'
import { CompanyIntelligenceWorkspaceService } from '../src/services/company-intelligence-workspace.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const service = new CompanyIntelligenceWorkspaceService()
let ownerId = ''
let otherUserId = ''
let opportunityId = ''
let emptyOpportunityId = ''
let evidenceId = ''
let profileId = ''

describe('Company Intelligence Research Workspace Phase 1A', () => {
  before(async () => {
    const [owner, other] = await Promise.all([
      prisma.user.create({
        data: {
          email: `workspace-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `workspace-other-${suffix}@salesradar.local`,
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
      },
    })
    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: task.id,
        provider: 'agent-reach',
        externalId: `workspace-evidence-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.novatek-${suffix}.com/update`,
        title: 'Novatek Systems GmbH factory update',
        content:
          'Novatek Systems GmbH publishes official information about a European factory update.',
        companyName: 'Novatek Systems GmbH',
        normalizedDomain: `novatek-${suffix}.com`,
        website: `https://novatek-${suffix}.com`,
      },
    })
    evidenceId = evidence.id

    const [opportunity, emptyOpportunity] = await Promise.all([
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          task.id,
          `workspace-researched-${suffix}`,
        ),
      }),
      prisma.opportunity.create({
        data: opportunityData(
          ownerId,
          task.id,
          `workspace-empty-${suffix}`,
        ),
      }),
    ])
    opportunityId = opportunity.id
    emptyOpportunityId = emptyOpportunity.id

    await Promise.all([
      prisma.opportunityEvidence.create({
        data: {
          opportunityId,
          searchEvidenceId: evidenceId,
          excerpt: 'Official factory update.',
          isPrimary: true,
          confidence: 88,
        },
      }),
      prisma.opportunityEvidence.create({
        data: {
          opportunityId: emptyOpportunityId,
          searchEvidenceId: evidenceId,
          excerpt: 'Official factory update.',
          isPrimary: true,
          confidence: 88,
        },
      }),
    ])

    const profile = await prisma.companyProfile.create({
      data: {
        userId: ownerId,
        identityKey: `novatek-${suffix}.com`,
        companyName: 'Novatek Systems GmbH',
        normalizedDomain: `novatek-${suffix}.com`,
        officialWebsite: `https://novatek-${suffix}.com`,
        industry: 'Industrial Manufacturing',
        identityStatus: CompanyIdentityStatus.VERIFIED,
        identityConfidence: 92,
        analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
      },
    })
    profileId = profile.id
    const source = await prisma.companySource.create({
      data: {
        companyProfileId: profile.id,
        searchEvidenceId: evidenceId,
        opportunityId,
        url: `https://www.novatek-${suffix}.com/update`,
        title: 'Novatek Systems GmbH factory update',
        sourceType: CompanySourceType.OFFICIAL_WEBSITE,
        excerpt: 'Official factory update.',
        capturedAt: new Date(),
        sourceHash: `workspace-source-${suffix}`,
        confidence: 92,
      },
    })
    await prisma.companySource.create({
      data: {
        companyProfileId: profile.id,
        url: `https://www.novatek-${suffix}.com/unrelated`,
        title: 'Unrelated profile source',
        sourceType: CompanySourceType.OFFICIAL_WEBSITE,
        capturedAt: new Date(),
        sourceHash: `workspace-unrelated-${suffix}`,
        confidence: 80,
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
          status: 'NOT_ANALYZED',
        },
        relevanceAssessment: {
          status: 'NOT_ASSESSED',
        },
        researchHints: {
          status: 'NOT_GENERATED',
        },
        sourceIds: [source.id],
        analysisStatus: CompanyAnalysisStatus.NEEDS_REVIEW,
        confidence: 92,
        analysisKey: `workspace-snapshot-${suffix}`,
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

  it('returns the owned Opportunity, Product Context and Evidence summary', async () => {
    const workspace = await service.getForUser(opportunityId, ownerId)

    assert.equal(workspace.opportunity.id, opportunityId)
    assert.deepEqual(workspace.productContextSnapshot, {
      product: 'Industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Manufacturing companies',
    })
    assert.equal(workspace.searchEvidence.length, 1)
    assert.equal(
      workspace.searchEvidence[0]?.searchEvidence.id,
      evidenceId,
    )
    assert.equal(
      'content' in (workspace.searchEvidence[0]?.searchEvidence ?? {}),
      false,
    )
  })

  it('returns only the owned CompanyProfile and its Opportunity sources', async () => {
    const workspace = await service.getForUser(opportunityId, ownerId)

    assert.equal(workspace.companyProfile?.id, profileId)
    assert.equal(
      workspace.companyProfile?.companyName,
      'Novatek Systems GmbH',
    )
    assert.equal(workspace.companySources.length, 1)
    assert.equal(workspace.companySources[0]?.opportunityId, undefined)
    assert.equal(
      workspace.companySources[0]?.url.includes('/update'),
      true,
    )
    assert.equal(workspace.research.status, 'NEEDS_REVIEW')
    assert.equal(
      workspace.research.currentSnapshot?.analysisVersion,
      'v1',
    )
    assert.equal(workspace.permissions.canResearch, false)
    assert.equal(workspace.permissions.canRefresh, true)
  })

  it('returns a truthful not-started state without creating data', async () => {
    const before = await domainCounts(ownerId)
    const workspace = await service.getForUser(
      emptyOpportunityId,
      ownerId,
    )
    const afterRead = await domainCounts(ownerId)

    assert.equal(workspace.companyProfile, null)
    assert.deepEqual(workspace.companySources, [])
    assert.equal(workspace.research.status, 'NOT_STARTED')
    assert.equal(workspace.permissions.canResearch, true)
    assert.equal(
      workspace.permissions.eligibleSearchEvidenceId,
      evidenceId,
    )
    assert.deepEqual(afterRead, before)
  })

  it('isolates another user without exposing the Opportunity', async () => {
    await assert.rejects(
      () => service.getForUser(opportunityId, otherUserId),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'COMPANY_INTELLIGENCE_WORKSPACE_NOT_FOUND',
    )
  })

  it('returns the workspace API envelope with authenticated user context', async () => {
    let received: { opportunityId: string; userId: string } | undefined
    let payload: unknown
    const controller =
      createGetCompanyIntelligenceWorkspaceController({
        async getForUser(requestOpportunityId, requestUserId) {
          received = {
            opportunityId: requestOpportunityId,
            userId: requestUserId,
          }
          return { research: { status: 'NOT_STARTED' } }
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
      data: { research: { status: 'NOT_STARTED' } },
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
    title: 'Novatek European factory update',
    summary: 'A sourced company change for sales research.',
    whyItMatters:
      'The company change may be relevant to the saved product direction.',
    recommendedNextStep:
      'Research the company before considering sales action.',
    confidence: 88,
    productContextSnapshot: {
      product: 'Industrial automation SaaS',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Manufacturing companies',
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
    leads: await prisma.lead.count({ where: { userId } }),
    contacts: await prisma.contactProfile.count({
      where: { lead: { userId } },
    }),
  }
}
