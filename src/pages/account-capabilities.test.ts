import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const accountPageSource = await readFile(
  new URL('./AccountPage.tsx', import.meta.url),
  'utf8',
)

test('account page surfaces the server-reported GPT sales agent capability', () => {
  assert.match(accountPageSource, /capabilities\.salesAgent/)
  assert.match(accountPageSource, /GPT 销售执行器/)
})

test('account page explains public-data visibility and field-level verification', () => {
  assert.match(accountPageSource, /数据可见性/)
  assert.match(accountPageSource, /公开来源/)
  assert.match(accountPageSource, /观察时间/)
  assert.match(accountPageSource, /不会推断/)
  assert.match(accountPageSource, /\/app\/home/)
  assert.match(accountPageSource, /\/app\/market/)
  assert.doesNotMatch(accountPageSource, /\/app\/assistant|\/app\/dashboard/)
})
