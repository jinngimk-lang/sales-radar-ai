import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('ledger entries verify that an opportunity belongs to the active workspace', async () => {
  const persistenceSource = await readFile(
    new URL('../src/services/revenue-persistence.service.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    persistenceSource,
    /WHERE\s+"id"\s*=\s*\$\{input\.opportunityId\}\s+AND\s+"userId"\s*=\s*\$\{input\.userId\}/s,
  )
  assert.match(persistenceSource, /REVENUE_OPPORTUNITY_NOT_FOUND/)
})
