import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { Platform, Region } from '@prisma/client'
import { prisma } from '../src/prisma/client.js'
import { radarAssessment } from '../src/services/radar-assessment.service.js'
import { RadarAssessmentPersistenceService } from '../src/services/radar-assessment-persistence.service.js'
import { AppError } from '../src/utils/app-error.js'

const suffix = randomUUID()
const service = new RadarAssessmentPersistenceService()
let ownerId = ''
let otherUserId = ''
let buyerTaskId = ''
let endCustomerEvidenceId = ''
let supplierEvidenceId = ''
let unknownEvidenceId = ''
let blockedEvidenceId = ''
let failingEvidenceId = ''

describe('Radar Intelligence Layer Phase 2C persistence', () => {
  before(async () => {
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `radar-assessment-owner-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
      prisma.user.create({
        data: {
          email: `radar-assessment-other-${suffix}@salesradar.local`,
          passwordHash: 'test-only',
        },
      }),
    ])
    ownerId = owner.id
    otherUserId = otherUser.id

    const task = await prisma.searchTask.create({
      data: {
        userId: ownerId,
        keyword: `packaging automation buyers ${suffix}`,
        provider: 'agent-reach',
        status: 'COMPLETED',
        platforms: [Platform.Website],
        regions: [Region.Europe],
        parameters: taskParameters('FIND_BUYERS'),
      },
    })
    buyerTaskId = task.id

    const [endCustomer, supplier, unknown, blocked, failing] =
      await Promise.all([
        createEvidence({
          taskId: task.id,
          externalId: `end-customer-${suffix}`,
          companyName: 'Acme Foods',
          role: 'end_customer',
          title: 'Acme Foods expands its European factory',
          content:
            'Acme Foods is a food manufacturer. The company announced a factory expansion in Europe and an automation upgrade for a new packaging production line. The official announcement includes the construction timeline and increased production capacity.',
        }),
        createEvidence({
          taskId: task.id,
          externalId: `supplier-${suffix}`,
          companyName: 'Acme Packaging Systems',
          role: 'supplier',
          title: 'Acme Packaging Systems expands its manufacturing site',
          content:
            'Acme Packaging Systems is a manufacturer and supplier of packaging machinery. The company expands its manufacturing site and opens a new production line for packaging automation equipment.',
        }),
        createEvidence({
          taskId: task.id,
          externalId: `unknown-${suffix}`,
          companyName: null,
          role: 'end_customer',
          title: 'European food factory expansion announcement',
          content:
            'A food manufacturing business announced that it expands a factory in Europe and adds a packaging production line. The source does not provide a verified company identity and requires further review.',
        }),
        createEvidence({
          taskId: task.id,
          externalId: `blocked-${suffix}`,
          companyName: null,
          role: 'unknown',
          title: 'Unverified result',
          content: 'Insufficient body.',
          provider: 'mock',
        }),
        createEvidence({
          taskId: task.id,
          externalId: `failing-${suffix}`,
          companyName: 'Failure Test Manufacturing',
          role: 'end_customer',
          title: 'Failure Test Manufacturing expands its factory',
          content:
            'Failure Test Manufacturing announced that it expands a factory and adds a packaging production line. The official release includes timing and manufacturing capacity details.',
        }),
      ])

    endCustomerEvidenceId = endCustomer.id
    supplierEvidenceId = supplier.id
    unknownEvidenceId = unknown.id
    blockedEvidenceId = blocked.id
    failingEvidenceId = failing.id
  })

  after(async () => {
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerId, otherUserId] } } })
      .catch(() => undefined)
  })

  it('saves an immutable interpretation without creating Opportunity or CRM data', async () => {
    const before = await salesEntityCounts()
    const first = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: endCustomerEvidenceId,
    })
    const second = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: endCustomerEvidenceId,
    })

    assert.equal(first.id, second.id)
    assert.equal(first.decision, 'OPPORTUNITY_CREATED')
    assert.equal(first.entityRole, 'END_CUSTOMER')
    assert.equal(first.customerGoal, 'FIND_BUYERS')
    assert.equal(first.searchTaskId, buyerTaskId)
    const [workspaceItem] = await service.listForSearchTask({
      userId: ownerId,
      searchTaskId: buyerTaskId,
    })
    assert.equal(workspaceItem?.evidence.id, endCustomerEvidenceId)
    assert.equal(
      workspaceItem?.evidence.rawUrl,
      `https://example.com/radar/end-customer-${suffix}`,
    )
    assert.equal(workspaceItem?.evidence.companyName, 'Acme Foods')
    assert.deepEqual(await salesEntityCounts(), before)
  })

  it('persists Potential without creating an Opportunity', async () => {
    const opportunityCountBefore = await prisma.opportunity.count({
      where: { userId: ownerId },
    })
    const assessment = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: unknownEvidenceId,
    })

    assert.equal(assessment.decision, 'POTENTIAL_OPPORTUNITY')
    assert.equal(assessment.recommendedAction, 'VERIFY_ENTITY')
    assert.equal(
      await prisma.opportunity.count({ where: { userId: ownerId } }),
      opportunityCountBefore,
    )
  })

  it('keeps Supplier role and evaluates it against each search goal', async () => {
    const buyerAssessment = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: supplierEvidenceId,
    })
    assert.equal(buyerAssessment.entityRole, 'SUPPLIER')
    assert.equal(buyerAssessment.customerGoal, 'FIND_BUYERS')
    assert.equal(buyerAssessment.decision, 'MARKET_SIGNAL_ONLY')

    await prisma.searchTask.update({
      where: { id: buyerTaskId },
      data: {
        parameters: taskParameters('FIND_SUPPLIERS'),
      },
    })
    const supplierAssessment = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: supplierEvidenceId,
    })
    const history = await prisma.radarAssessment.findMany({
      where: { searchEvidenceId: supplierEvidenceId },
      orderBy: { createdAt: 'asc' },
    })

    assert.equal(supplierAssessment.entityRole, 'SUPPLIER')
    assert.equal(supplierAssessment.customerGoal, 'FIND_SUPPLIERS')
    assert.equal(supplierAssessment.decision, 'OPPORTUNITY_CREATED')
    assert.equal(history.length, 2)
    assert.notEqual(history[0]?.contextHash, history[1]?.contextHash)
    assert.equal(history[0]?.customerGoal, 'FIND_BUYERS')
  })

  it('isolates users and preserves the Evidence-to-SearchTask ownership boundary', async () => {
    await assert.rejects(
      () =>
        service.createForEvidence({
          userId: otherUserId,
          searchEvidenceId: endCustomerEvidenceId,
        }),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 404 &&
        error.code === 'RADAR_EVIDENCE_NOT_FOUND',
    )

    const stored = await prisma.radarAssessment.findFirstOrThrow({
      where: {
        userId: ownerId,
        searchEvidenceId: endCustomerEvidenceId,
      },
      include: {
        searchEvidence: {
          select: { searchTaskId: true },
        },
      },
    })
    assert.equal(stored.searchTaskId, stored.searchEvidence.searchTaskId)
    assert.equal(stored.userId, ownerId)

    await assert.rejects(() =>
      prisma.radarAssessment.create({
        data: {
          userId: otherUserId,
          searchTaskId: buyerTaskId,
          searchEvidenceId: endCustomerEvidenceId,
          assessmentVersion: 'cross-user-test',
          detectionVersion: 'v2',
          contextHash: `cross-user-${suffix}`,
          userIntentSnapshot: taskParameters('FIND_BUYERS'),
          entityRole: 'END_CUSTOMER',
          customerGoal: 'FIND_BUYERS',
          decision: 'POTENTIAL_OPPORTUNITY',
          recommendedAction: 'VERIFY_ROLE',
          confidenceScore: 70,
          matchScore: 70,
          riskLevel: 'MEDIUM',
          reasonCodes: [],
          scoreBreakdown: {},
        },
      }),
    )
  })

  it('does not overwrite an existing Assessment snapshot', async () => {
    const assessment = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: endCustomerEvidenceId,
    })

    await assert.rejects(() =>
      prisma.radarAssessment.update({
        where: { id: assessment.id },
        data: { matchScore: 0 },
      }),
    )

    const stored = await prisma.radarAssessment.findUniqueOrThrow({
      where: { id: assessment.id },
    })
    assert.equal(stored.matchScore, assessment.matchScore)
  })

  it('stores Blocked for audit but excludes it from the default Radar result list', async () => {
    const blocked = await service.createForEvidence({
      userId: ownerId,
      searchEvidenceId: blockedEvidenceId,
    })
    const visible = await service.listForSearchTask({
      userId: ownerId,
      searchTaskId: buyerTaskId,
    })
    const audit = await service.listForSearchTask({
      userId: ownerId,
      searchTaskId: buyerTaskId,
      includeBlocked: true,
    })

    assert.equal(blocked.decision, 'BLOCKED')
    assert.equal(
      visible.some((assessment) => assessment.id === blocked.id),
      false,
    )
    assert.equal(
      audit.some((assessment) => assessment.id === blocked.id),
      true,
    )
  })

  it('does not pollute Opportunity when Assessment persistence fails', async () => {
    const opportunityCountBefore = await prisma.opportunity.count({
      where: { userId: ownerId },
    })
    const failingService = new RadarAssessmentPersistenceService(
      prisma,
      {
        assess(input) {
          return {
            ...radarAssessment.assess(input),
            confidenceScore: 101,
          }
        },
      },
    )

    await assert.rejects(() =>
      failingService.createForEvidence({
        userId: ownerId,
        searchEvidenceId: failingEvidenceId,
      }),
    )

    assert.equal(
      await prisma.radarAssessment.count({
        where: { searchEvidenceId: failingEvidenceId },
      }),
      0,
    )
    assert.equal(
      await prisma.opportunity.count({ where: { userId: ownerId } }),
      opportunityCountBefore,
    )
  })
})

