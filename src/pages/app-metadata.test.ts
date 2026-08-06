import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8')

test('document metadata names the AI intelligence command center', () => {
  assert.match(html, /<title>Sales Radar AI · AI 情报指挥中心<\/title>/)
  assert.match(html, /name="description"/)
  assert.match(html, /GPT 式任务入口/)
  assert.match(html, /公开联系人与来源证据/)
  assert.doesNotMatch(html, /销售机会发现平台/)
})
