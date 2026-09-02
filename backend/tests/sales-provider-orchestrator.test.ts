import assert from 'node:assert/strict'
import test from 'node:test'

import type { SalesProviderActionDescriptor } from '../src/contracts/sales-provider-action.contract.js'
import type {
  ExternalRecordLookup,
  SalesSystemProvider,
} from '../src/providers/sales-system/sales-system-provider.interface.js'
import { SalesProviderOrchestrator } from '../src/services/sales-provider-orchestrator.service.js'

function fakeProvider(
  id: string,
  actions: SalesProviderActionDescriptor[],
  calls: string[],
  options: { fail?: boolean } = {},
): SalesSystemProvider {
  return {
    id,
    listActions: () => actions,
    findRecords: async (_lookup: ExternalRecordLookup) => [],
    execute: async (request) => {
      calls.push(`${id}:${request.action}`)
      if (options.fail) throw new Error(`${id} failed`)
      return {
        provider: id,
        action: request.action,
        status: 'completed',
        externalId: `${id}_result`,
      }
    },
  }
}

test('orchestrator uses provider-declared risk so callers cannot downgrade a send', async () => {
  const calls: string[] = []
  const apollo = fakeProvider(
    'apollo',
    [{ action: 'sequence.enroll', risk: 'SEND' }],
    calls,
  )
  const orchestrator = new SalesProviderOrchestrator([apollo])

  await assert.rejects(
    () =>
      orchestrator.execute({
        action: 'sequence.enroll',
        provider: 'apollo',
        risk: 'READ',
        approved: false,
        payload: { contactId: 'c1' },
      }),
    /approval required/i,
  )
  assert.deepEqual(calls, [])
})

test('orchestrator executes an approved action through the selected provider', async () => {
  const calls: string[] = []
  const apollo = fakeProvider(
    'apollo',
    [{ action: 'sequence.enroll', risk: 'SEND' }],
    calls,
  )
  const zoho = fakeProvider(
    'zoho_crm',
    [{ action: 'lead.convert', risk: 'WRITE' }],
    calls,
  )
  const orchestrator = new SalesProviderOrchestrator([apollo, zoho])

  const result = await orchestrator.execute({
    action: 'lead.convert',
    provider: 'zoho_crm',
    risk: 'READ',
    approved: true,
    approvalId: 'approval_1',
    payload: { leadId: 'lead_1' },
  })

  assert.equal(result.provider, 'zoho_crm')
  assert.deepEqual(calls, ['zoho_crm:lead.convert'])
})

test('orchestrator never silently fails over after an external execution starts', async () => {
  const calls: string[] = []
  const first = fakeProvider(
    'apollo',
    [{ action: 'record.create', risk: 'WRITE' }],
    calls,
    { fail: true },
  )
  const second = fakeProvider(
    'zoho_crm',
    [{ action: 'record.create', risk: 'WRITE' }],
    calls,
  )
  const orchestrator = new SalesProviderOrchestrator([first, second])

  await assert.rejects(() =>
    orchestrator.execute({
      action: 'record.create',
      risk: 'WRITE',
      approved: true,
      payload: { name: 'Example' },
    }),
  )

  assert.deepEqual(calls, ['apollo:record.create'])
})

test('orchestrator plan exposes the chosen provider and authoritative descriptor', () => {
  const calls: string[] = []
  const apollo = fakeProvider(
    'apollo',
    [{ action: 'people.enrich', risk: 'CREDIT', consumesCredits: true }],
    calls,
  )
  const orchestrator = new SalesProviderOrchestrator([apollo])

  assert.deepEqual(orchestrator.plan('people.enrich'), {
    providerId: 'apollo',
    descriptor: {
      action: 'people.enrich',
      risk: 'CREDIT',
      consumesCredits: true,
    },
  })
})
