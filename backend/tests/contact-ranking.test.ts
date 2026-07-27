import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ContactRankingService,
  type ContactRankingRepository,
  type RankableContact,
} from '../src/services/contact-ranking.service.js'

function contact(
  id: string,
  jobTitle: string,
  overrides: Partial<RankableContact> = {},
): RankableContact {
  return {
    id,
    name: `Contact ${id}`,
    jobTitle,
    contactRole: 'unknown',
    confidence: 80,
    source: 'LinkedIn: https://linkedin.com/in/contact',
    profileUrl: `https://linkedin.com/in/${id}`,
    evidence: [`Source job title: ${jobTitle}`],
    ...overrides,
  }
}

function lead(
  contacts: RankableContact[],
  context = 'We are looking for a supplier and need a quotation.',
) {
  return {
    id: 'lead-1',
    postContent: context,
    sourceMetadata: null,
    research: {
      companyType: 'Company',
      buyingSignals: ['Looking for supplier'],
      buyingSignalDetails: [],
      salesAngle: null,
    },
    contacts,
  }
}

describe('Contact Ranking Agent v1', () => {
  const service = new ContactRankingService()

  it('ranks a procurement manager above an ordinary employee', () => {
    const ranked = service.calculate(
      lead([
        contact('employee', 'Sales Coordinator'),
        contact('procurement', 'Procurement Manager'),
      ]),
    )
    assert.equal(ranked[0].id, 'procurement')
    assert.equal(ranked[0].priorityRank, 1)
  })

  it('ranks a technical leader above an ordinary contact for technical needs', () => {
    const ranked = service.calculate(
      lead(
        [
          contact('employee', 'Account Coordinator'),
          contact('engineering', 'Engineering Manager'),
        ],
        'We need an automation integration and equipment compatibility review.',
      ),
    )
    assert.equal(ranked[0].id, 'engineering')
  })

  it('raises the CEO for an explicitly small company', () => {
    const input = {
      ...lead(
        [contact('manager', 'Operations Manager'), contact('ceo', 'CEO')],
        'We are exploring a strategic partnership.',
      ),
      sourceMetadata: { companySize: 'Small business' },
    }
    const ranked = service.calculate(input)
    assert.equal(ranked[0].id, 'ceo')
    assert.match(ranked[0].recommendationReason, /small-company/i)
  })

  it('returns an empty result when no contacts exist', () => {
    assert.deepEqual(service.calculate(lead([])), [])
  })

  it('updates the same contacts on repeated ranking without creating data', async () => {
    const stored = lead([
      contact('employee', 'Assistant'),
      contact('buyer', 'Buyer'),
    ])
    let updateCalls = 0
    let lastIds: string[] = []
    const repository: ContactRankingRepository = {
      findLead: async () => stored,
      listRanked: async () => [],
      updateRankings: async (rankings) => {
        updateCalls += 1
        lastIds = rankings.map((ranking) => ranking.id)
        return rankings
      },
    }
    const rankingService = new ContactRankingService(repository)

    await rankingService.rank('lead-1')
    await rankingService.rank('lead-1')

    assert.equal(updateCalls, 2)
    assert.deepEqual(lastIds.sort(), ['buyer', 'employee'])
    assert.equal(stored.contacts.length, 2)
  })
})
