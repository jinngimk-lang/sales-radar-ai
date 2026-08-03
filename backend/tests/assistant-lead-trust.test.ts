import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CustomerType,
  Industry,
  LeadEvidenceStatus,
  LeadIdentityStatus,
  LeadQualificationStatus,
  Platform,
  Region,
  SearchTaskStatus,
} from '@prisma/client'
import type { Request, Response } from 'express'
import { createListAssistantLeadsController } from '../src/controllers/assistant.controller.js'
import {
  AssistantLeadService,
  deriveCommunicationProfile,
  type AssistantLeadCandidate,
  type AssistantLeadRepository,
} from '../src/services/assistant-lead.service.js'
import {
  CURRENT_QUALIFICATION_VERSION,
  LEGACY_QUALIFICATION_VERSION,
} from '../src/contracts/qualification-version.contract.js'

function candidate(
  overrides: Partial<AssistantLeadCandidate> = {},
): AssistantLeadCandidate {
  return {
    id: 'lead-qualified',
    userId: 'user-1',
    searchTaskId: 'task-1',
    provider: 'agent-reach',
    externalId: 'exa-company-1',
    sourceMetadata: {},
    username: 'example-company',
    displayName: 'Example Automation',
    avatarUrl: null,
    initials: 'EA',
    platform: Platform.LinkedIn,
    customerType: CustomerType.Company,
    postContent:
      'Example Automation publishes evidence about its manufacturing operations and automation requirements.',
    postedAt: null,
    country: 'Germany',
    region: Region.Europe,
    industry: Industry.IndustrialManufacturing,
    jobTitle: null,
    company: 'Example Automation',
    normalizedDomain: 'example-automation.de',
    identityStatus: LeadIdentityStatus.VERIFIED,
    evidenceStatus: LeadEvidenceStatus.VALID,
    productRelevancePassed: true,
    qualificationStatus: LeadQualificationStatus.QUALIFIED,
    qualificationVersion: CURRENT_QUALIFICATION_VERSION,
    sourceUrl: 'https://source.example.org/company-evidence',
    profileUrl: 'https://example-automation.de',
    interestTags: [],
    intentScore: 82,
    contactStatus: 'new',
    recommendedAction: 'contact_now',
    isFavorited: false,
    customTags: [],
    note: null,
    lastContactedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    analyses: [],
    contacts: [],
    searchTaskLinks: [
      {
        id: 'link-1',
        searchTaskId: 'task-1',
        leadId: 'lead-qualified',
        rankScore: 82,
        matchReason: 'Matched product context',
        matchEvidence: {
          sourceUrl: 'https://source.example.org/company-evidence',
        },
        createdAt: new Date(),
        searchTask: {
          userId: 'user-1',
          status: SearchTaskStatus.COMPLETED,
        },
      },
    ],
    ...overrides,
  } as AssistantLeadCandidate
}

function harness(records: AssistantLeadCandidate[], userId = 'user-1') {
  let queriedUserId = ''
  const repository: AssistantLeadRepository = {
    async listCandidates(requestedUserId) {
      queriedUserId = requestedUserId
      return records
    },
  }
  const service = new AssistantLeadService(repository, async () => ({
    id: userId,
  }))
  return { service, queriedUserId: () => queriedUserId }
}

describe('Assistant production trust boundary', () => {
  it('exposes a communication profile based only on public source content', () => {
    const profile = deriveCommunicationProfile({
      postContent:
        'Looking for an ERP API integration that can reduce manufacturing downtime.',
      platform: 'LinkedIn',
      interestTags: ['ERP', 'API', 'manufacturing'],
    })

    assert.equal(profile.language, 'en')
    assert.equal(profile.tone, 'technical')
    assert.equal(profile.basis, 'Observed public source content')
    assert.deepEqual(profile.observedTopics, ['ERP', 'API', 'manufacturing'])
  })

  it('returns a fully qualified, user-owned Lead', async () => {
    const test = harness([candidate()])
    const result = await test.service.listQualifiedLeads()

    assert.equal(test.queriedUserId(), 'user-1')
    assert.equal(result.length, 1)
    assert.equal(result[0]?.id, 'lead-qualified')
  })

  it('excludes a Lead qualified by a historical rules version', async () => {
    const test = harness([
      candidate({ qualificationVersion: LEGACY_QUALIFICATION_VERSION }),
    ])
    assert.deepEqual(await test.service.listQualifiedLeads(), [])
  })

  it('accepts a Lead qualified by the current rules version', async () => {
    const test = harness([
      candidate({ qualificationVersion: CURRENT_QUALIFICATION_VERSION }),
    ])
    const result = await test.service.listQualifiedLeads()
    assert.equal(result.length, 1)
  })

  it('does not return mock Leads', async () => {
    const test = harness([candidate({ provider: 'mock' })])
    assert.deepEqual(await test.service.listQualifiedLeads(), [])
  })

  it('does not return unverified Leads', async () => {
    const test = harness([
      candidate({ identityStatus: LeadIdentityStatus.UNVERIFIED }),
    ])
    assert.deepEqual(await test.service.listQualifiedLeads(), [])
  })

  it('isolates Leads owned by another user', async () => {
    const test = harness([candidate({ userId: 'user-2' })])
    assert.deepEqual(await test.service.listQualifiedLeads(), [])
  })

  it('excludes Leads linked only to a failed SearchTask', async () => {
    const record = candidate()
    record.searchTaskLinks[0]!.searchTask.status = SearchTaskStatus.FAILED
    const test = harness([record])
    assert.deepEqual(await test.service.listQualifiedLeads(), [])
  })

  it('returns an honest empty collection when no Lead qualifies', async () => {
    const test = harness([])
    assert.deepEqual(await test.service.listQualifiedLeads(), [])
  })

  it('returns the dedicated API envelope', async () => {
    const responseBody: unknown[] = []
    const response = {
      json(body: unknown) {
        responseBody.push(body)
        return this
      },
    } as unknown as Response
    const controller = createListAssistantLeadsController({
      async listQualifiedLeads() {
        return [{ id: 'lead-qualified' }]
      },
    })

    await controller({} as Request, response, () => undefined)
    assert.deepEqual(responseBody[0], {
      data: [{ id: 'lead-qualified' }],
      meta: { total: 1 },
    })
  })
})
