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
