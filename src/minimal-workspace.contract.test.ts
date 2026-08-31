import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

const [app, home, composer, marketPage, marketTarget, livePanel, discoverBridge, account, layout] = await Promise.all([
  read('./App.tsx'),
  read('./pages/AICommandCenterPage.tsx'),
  read('./features/command-center/CommandComposer.tsx'),
  read('./pages/MarketIntelligenceWorkspacePage.tsx'),
  read('./features/market-intelligence/MarketScanTarget.tsx'),
  read('./features/market-intelligence/MarketLiveBrowserPanel.tsx'),
  read('./pages/TargetAwareDiscoverPage.tsx'),
  read('./pages/AccountPage.tsx'),
  read('./components/layout/AppLayout.tsx'),
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

test('market browser keeps Live controls but removes Browserbase policy banner', () => {
  assert.match(marketPage, /title="发现"/)
  assert.doesNotMatch(marketTarget, /设置市场侦察目标/)
  assert.doesNotMatch(livePanel, /Browserbase 只读研究会话/)
  assert.match(livePanel, /解锁 Live/)
  assert.match(livePanel, /title="交互式云浏览器"/)
})

test('primary navigation follows the operating loop and removes the standalone revenue workspace', () => {
  assert.doesNotMatch(layout, /item\.desc/)
  assert.doesNotMatch(layout, /真实来源模式/)
  assert.match(layout, /to: '\/app\/home', label: '工作台'/)
  assert.match(layout, /to: '\/app\/targets', label: '目标'/)
  assert.match(layout, /to: '\/app\/market', label: '发现'/)
  assert.match(layout, /activePaths: \['\/app\/market', '\/app\/discover'\]/)
  assert.match(layout, /to: '\/app\/communication', label: '沟通'/)
  assert.match(layout, /to: '\/app\/intent', label: '机会'/)
  assert.match(layout, /to: '\/app\/account', label: '设置'/)
  assert.doesNotMatch(layout, /label: '推荐'/)
  assert.doesNotMatch(layout, /label: '搜索'/)
  assert.doesNotMatch(layout, /label: '收益'/)
  assert.doesNotMatch(layout, /WalletCards/)
  assert.doesNotMatch(app, /RevenueOperationsPage/)
  assert.doesNotMatch(app, /path="revenue"/)
  assert.doesNotMatch(account, /Sales Radar 工作区/)
  assert.doesNotMatch(account, /数据可见性/)
  assert.match(account, /运行能力/)
})

test('discovery is one workspace with recommendation and proactive search modes', () => {
  assert.match(marketPage, /DiscoveryModeSwitch/)
  assert.match(discoverBridge, /DiscoveryModeSwitch/)
  assert.match(marketPage, /mode="recommend"/)
  assert.match(discoverBridge, /mode="search"/)
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
  assert.match(marketPage, /SignalAssessmentPanel/)
})
