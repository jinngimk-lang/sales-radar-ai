import assert from 'node:assert/strict'
import test from 'node:test'

import { getSalesProviderActionCatalog } from '../src/providers/sales-system/sales-system-provider-catalog.js'

function riskFor(provider: string, action: string) {
  return getSalesProviderActionCatalog(provider).find(
    (descriptor) => descriptor.action === action,
  )?.risk
}

test('Apollo capability catalog encodes search-before-enrich and outbound approval boundaries', () => {
  assert.equal(riskFor('apollo', 'people.search'), 'READ')
  assert.equal(riskFor('apollo', 'people.enrich'), 'CREDIT')
  assert.equal(riskFor('apollo', 'contact.create'), 'WRITE')
  assert.equal(riskFor('apollo', 'email-account.list'), 'READ')
  assert.equal(riskFor('apollo', 'sequence.enroll'), 'SEND')
  assert.equal(riskFor('apollo', 'record.delete'), 'DESTRUCTIVE')
})

test('Zoho CRM capability catalog separates reads, drafts, CRM writes and workflow execution', () => {
  assert.equal(riskFor('zoho_crm', 'record.search'), 'READ')
  assert.equal(riskFor('zoho_crm', 'email.draft'), 'DRAFT')
  assert.equal(riskFor('zoho_crm', 'lead.convert'), 'WRITE')
  assert.equal(riskFor('zoho_crm', 'workflow.activate'), 'SEND')
  assert.equal(riskFor('zoho_crm', 'cadence.activate'), 'SEND')
  assert.equal(riskFor('zoho_crm', 'email.send'), 'SEND')
  assert.equal(riskFor('zoho_crm', 'record.delete'), 'DESTRUCTIVE')
})

test('catalogs are immutable snapshots and unknown providers expose no guessed capabilities', () => {
  const first = getSalesProviderActionCatalog('apollo')
  const second = getSalesProviderActionCatalog('apollo')
  assert.notEqual(first, second)
  assert.deepEqual(first, second)
  assert.deepEqual(getSalesProviderActionCatalog('unknown'), [])
})
