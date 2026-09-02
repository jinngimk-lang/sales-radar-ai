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

test('account page distinguishes a missing full backend from missing provider credentials', () => {
  assert.match(accountPageSource, /full_backend_required/)
  assert.match(accountPageSource, /完整后端未连接/)
  assert.match(accountPageSource, /尚未配置服务端凭据/)
})

test('account page keeps public-data verification as one concise principle instead of duplicate cards', () => {
  assert.match(accountPageSource, /数据原则/)
  assert.match(accountPageSource, /公开来源/)
  assert.match(accountPageSource, /观察时间/)
  assert.match(accountPageSource, /不会推断/)
  assert.doesNotMatch(accountPageSource, /数据可见性/)
  assert.doesNotMatch(accountPageSource, /Sales Radar 工作区/)
})
