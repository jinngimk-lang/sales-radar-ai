import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  CompanyAnalysisStatus,
  CompanyIdentityStatus,
  CompanySourceType,
  CompanyType,
  OpportunityType,
  Platform,
  Region,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'

const suffix = randomUUID()
let ownerId = ''
let otherUserId = ''
let companyProfileId = ''
let otherCompanyProfileId = ''
let productProfileId = ''
let opportunityId = ''
let evidenceId = ''
let sourceId = ''
let firstSnapshotId = ''

describe('Company Intelligence Phase 1 domain persistence', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `company-intelligence-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `company-intelligence-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id

    const productProfile = await prisma.productProfile.create({
      data: {
        userId: ownerId,
        productName: `Industrial robots ${suffix}`,
        category: 'Industrial automation equipment',
        industry: 'Industrial Manufacturing',
        buyerPersona: [
          {
            customerType: 'Automotive manufacturers',
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
        keyword: `Toyota factory expansion ${suffix}`,
        provider: 'agent-reach',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
        parameters: {
          productContextSnapshot: {
            version: 'v2',
            context: {
              product: 'Industrial robots',
              industry: 'Industrial Manufacturing',
              region: 'Europe',
              customerType: 'Automotive manufacturers',
            },
          },
        },
      },
    })
    const evidence = await prisma.searchEvidence.create({
      data: {
        searchTaskId: searchTask.id,
        provider: 'agent-reach',
        externalId: `toyota-expansion-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://global.toyota/en/newsroom/corporate/${suffix}`,
        title: 'Toyota manufacturing expansion announcement',
        content:
          'A Toyota corporate source describes a manufacturing expansion. Procurement is not asserted.',
      },
    })
    evidenceId = evidence.id

    const opportunity = await prisma.opportunity.create({
      data: {
        userId: ownerId,
        searchTaskId: searchTask.id,
        type: OpportunityType.COMPANY_EXPANSION,
        dedupeKey: `toyota-expansion-${suffix}`,
        companyName: 'Toyota Motor Corporation',
        title: 'Toyota manufacturing expansion announcement',
        summary:
          'A sourced company announcement describes manufacturing expansion.',
        whyItMatters:
          'Expansion can justify further company research, but does not prove a purchase.',
        recommendedNextStep:
          'Verify the project scope and relevant manufacturing functions.',
        confidence: 80,
        productContextSnapshot: {
          product: 'Industrial robots',
          industry: 'Industrial Manufacturing',
          region: 'Europe',
        },
      },
    })
    opportunityId = opportunity.id

    const companyProfile = await prisma.companyProfile.create({
      data: {
        userId: ownerId,
        identityKey: 'toyota.com',
        companyName: 'Toyota Motor Corporation',
        normalizedDomain: 'toyota.com',
        officialWebsite: 'https://global.toyota',
        country: 'Japan',
        region: 'Global',
        industry: 'Automotive Manufacturing',
        industries: ['Automotive Manufacturing'],
        companyType: CompanyType.MANUFACTURER,
        identityStatus: CompanyIdentityStatus.VERIFIED,
        identityConfidence: 95,
        analysisStatus: CompanyAnalysisStatus.DRAFT,
      },
    })
    companyProfileId = companyProfile.id
  })

  after(async () => {
    await prisma.user
      .delete({ where: { id: ownerId } })
      .catch(() => undefined)
    await prisma.user
      .delete({ where: { id: otherUserId } })
      .catch(() => undefined)
  })

  it('isolates stable company identities by user', async () => {
    const otherProfile = await prisma.companyProfile.create({
      data: {
        userId: otherUserId,
        identityKey: 'toyota.com',
        companyName: 'Toyota Motor Corporation',
      },
    })
    otherCompanyProfileId = otherProfile.id

    const ownerProfiles = await prisma.companyProfile.findMany({
      where: { userId: ownerId, identityKey: 'toyota.com' },
    })
    const otherProfiles = await prisma.companyProfile.findMany({
      where: { userId: otherUserId, identityKey: 'toyota.com' },
    })

    assert.equal(ownerProfiles.length, 1)
    assert.equal(ownerProfiles[0]?.id, companyProfileId)
    assert.equal(otherProfiles.length, 1)
    assert.equal(otherProfiles[0]?.id, otherProfile.id)

    await assert.rejects(() =>
      prisma.companyProfile.create({
        data: {
          userId: ownerId,
          identityKey: 'toyota.com',
          companyName: 'Duplicate Toyota',
        },
      }),
    )

    await assert.rejects(() =>
      prisma.companyOpportunity.create({
        data: {
          companyProfileId: otherCompanyProfileId,
          opportunityId,
          relationshipType: 'EVENT_SUBJECT',
        },
      }),
    )
  })

  it('saves a real source independently and optionally traces evidence', async () => {
    const officialSource = await prisma.companySource.create({
      data: {
        companyProfileId,
        url: 'https://global.toyota/en/',
        title: 'Toyota Motor Corporation official website',
        sourceType: CompanySourceType.OFFICIAL_WEBSITE,
        capturedAt: new Date('2026-07-28T00:00:00.000Z'),
        sourceHash: `official-${suffix}`,
        confidence: 100,
      },
    })
    const evidenceSource = await prisma.companySource.create({
      data: {
        companyProfileId,
        searchEvidenceId: evidenceId,
        opportunityId,
        url: `https://global.toyota/en/newsroom/corporate/${suffix}`,
        title: 'Toyota manufacturing expansion announcement',
        sourceType: CompanySourceType.COMPANY_ANNOUNCEMENT,
        excerpt:
          'The source supports an expansion event, not a confirmed procurement.',
        capturedAt: new Date('2026-07-28T01:00:00.000Z'),
        sourceHash: `announcement-${suffix}`,
        confidence: 90,
      },
    })
    sourceId = evidenceSource.id

    assert.equal(officialSource.searchEvidenceId, null)
    assert.equal(officialSource.opportunityId, null)
    assert.equal(evidenceSource.searchEvidenceId, evidenceId)
    assert.equal(evidenceSource.opportunityId, opportunityId)

    await assert.rejects(() =>
      prisma.companySource.create({
        data: {
          companyProfileId: otherCompanyProfileId,
          searchEvidenceId: evidenceId,
          url: `https://global.toyota/en/newsroom/cross-tenant/${suffix}`,
          title: 'Cross-tenant source must be rejected',
          sourceType: CompanySourceType.SEARCH_EVIDENCE,
          capturedAt: new Date('2026-07-28T01:30:00.000Z'),
          sourceHash: `cross-tenant-${suffix}`,
        },
      }),
    )
  })

  it('keeps versioned Company Intelligence snapshots as immutable history', async () => {
    const first = await prisma.companyIntelligenceSnapshot.create({
      data: {
        companyProfileId,
        opportunityId,
        productProfileId,
        productContextSnapshot: {
          product: 'Industrial robots',
          industry: 'Industrial Manufacturing',
          region: 'Europe',
        },
        identitySnapshot: {
          companyName: 'Toyota Motor Corporation',
          domain: 'toyota.com',
          identityStatus: 'VERIFIED',
        },
        understandingSnapshot: {
          description: 'Automotive manufacturer',
          products: [],
          industries: ['Automotive Manufacturing'],
          businessModel: 'Manufacturer',
        },
        relevanceAssessment: {
          relevanceScore: 85,
          reasons: ['Industry alignment', 'Sourced expansion signal'],
          matchedApplications: ['manufacturing automation'],
          matchedSignals: ['factory expansion'],
        },
        researchHints: {
          suggestedDepartments: [
            'Manufacturing Engineering',
            'Automation Engineering',
          ],
          businessTopics: ['production-line automation'],
          verificationQuestions: [
            'Is the expansion project still in planning or implementation?',
          ],
        },
        sourceIds: [sourceId],
        analysisStatus: CompanyAnalysisStatus.READY,
        confidence: 85,
        analysisKey: `v1-${suffix}`,
      },
    })
    firstSnapshotId = first.id

    const second = await prisma.companyIntelligenceSnapshot.create({
      data: {
        companyProfileId,
        opportunityId,
        productProfileId,
        productContextSnapshot: {
          product: 'Industrial robots',
          industry: 'Industrial Manufacturing',
          region: 'Europe',
        },
        identitySnapshot: first.identitySnapshot,
        understandingSnapshot: first.understandingSnapshot,
        relevanceAssessment: {
          relevanceScore: 88,
          reasons: ['Industry alignment', 'Additional sourced evidence'],
          matchedApplications: ['manufacturing automation'],
          matchedSignals: ['factory expansion'],
        },
        researchHints: first.researchHints,
        sourceIds: [sourceId],
        analysisVersion: 'v2',
        analysisStatus: CompanyAnalysisStatus.READY,
        confidence: 88,
        analysisKey: `v2-${suffix}`,
      },
    })
    await prisma.companyProfile.update({
      where: { id: companyProfileId },
      data: {
        currentSnapshotId: second.id,
        currentVersion: 2,
        analysisStatus: CompanyAnalysisStatus.READY,
        analysisVersion: 'v2',
      },
    })

    const history = await prisma.companyIntelligenceSnapshot.findMany({
      where: { companyProfileId },
      orderBy: { createdAt: 'asc' },
    })
    const profile = await prisma.companyProfile.findUniqueOrThrow({
      where: { id: companyProfileId },
    })

    assert.equal(history.length, 2)
    assert.equal(profile.currentSnapshotId, second.id)
    assert.equal(profile.currentVersion, 2)
    assert.equal(history[0]?.confidence, 85)

    await assert.rejects(() =>
      prisma.companyIntelligenceSnapshot.update({
        where: { id: firstSnapshotId },
        data: { confidence: 1 },
      }),
    )
  })

  it('links an Opportunity by explicit relationship without creating sales records', async () => {
    const relation = await prisma.companyOpportunity.create({
      data: {
        companyProfileId,
        opportunityId,
        relationshipType: 'EVENT_SUBJECT',
      },
    })

    assert.equal(relation.relationshipType, 'EVENT_SUBJECT')
    assert.equal(
      await prisma.lead.count({
        where: { userId: ownerId },
      }),
      0,
    )
    assert.equal(
      await prisma.contactProfile.count({
        where: { lead: { userId: ownerId } },
      }),
      0,
    )
  })
})
