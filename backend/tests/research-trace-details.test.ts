import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  CompanyAnalysisStatus,
  CompanyIdentityStatus,
  CompanySourceType,
  LeadEvidenceStatus,
  OpportunityType,
  Platform,
  Region,
  SearchEvidenceExtractionStatus,
} from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { ResearchTraceDetailsService } from '../src/services/research-trace-details.service.js'
import { ResearchTraceService } from '../src/services/research-trace.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const detailsService = new ResearchTraceDetailsService()
const phaseOneService = new ResearchTraceService()
let ownerId = ''
let otherUserId = ''
let opportunityId = ''
let noSourceOpportunityId = ''

describe('Research Trace Phase 2A details', () => {
  before(async () => {
    const [owner, other] = await Promise.all([
      prisma.user.create({
        data: {
          email: `trace-v2-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `trace-v2-other-${suffix}@salesradar.local`,
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
        externalId: `trace-v2-evidence-${suffix}`,
        platform: Platform.Website,
        rawUrl: `https://news.novatek-${suffix}.com/factory`,
        title: 'Official factory update',
        content:
          'Novatek Systems GmbH announced a European factory expansion.',
        companyName: 'Different Structured Identity Ltd',
        normalizedDomain: `different-${suffix}.com`,
        extractionStatus: SearchEvidenceExtractionStatus.PROCESSED,
        evidenceStatus: LeadEvidenceStatus.VALID,
      },
    })

    const opportunity = await prisma.opportunity.create({
      data: opportunityData(
        ownerId,
        task.id,
        `trace-v2-${suffix}`,
      ),
    })
    const noSourceOpportunity = await prisma.opportunity.create({
      data: opportunityData(
        ownerId,
        task.id,
        `trace-v2-no-source-${suffix}`,
      ),
    })
    opportunityId = opportunity.id
    noSourceOpportunityId = noSourceOpportunity.id

    await prisma.opportunityEvidence.create({
      data: {
        opportunityId,
        searchEvidenceId: evidence.id,
        excerpt:
          'The official source describes a European factory expansion.',
        isPrimary: true,
        confidence: 90,
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
        identityConfidence: 90,
        analysisStatus: CompanyAnalysisStatus.READY,
        analysisVersion: 'v1',
      },
    })
    const source = await prisma.companySource.create({
      data: {
        companyProfileId: profile.id,
        searchEvidenceId: evidence.id,
        opportunityId,
        url: `https://news.novatek-${suffix}.com/factory`,
        title: 'Official factory update',
        sourceType: CompanySourceType.OFFICIAL_WEBSITE,
        excerpt: 'The source describes a factory expansion.',
        capturedAt: new Date(),
        sourceHash: `trace-v2-source-${suffix}`,
        confidence: 90,
      },
    })
    const snapshot =
      await prisma.companyIntelligenceSnapshot.create({
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
            reasons: ['The source supports a manufacturing context.'],
          },
          relevanceAssessment: {
            reasons: [
              'Factory expansion may be relevant to the saved product direction.',
            ],
          },
          researchHints: {
            verificationQuestions: [
              'Verify whether the project includes production software.',
            ],
          },
          sourceIds: [source.id],
          analysisVersion: 'v1',
          analysisStatus: CompanyAnalysisStatus.READY,
          confidence: 86,
          analysisKey: `trace-v2-snapshot-${suffix}`,
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

  it('returns 404 for another user', async () => {
    await assert.rejects(
      () => detailsService.getForUser(opportunityId, otherUserId),
      (error: unknown) =>
        error instanceof AppError && error.statusCode === 404,
    )
  })

  it('does not expose details for an Opportunity without Evidence', async () => {
    await assert.rejects(
      () => detailsService.getForUser(noSourceOpportunityId, ownerId),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'RESEARCH_TRACE_NOT_FOUND',
    )
  })

  it('keeps ProductContext as background instead of an enterprise fact', async () => {
    const trace = await detailsService.getForUser(
      opportunityId,
      ownerId,
    )
    const contextStep = trace.steps.find(
      (step) => step.stage === 'PRODUCT_CONTEXT',
    )

    assert.equal(contextStep?.informationType, 'ASSESSMENT')
    assert.ok(
      contextStep?.supportingSources.every(
        (source) => source.role === 'CONTEXT',
      ),
    )
    assert.equal(
      contextStep?.supportedClaims.some(
        (claim) => claim.claimType === 'FACT',
      ),
      false,
    )
  })

  it('keeps Opportunity as an assessment and explicitly rejects procurement certainty', async () => {
    const trace = await detailsService.getForUser(
      opportunityId,
      ownerId,
    )
    const opportunityStep = trace.steps.find(
      (step) => step.stage === 'OPPORTUNITY_ASSESSMENT',
    )

    assert.equal(opportunityStep?.informationType, 'ASSESSMENT')
    assert.ok(
      opportunityStep?.supportedClaims.every(
        (claim) => claim.claimType === 'ASSESSMENT',
      ),
    )
    assert.match(
      JSON.stringify(opportunityStep),
      /不表示企业已发生采购/,
    )
  })

  it('does not write domain data while building details', async () => {
    const before = await domainCounts(ownerId)
    await detailsService.getForUser(opportunityId, ownerId)
    const afterRead = await domainCounts(ownerId)

    assert.deepEqual(afterRead, before)
  })

  it('leaves the Phase 1 response contract unchanged', async () => {
    const phaseOne = await phaseOneService.getForUser(
      opportunityId,
      ownerId,
    )

    assert.equal('traceVersion' in phaseOne, false)
    assert.equal(
      phaseOne.steps.some(
        (step) => 'supportingSources' in step,
      ),
      false,
    )
  })

  it('marks explicit structured source conflicts as NEEDS_REVIEW', async () => {
    const trace = await detailsService.getForUser(
      opportunityId,
      ownerId,
    )
    const identityStep = trace.steps.find(
      (step) => step.stage === 'COMPANY_IDENTITY',
    )

    assert.equal(identityStep?.status, 'NEEDS_REVIEW')
    assert.equal(identityStep?.verificationStatus, 'CONFLICTING')
    assert.ok(
      identityStep?.reasoningLinks.some(
        (link) => link.relationship === 'CONTRADICTS',
      ),
    )
    assert.ok(
      identityStep?.supportedClaims.some(
        (claim) => claim.verificationStatus === 'CONFLICTING',
      ),
    )
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
    summary:
      'The source may indicate a sales-relevant factory expansion.',
    whyItMatters:
      'Factory expansion may create future automation research opportunities.',
    recommendedNextStep:
      'Verify project scope and implementation stage before outreach.',
    confidence: 86,
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
    opportunities: await prisma.opportunity.count({
      where: { userId },
    }),
    evidence: await prisma.searchEvidence.count({
      where: { searchTask: { userId } },
    }),
    profiles: await prisma.companyProfile.count({
      where: { userId },
    }),
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
