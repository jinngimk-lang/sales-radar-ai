import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

const [home, composer, marketPage, marketTarget, browserWorkspace, account, layout, app, ciWorkflow] = await Promise.all([
  read('./pages/AICommandCenterPage.tsx'),
  read('./features/command-center/CommandComposer.tsx'),
  read('./pages/MarketIntelligenceWorkspacePage.tsx'),
  read('./features/market-intelligence/MarketScanTarget.tsx'),
  read('./features/market-intelligence/MarketBrowserWorkspace.tsx'),
  read('./pages/AccountPage.tsx'),
  read('./components/layout/AppLayout.tsx'),
  read('./App.tsx'),
  read('../.github/workflows/ci.yml'),
])

test('AI home is input-first and removes marketing-style authenticated hero content', () => {
  assert.match(home, /准备好赚钱了吗/)
  assert.doesNotMatch(home, /今天要研究什么/)
  assert.doesNotMatch(home, /AGENT \+ DIRECT GLOBAL SEARCH/)
  assert.doesNotMatch(home, /同一个输入框，既能问 Agent/)
  assert.doesNotMatch(home, /<Capability/)
  assert.doesNotMatch(composer, /示例 \{index \+ 1\}/)
  assert.doesNotMatch(composer, /全网搜索可在没有 GPT API 时运行/)
})

test('market browser immediately shows source visuals without operator-token chrome', () => {
  assert.match(marketPage, /市场雷达/)
  assert.doesNotMatch(marketTarget, /设置市场侦察目标/)
  assert.match(browserWorkspace, /网页画面/)
  assert.match(browserWorkspace, /LiveWebPreview/)
  assert.doesNotMatch(browserWorkspace, /MarketLiveBrowserPanel|REVENUE_OPERATOR_TOKEN|Browserbase/)
})

test('market research loading copy stays user-facing and never exposes crawler implementation wording', () => {
  assert.doesNotMatch(browserWorkspace, /爬虫/)
  assert.match(browserWorkspace, /正在研究公开网页/)
  assert.match(browserWorkspace, /正在打开公开网页…/)
})

test('settings and navigation are concise and expose the active marketplace operating sequence', () => {
  assert.doesNotMatch(layout, /item\.desc/)
  assert.doesNotMatch(layout, /真实来源模式/)
  assert.match(layout, /to: '\/app\/home', label: 'AI 工作台'/)
  assert.match(layout, /to: '\/app\/targets', label: '目标'/)
  assert.match(layout, /to: '\/app\/market', label: '推荐'/)
  assert.match(layout, /to: '\/app\/discover', label: '搜索'/)
  assert.match(layout, /to: '\/app\/communication', label: '沟通'/)
  assert.match(layout, /to: '\/app\/intent', label: '意向'/)
  assert.doesNotMatch(layout, /to: '\/app\/revenue'|label: '收益'/)
  assert.match(layout, /to: '\/app\/account', label: '设置'/)
  assert.match(app, /path="revenue" element={<Navigate to="\/app\/market" replace \/>}/)
  assert.doesNotMatch(account, /Sales Radar 工作区/)
  assert.doesNotMatch(account, /数据可见性/)
  assert.match(account, /运行能力/)
})

test('market target carries a real commercial goal while assessment stays in the market workspace', () => {
  assert.match(marketTarget, /找买家/)
  assert.match(marketTarget, /找供应商/)
  assert.match(marketTarget, /找合作伙伴/)
  assert.match(marketTarget, /找渠道/)
  assert.match(marketTarget, /研究竞品/)
  assert.match(marketTarget, /探索市场/)
  assert.match(marketPage, /goal: target\.goal/)
  assert.match(marketPage, /主动搜索/)
})

test('frontend CI keeps deterministic build and browser checks hard while external search remains an observable probe', () => {
  const buildIndex = ciWorkflow.indexOf('- name: Build')
  const browserIndex = ciWorkflow.indexOf('- name: Virtual Chrome click smoke')
  const liveProbeIndex = ciWorkflow.indexOf('- name: External embedded crawler probe')

  assert.ok(buildIndex >= 0, 'frontend Build step must exist')
  assert.ok(browserIndex > buildIndex, 'browser smoke must run after Build')
  assert.ok(liveProbeIndex > browserIndex, 'external crawler probe must run after deterministic gates')

  const liveProbeBlock = ciWorkflow.slice(liveProbeIndex, liveProbeIndex + 220)
  assert.match(liveProbeBlock, /continue-on-error:\s*true/)
  assert.match(liveProbeBlock, /node scripts\/embedded-crawler-live-smoke\.mjs/)
})