import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertSalesProviderActionAllowed,
  defaultApprovalForRisk,
  resolveActionApproval,
  type SalesProviderActionDescriptor,
} from '../src/contracts/sales-provider-action.contract.js'

test('provider action safety defaults are fail-closed', () => {
  assert.equal(defaultApprovalForRisk('READ'), 'automatic')
  assert.equal(defaultApprovalForRisk('DRAFT'), 'automatic')
  assert.equal(defaultApprovalForRisk('WRITE'), 'required')
  assert.equal(defaultApprovalForRisk('CREDIT'), 'required')
  assert.equal(defaultApprovalForRisk('SEND'), 'required')
  assert.equal(defaultApprovalForRisk('DESTRUCTIVE'), 'blocked')
})

test('approval-required and destructive actions cannot execute without the gate', () => {
  assert.throws(
    () =>
      assertSalesProviderActionAllowed({
        action: 'sequence.enroll',
        provider: 'apollo',
        risk: 'SEND',
        approved: false,
        payload: {},
      }),
    /approval required/i,
  )

  assert.doesNotThrow(() =>
    assertSalesProviderActionAllowed({
      action: 'sequence.enroll',
      provider: 'apollo',
      risk: 'SEND',
      approved: true,
      payload: {},
    }),
  )

  assert.throws(
    () =>
      assertSalesProviderActionAllowed({
        action: 'records.bulk-delete',
        provider: 'zoho_crm',
        risk: 'DESTRUCTIVE',
        approved: true,
        payload: {},
      }),
    /blocked/i,
  )
})

test('provider-specific policy may tighten defaults but cannot weaken them', () => {
  const stricterRead: SalesProviderActionDescriptor = {
    action: 'companies.search',
    risk: 'READ',
    approval: 'required',
  }
  assert.equal(resolveActionApproval(stricterRead), 'required')

  const unsafeSendOverride: SalesProviderActionDescriptor = {
    action: 'email.send',
    risk: 'SEND',
    approval: 'automatic',
  }
  assert.equal(resolveActionApproval(unsafeSendOverride), 'required')

  const unsafeDeleteOverride: SalesProviderActionDescriptor = {
    action: 'records.delete',
    risk: 'DESTRUCTIVE',
    approval: 'required',
  }
  assert.equal(resolveActionApproval(unsafeDeleteOverride), 'blocked')
})
