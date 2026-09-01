import assert from 'node:assert/strict'
import test from 'node:test'

import { verifyCommunicationReceipt } from '../src/services/communication-receipt.service.js'

test('verified sent/replied/meeting states require attributable external receipt evidence', () => {
  for (const state of [
    'SENT_VERIFIED',
    'REPLIED_VERIFIED',
    'MEETING_VERIFIED',
  ] as const) {
    assert.throws(
      () =>
        verifyCommunicationReceipt({
          provider: 'apollo',
          state,
          observedAt: '2026-09-01T10:00:00.000Z',
        }),
      /external receipt/i,
    )
  }
})

test('verified states preserve provider attribution and observed time', () => {
  const receipt = verifyCommunicationReceipt({
    provider: 'apollo',
    state: 'SENT_VERIFIED',
    externalReceiptId: 'msg_123',
    externalThreadId: 'thread_456',
    observedAt: '2026-09-01T10:00:00.000Z',
    metadata: { sequenceId: 'seq_1' },
  })

  assert.deepEqual(receipt, {
    provider: 'apollo',
    state: 'SENT_VERIFIED',
    externalReceiptId: 'msg_123',
    externalThreadId: 'thread_456',
    observedAt: '2026-09-01T10:00:00.000Z',
    metadata: { sequenceId: 'seq_1' },
  })
})

test('queued or accepted provider actions cannot be promoted to a verified sent state without a receipt', () => {
  assert.throws(() =>
    verifyCommunicationReceipt({
      provider: 'zoho_crm',
      state: 'SENT_VERIFIED',
      providerStatus: 'accepted',
      observedAt: '2026-09-01T10:00:00.000Z',
    }),
  )
})

test('pre-send states remain distinct and do not manufacture provider receipts', () => {
  const draft = verifyCommunicationReceipt({
    provider: 'zoho_crm',
    state: 'DRAFT',
    observedAt: '2026-09-01T10:00:00.000Z',
  })
  assert.equal(draft.state, 'DRAFT')
  assert.equal(draft.externalReceiptId, undefined)
})

test('receipt verification rejects invalid timestamps and blank providers', () => {
  assert.throws(() =>
    verifyCommunicationReceipt({
      provider: ' ',
      state: 'DRAFT',
      observedAt: '2026-09-01T10:00:00.000Z',
    }),
  )
  assert.throws(() =>
    verifyCommunicationReceipt({
      provider: 'apollo',
      state: 'DRAFT',
      observedAt: 'not-a-date',
    }),
  )
})
