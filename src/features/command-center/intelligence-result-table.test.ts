import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(
  new URL('./IntelligenceResultGrid.tsx', import.meta.url),
  'utf8',
)

test('intelligence results start as a dense table instead of rendering one full card per result', () => {
  assert.match(source, /<table/)
  assert.match(source, /Structured Intelligence/)
  assert.match(source, /查看详情/)
  assert.match(source, /sortCommandSessions/)
  assert.doesNotMatch(source, /sessions\.map\([\s\S]*<EntityIntelligenceCard/)
})

test('table restores compact potential and score indicators from existing assistant scores', () => {
  assert.match(source, /潜在可能/)
  assert.match(source, /意向/)
  assert.match(source, /身份/)
  assert.match(source, /证据/)
  assert.match(source, /联系人/)
  assert.match(source, /getPotentialBand/)
  assert.match(source, /assistantScores/)
})

test('selecting one row narrows into a single removable detail inspector', () => {
  assert.match(source, /selectedSessionId/)
  assert.match(source, /aria-selected/)
  assert.match(source, /selectedSession/)
  assert.match(source, /关闭详情/)
  assert.match(source, /<EntityIntelligenceCard session={selectedSession}/)
  assert.match(source, /lg:grid-cols/)
})
