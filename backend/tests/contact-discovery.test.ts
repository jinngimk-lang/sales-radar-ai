import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ContactDiscoveryService,
  type ContactDiscoveryRepository,
} from '../src/services/contact-discovery.service.js'

const baseLead = {
  company: 'Acme Manufacturing',
  jobTitle: null,
  platform: 'LinkedIn',
  sourceUrl: 'https://example.com/source',
  profileUrl: 'https://linkedin.com/company/acme',
  sourceMetadata: null,
}

describe('Contact Discovery Agent v1', () => {
  const service = new ContactDiscoveryService()

  it('keeps a verified named contact and explicit job title', () => {
    const contacts = service.extract({
      ...baseLead,
      sourceMetadata: {
        contacts: [
          {
            name: 'Alex Morgan',
            jobTitle: 'Purchasing Director',
            profileUrl: 'https://linkedin.com/in/alex-morgan',
          },
        ],
      },
    })

    assert.equal(contacts[0].name, 'Alex Morgan')
    assert.equal(contacts[0].jobTitle, 'Purchasing Director')
    assert.equal(contacts[0].contactRole, 'decision_maker')
    assert.ok(contacts[0].evidence.length > 0)
  })

  it('returns Unknown when no reliable contact source exists', () => {
    const contacts = service.extract(baseLead)
    assert.equal(contacts.length, 1)
    assert.equal(contacts[0].name, 'Unknown')
    assert.equal(contacts[0].email, 'Unknown')
    assert.equal(contacts[0].contactRole, 'unknown')
    assert.equal(contacts[0].confidence, 0)
  })

  it('matches a procurement role', () => {
    const [contact] = service.extract({
      ...baseLead,
      sourceMetadata: { name: 'Jamie Lee', jobTitle: 'Procurement Manager' },
    })
    assert.equal(contact.contactRole, 'influencer')
  })

  it('matches a technical role', () => {
    const [contact] = service.extract({
      ...baseLead,
      sourceMetadata: { name: 'Morgan Chen', jobTitle: 'Engineering Manager' },
    })
    assert.equal(contact.contactRole, 'technical_contact')
  })

  it('returns existing contacts without creating duplicates', async () => {
    let created = 0
    const existing = [{ id: 'contact-1', name: 'Alex Morgan' }]
    const repository: ContactDiscoveryRepository = {
      findContacts: async () => existing,
      findLead: async () => baseLead,
      createContacts: async () => {
        created += 1
        return existing
      },
    }
    const deduplicatingService = new ContactDiscoveryService(repository)

    const first = await deduplicatingService.discover('lead-1')
    const second = await deduplicatingService.discover('lead-1')

    assert.deepEqual(first, existing)
    assert.deepEqual(second, existing)
    assert.equal(created, 0)
  })
})
