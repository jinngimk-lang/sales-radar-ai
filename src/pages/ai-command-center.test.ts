import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readSource(path: string) {
  return readFile(new URL(path, import.meta.url), 'utf8')
}

test('workspace defaults to the GPT-style AI home and preserves drill-down routes', async () => {
  const app = await readSource('../App.tsx')

  assert.match(app, /AICommandCenterPage/)
  assert.match(app, /path="home"/)
  assert.match(app, /Navigate to="\/app\/home"/)
  assert.match(app, /path="market"/)
  assert.match(app, /path="discover"/)
  assert.match(app, /path="customer\/:id"/)
})

test('primary navigation contains only the four product workspaces', async () => {
  const layout = await readSource('../components/layout/AppLayout.tsx')

  for (const label of ['AI 首页', '市场雷达', '收益中心', '设置']) {
    assert.match(layout, new RegExp(label))
  }
  assert.doesNotMatch(layout, /销售机会中心|AI 销售助手/)
})

test('AI home renders one command composer, tool trace, and source-backed entity results', async () => {
  const page = await readSource('./AICommandCenterPage.tsx')
  const resultCard = await readSource(
    '../features/command-center/EntityIntelligenceCard.tsx',
  )
  const sourceEvidence = await readSource(
    '../features/command-center/SourceEvidenceList.tsx',
  )

  assert.match(page, /runSalesAgent/)
  assert.match(page, /CommandComposer/)
  assert.match(page, /AgentConversation/)
  assert.match(page, /IntelligenceResultGrid/)
  assert.match(resultCard, /公开联系方式/)
  assert.match(resultCard, /来源证据/)
  assert.match(sourceEvidence, /observedAt/)
  assert.match(sourceEvidence, /verificationStatus/)
  assert.doesNotMatch(
    `${resultCard}\n${sourceEvidence}`,
    /猜测邮箱|全部私人信息|自动发送/,
  )
})

test('direct global search requests deeper results, public-contact enrichment, and uses the current task results directly', async () => {
  const page = await readSource('./AICommandCenterPage.tsx')
  const api = await readSource('../services/api.ts')

  assert.match(page, /DIRECT_SEARCH_TARGET_RESULTS = 30/)
  assert.match(page, /includePublicContacts: true/)
  assert.match(page, /customersToCommandSessions/)
  assert.match(api, /maxResults/)
  assert.match(api, /includePublicContacts/)
  assert.match(api, /contacts: lead\.contacts \?\? \[\]/)
})

test('market page removes the decorative four-step workflow', async () => {
  const market = await readSource('./MarketIntelligenceWorkspacePage.tsx')

  assert.match(market, /市场雷达/)
  assert.doesNotMatch(market, /const WORKFLOW/)
  assert.doesNotMatch(market, /设置目标.*联网研究.*信号识别.*销售判断/s)
})
