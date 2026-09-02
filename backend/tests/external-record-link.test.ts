import assert from 'node:assert/strict'
import test from 'node:test'

import { matchExternalRecord } from '../src/services/external-record-link.service.js'

const person = {
  kind: 'person' as const,
  provider: 'apollo',
  externalId: 'person_1',
  fullName: 'Ada Lovelace',
  email: 'ADA@Example.com',
  emailVerified: true,
  companyDomain: 'https://www.example.com/about',
  profileUrl: 'https://www.linkedin.com/in/ada-lovelace/?trk=public',
}

test('external record linking prefers exact provider ids and normalized verified emails', () => {
  assert.deepEqual(
    matchExternalRecord(person, {
      kind: 'person',
      provider: 'apollo',
      externalId: 'person_1',
    }),
    { matched: true, confidence: 'exact', reason: 'provider_external_id' },
  )

  assert.deepEqual(
    matchExternalRecord(person, {
      kind: 'person',
      email: 'ada@example.com',
    }),
    { matched: true, confidence: 'exact', reason: 'verified_email' },
  )

  assert.equal(
    matchExternalRecord(
      { ...person, emailVerified: false },
      { kind: 'person', email: 'ada@example.com' },
    ).matched,
    false,
  )
})

test('profile URLs are normalized before exact matching', () => {
  const result = matchExternalRecord(person, {
    kind: 'person',
    profileUrl: 'https://linkedin.com/in/ada-lovelace',
  })
  assert.equal(result.matched, true)
  assert.equal(result.confidence, 'exact')
  assert.equal(result.reason, 'profile_url')
})

test('domain-only matching is strong for organizations but never enough to merge people', () => {
  assert.equal(
    matchExternalRecord(person, {
      kind: 'person',
      companyDomain: 'example.com',
    }).matched,
    false,
  )

  const namedPerson = matchExternalRecord(person, {
    kind: 'person',
    fullName: '  ADA   LOVELACE ',
    companyDomain: 'example.com',
  })
  assert.deepEqual(namedPerson, {
    matched: true,
    confidence: 'strong',
    reason: 'person_name_and_company_domain',
  })

  const organization = {
    kind: 'organization' as const,
    provider: 'zoho_crm',
    externalId: 'account_1',
    companyName: 'Example GmbH',
    companyDomain: 'www.example.com',
  }
  assert.deepEqual(
    matchExternalRecord(organization, {
      kind: 'organization',
      companyDomain: 'https://example.com/',
    }),
    { matched: true, confidence: 'strong', reason: 'company_domain' },
  )
})

test('different record kinds never match through shared weak keys', () => {
  assert.equal(
    matchExternalRecord(person, {
      kind: 'organization',
      companyDomain: 'example.com',
    }).matched,
    false,
  )
})
