import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyRevenueOperatorToken } from '../src/middleware/revenue-operator-auth.js'

test('requires both configured and candidate operator tokens', () => {
  assert.equal(verifyRevenueOperatorToken(undefined, 'secret'), false)
  assert.equal(verifyRevenueOperatorToken('secret', undefined), false)
  assert.equal(verifyRevenueOperatorToken('', 'secret'), false)
  assert.equal(verifyRevenueOperatorToken('secret', ''), false)
})

test('accepts only the exact configured operator token', () => {
  assert.equal(verifyRevenueOperatorToken('secret', 'secret'), true)
  assert.equal(verifyRevenueOperatorToken('Secret', 'secret'), false)
  assert.equal(verifyRevenueOperatorToken('secret ', 'secret'), false)
  assert.equal(verifyRevenueOperatorToken('different', 'secret'), false)
})
