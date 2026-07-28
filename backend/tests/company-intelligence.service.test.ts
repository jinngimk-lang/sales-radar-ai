import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  CompanyAnalysisStatus,
  CompanyIdentityStatus,
  CompanySourceType,
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { CompanyIntelligenceService } from '../src/services/company-intelligence.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const service = new CompanyIntelligenceService()
let ownerId = ''
let otherUserId = ''
let productProfileId = ''
let searchTaskId = ''
let evidenceId = ''
let opportunityId = ''

describe('Company Intelligence Agent v1 Phase 2', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `company-intelligence-service-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `company-intelligence-outsider-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id

    const productProfile = await prisma.productProfile.create({
      data: {
        userId: ownerId,
        productName: `Industrial automation software ${suffix}`,
        category: 'Industrial SaaS',
        industry: 'Industrial Manufacturing',
        buyerPersona: [
          {
            customerType: 'Manufacturing companies',
          },
        ],
        decisionMakerRoles: [],
      },
    })
    productProfileId = productProfile.id

    const searchTask = await prisma.searchTask.create({
      data: {
        userId: ownerId,
        productProfileId,
        keyword: `European factory digital upgrade ${suffix}`,
        provider: 'agent-reach',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
      },
    })
    searchTaskId = searchTask.id

    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId,
        provider: 'agent-reach',
        externalId: `keba-official-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.keba.com/en/industrial-automation/${suffix}`,
        title: 'KEBA Industrial Automation GmbH official information',
        content:
          'KEBA Industrial Automation GmbH provides industrial automation technology. This official source describes its manufacturing automation business.',
        rawMetadata: {
          title: 'KEBA Industrial Automation GmbH official information',
          companyName: 'KEBA Industrial Automation GmbH',
          companyDomain: 'keba.com',
          companyWebsite: 'https://www.keba.com',
        },
        companyName: 'KEBA Industrial Automation GmbH',
        normalizedDomain: 'keba.com',
        website: 'https://keba.com',
      },
    })
    evidenceId = evidence.id

    const opportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId,
        type: OpportunityType.DIGITAL_UPGRADE,
        dedupeKey: `keba-digital-upgrade-${suffix}`,
        companyName: 'KEBA Industrial Automation GmbH',
        title: 'KEBA industrial automation information',
        summary:
          'Official company information provides a sourced research subject.',
        whyItMatters:
          'The company can be researched against the saved product context.',
        recommendedNextStep:
          'Verify business relevance before any sales qualification.',
        confidence: 85,
        productContextSnapshot: {
          version: 'v2',
          context: {
            product: 'Industrial automation software',
            industry: 'Industrial Manufacturing',
            region: 'Europe',
            customerType: 'Manufacturing companies',
          },
        },
      },
    })
    opportunityId = opportunity.id

    await prisma.opportunityEvidence.create({
      data: {
        opportunityId,
        searchEvidenceId: evidenceId,
        excerpt:
          'KEBA Industrial Automation GmbH provides industrial automation technology.',
        isPrimary: true,
        confidence: 85,
      },
    })
  })

  after(async () => {
    await prisma.user
      .delete({ where: { id: ownerId } })
      .catch(() => undefined)
    await prisma.user
      .delete({ where: { id: otherUserId } })
      .catch(() => undefined)
  })

  it('creates CompanyProfile, real CompanySource and an immutable versioned snapshot', async () => {
    const result = await service.analyze({
      userId: ownerId,
      opportunityId,
      searchEvidenceId: evidenceId,
    })
    const profile = await prisma.companyProfile.findUniqueOrThrow({
      where: { id: result.companyProfileId },
      include: {
        sources: true,
        snapshots: true,
        opportunities: true,
      },
    })

    assert.equal(profile.companyName, 'KEBA Industrial Automation GmbH')
    assert.equal(profile.normalizedDomain, 'keba.com')
    assert.equal(profile.officialWebsite, 'https://keba.com')
    assert.equal(profile.identityStatus, CompanyIdentityStatus.VERIFIED)
    assert.equal(profile.analysisStatus, CompanyAnalysisStatus.NEEDS_REVIEW)
    assert.equal(profile.analysisVersion, 'v1')
    assert.equal(profile.currentVersion, 1)
    assert.equal(profile.currentSnapshotId, result.snapshotId)
    assert.equal(profile.sources.length, 1)
    assert.equal(profile.sources[0]?.searchEvidenceId, evidenceId)
    assert.equal(profile.sources[0]?.url.includes('keba.com'), true)
    assert.equal(
      profile.sources[0]?.sourceType,
      CompanySourceType.OFFICIAL_WEBSITE,
    )
    assert.equal(profile.snapshots.length, 1)
    assert.equal(profile.snapshots[0]?.analysisVersion, 'v1')
    assert.deepEqual(profile.snapshots[0]?.sourceIds, [
      result.companySourceId,
    ])
    assert.equal(profile.opportunities.length, 1)
    assert.equal(
      profile.opportunities[0]?.relationshipType,
      'EVENT_SUBJECT',
    )

    const understanding = profile.snapshots[0]
      ?.understandingSnapshot as Record<string, unknown>
    const relevance = profile.snapshots[0]
      ?.relevanceAssessment as Record<string, unknown>
    assert.equal(understanding.status, 'NOT_ANALYZED')
    assert.equal(relevance.status, 'NOT_ASSESSED')
  })

  it('validates Opportunity ownership without exposing another user data', async () => {
    await assert.rejects(
      () =>
        service.analyze({
          userId: otherUserId,
          opportunityId,
          searchEvidenceId: evidenceId,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'COMPANY_INTELLIGENCE_OPPORTUNITY_NOT_FOUND',
    )
  })

  it('requires SearchEvidence to belong to the selected Opportunity', async () => {
    const unrelatedEvidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId,
        provider: 'agent-reach',
        externalId: `unrelated-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://www.keba.com/en/unrelated/${suffix}`,
        title: 'Unrelated KEBA source',
        content:
          'KEBA Industrial Automation GmbH official company information.',
        companyName: 'KEBA Industrial Automation GmbH',
        normalizedDomain: 'keba.com',
        website: 'https://keba.com',
      },
    })

    await assert.rejects(
      () =>
        service.analyze({
          userId: ownerId,
          opportunityId,
          searchEvidenceId: unrelatedEvidence.id,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'COMPANY_INTELLIGENCE_EVIDENCE_NOT_FOUND',
    )
  })

  it('does not create a company from unverified content or a generic title', async () => {
    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId,
        provider: 'agent-reach',
        externalId: `generic-content-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://industryweek.com/automation/${suffix}`,
        title: 'Automation Technology and OEM Manufacturing',
        content:
          'An industry article discussing automation technology and OEM manufacturing.',
      },
    })
    const opportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId,
        type: OpportunityType.DIGITAL_UPGRADE,
        dedupeKey: `generic-content-${suffix}`,
        title: 'Automation Technology and OEM Manufacturing',
        summary: 'Generic industry content.',
        whyItMatters: 'It may be evidence, but it is not a verified company.',
        recommendedNextStep: 'Keep as evidence only.',
        confidence: 40,
        productContextSnapshot: {
          product: 'Industrial automation software',
        },
      },
    })
    await prisma.opportunityEvidence.create({
      data: {
        opportunityId: opportunity.id,
        searchEvidenceId: evidence.id,
        excerpt: 'Generic industry content.',
        confidence: 40,
      },
    })
    const profilesBefore = await prisma.companyProfile.count({
      where: { userId: ownerId },
    })

    await assert.rejects(
      () =>
        service.analyze({
          userId: ownerId,
          opportunityId: opportunity.id,
          searchEvidenceId: evidence.id,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 422 &&
        error.code === 'COMPANY_IDENTITY_NOT_VERIFIED',
    )

    assert.equal(
      await prisma.companyProfile.count({ where: { userId: ownerId } }),
      profilesBefore,
    )
  })

  it('rejects mock evidence instead of creating Company Intelligence data', async () => {
    const mockTask = await prisma.searchTask.create({
      data: {
        userId: ownerId,
        keyword: `mock source ${suffix}`,
        provider: 'mock',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
      },
    })
    const mockEvidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: mockTask.id,
        provider: 'mock',
        externalId: `mock-company-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://mock-company-${suffix}.example.com`,
        title: 'Mock Company GmbH',
        content: 'Mock Company GmbH content must never enter this domain.',
        companyName: 'Mock Company GmbH',
      },
    })
    const mockOpportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId: mockTask.id,
        type: OpportunityType.INVESTMENT,
        dedupeKey: `mock-opportunity-${suffix}`,
        companyName: 'Mock Company GmbH',
        title: 'Mock opportunity',
        summary: 'Test fixture.',
        whyItMatters: 'It must be rejected.',
        recommendedNextStep: 'Do not persist.',
        confidence: 90,
        productContextSnapshot: {
          product: 'Industrial automation software',
        },
      },
    })
    await prisma.opportunityEvidence.create({
      data: {
        opportunityId: mockOpportunity.id,
        searchEvidenceId: mockEvidence.id,
        excerpt: 'Mock fixture.',
        confidence: 90,
      },
    })

    await assert.rejects(
      () =>
        service.analyze({
          userId: ownerId,
          opportunityId: mockOpportunity.id,
          searchEvidenceId: mockEvidence.id,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 422 &&
        error.code === 'COMPANY_INTELLIGENCE_SOURCE_NOT_ELIGIBLE',
    )
  })

  it('is idempotent and never creates a Lead or Contact', async () => {
    const before = {
      leads: await prisma.lead.count({ where: { userId: ownerId } }),
      contacts: await prisma.contactProfile.count({
        where: { lead: { userId: ownerId } },
      }),
    }
    const first = await service.analyze({
      userId: ownerId,
      opportunityId,
      searchEvidenceId: evidenceId,
    })
    const second = await service.analyze({
      userId: ownerId,
      opportunityId,
      searchEvidenceId: evidenceId,
    })

    assert.equal(first.snapshotId, second.snapshotId)
    assert.equal(second.createdSnapshot, false)
    assert.equal(
      await prisma.companySource.count({
        where: { companyProfileId: first.companyProfileId },
      }),
      1,
    )
    assert.equal(
      await prisma.companyIntelligenceSnapshot.count({
        where: { companyProfileId: first.companyProfileId },
      }),
      1,
    )
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
