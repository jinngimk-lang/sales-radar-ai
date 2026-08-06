import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRevenueResearchTask,
  sanitizeProviderText,
  validateRevenueResearchUrl,
} from '../src/services/revenue-live-domain.service.js'

test('accepts a public HTTPS revenue opportunity URL', () => {
  const url = validateRevenueResearchUrl('https://example.com/bounty?id=123')
  assert.equal(url.hostname, 'example.com')
  assert.equal(url.protocol, 'https:')
})

test('rejects local, private, credentialed, and non-HTTP research URLs', () => {
  for (const url of [
    'http://localhost/admin',
    'http://internal/',
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'http://user:password@example.com/',
    'file:///etc/passwd',
    'javascript:alert(1)',
  ]) {
    assert.throws(() => validateRevenueResearchUrl(url), url)
  }
})

test('builds a server-owned read-only research task with hard boundaries', () => {
  const task = buildRevenueResearchTask({
    title: 'Example bounty',
    platform: 'Example',
    sourceUrl: 'https://example.com/bounty',
  })

  assert.match(task, /read-only/i)
  assert.match(task, /do not log in/i)
  assert.match(task, /do not create an account/i)
  assert.match(task, /do not submit/i)
  assert.match(task, /do not communicate/i)
  assert.match(task, /do not perform security testing/i)
  assert.match(task, /do not solve or bypass captchas/i)
  assert.match(task, /https:\/\/example\.com\/bounty/)
})

test('sanitizes provider text and removes query strings and fragments from URLs', () => {
  const sanitized = sanitizeProviderText(
    'Visited https://example.com/path?token=secret#private and found terms.',
  )
  assert.equal(sanitized, 'Visited https://example.com/path and found terms.')
})
