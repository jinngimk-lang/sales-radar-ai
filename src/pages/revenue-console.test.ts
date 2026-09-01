import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appSource = await readFile(new URL('../App.tsx', import.meta.url), 'utf8')
const layoutSource = await readFile(
  new URL('../components/layout/AppLayout.tsx', import.meta.url),
  'utf8',
)

test('revenue is removed from primary workspace navigation', () => {
  assert.doesNotMatch(layoutSource, /to: '\/app\/revenue', label: '收益'/)
  assert.doesNotMatch(layoutSource, /WalletCards/)
})

test('legacy revenue URL redirects to market radar instead of rendering revenue operations', () => {
  assert.doesNotMatch(appSource, /RevenueOperationsPage/)
  assert.match(
    appSource,
    /path="revenue"[\s\S]*?<Navigate to="\/app\/market" replace \/>/,
  )
})
