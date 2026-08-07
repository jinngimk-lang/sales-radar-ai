import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('advanced result drill-down stays in the focused inspector and has a deterministic return path', async () => {
  const card = await readSource('./EntityIntelligenceCard.tsx')

  assert.doesNotMatch(card, /\/app\/discover\?leadId=/)
  assert.match(card, /deepAnalysisOpen/)
  assert.match(card, /深度分析/)
  assert.match(card, /收起深度分析|关闭深度分析/)
  assert.match(card, /\/app\/customer\/\$\{session\.id\}/)
  assert.match(card, /onAskAgent/)
})

test('result focus loop supports select, close, and select again without route navigation', async () => {
  const grid = await readSource('./IntelligenceResultGrid.tsx')

  assert.match(grid, /setSelectedSessionId\(session\.id\)/)
  assert.match(grid, /setSelectedSessionId\(null\)/)
  assert.match(grid, /aria-selected/)
  assert.doesNotMatch(grid, /navigate\(|window\.location/)
})

test('Agent conversation is an invoked tool rather than persistent workspace chrome', async () => {
  const page = await readSource('../../pages/AICommandCenterPage.tsx')

  assert.match(page, /agentVisible/)
  assert.match(page, /setAgentVisible\(true\)/)
  assert.match(page, /setAgentVisible\(false\)/)
  assert.match(
    page,
    /\{agentVisible \? \([\s\S]*?<AgentConversation messages=\{messages\} running=\{running\} \/>/,
  )
  assert.match(page, /收起 Agent/)
})

test('direct global search can populate results without forcing the Agent panel open', async () => {
  const page = await readSource('../../pages/AICommandCenterPage.tsx')
  const start = page.indexOf('const runDirectSearch')
  const end = page.indexOf('const hasWorkspaceActivity')
  assert.ok(start >= 0 && end > start)
  const directSearch = page.slice(start, end)

  assert.match(directSearch, /setAgentVisible\(false\)/)
  assert.match(directSearch, /setResults\(selected\)/)
})