function taskParameters(customerGoal: string) {
  return {
    userIntentSnapshot: {
      version: 'test-v1',
      capturedAt: '2026-07-30T08:00:00.000Z',
      customerGoal,
    },
    productContext: {
      product: 'Packaging Automation',
      industry: 'Food Manufacturing',
      customerType:
        customerGoal === 'FIND_SUPPLIERS'
          ? 'Suppliers'
          : 'Buyer companies',
      region: 'Europe',
      buyingSignals: ['factory expansion', 'new production line'],
    },
  }
}

function createEvidence(input: {
  taskId: string
  externalId: string
  companyName: string | null
  role: string
  title: string
  content: string
  provider?: string
}) {
  return prisma.searchEvidence.create({
    data: {
      searchTaskId: input.taskId,
      provider: input.provider ?? 'agent-reach',
      externalId: input.externalId,
      platform: Platform.Website,
      rawUrl: `https://example.com/radar/${input.externalId}`,
      title: input.title,
      content: input.content,
      rawMetadata: {
        entityRole: input.role,
        publishedAt: '2026-07-30',
        region: 'Europe',
      },
      companyName: input.companyName,
      identityConfidence: input.companyName ? 92 : 0,
      identityStatus: input.companyName ? 'VERIFIED' : 'UNVERIFIED',
      evidenceStatus:
        input.provider === 'mock' ? 'UNKNOWN' : 'VALID',
    },
  })
}

async function salesEntityCounts() {
  return {
    opportunities: await prisma.opportunity.count({
      where: { userId: ownerId },
    }),
    leads: await prisma.lead.count({ where: { userId: ownerId } }),
    contacts: await prisma.contactProfile.count({
      where: { lead: { userId: ownerId } },
    }),
  }
}
