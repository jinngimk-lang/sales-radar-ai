import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

const [home, composer, marketPage, marketTarget, livePanel, revenuePage, revenueLive, account, layout] = await Promise.all([
  read('./pages/AICommandCenterPage.tsx'),
  read('./features/command-center/CommandComposer.tsx'),
  read('./pages/MarketIntelligenceWorkspacePage.tsx'),
  read('./features/market-intelligence/MarketScanTarget.tsx'),
  read('./features/market-intelligence/MarketLiveBrowserPanel.tsx'),
  read('./pages/RevenueOperationsPage.tsx'),
  read('./features/revenue/RevenueLiveOpsPanel.tsx'),
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
  assert.match(marketPage, /市场雷达/)
  assert.doesNotMatch(marketTarget, /设置市场侦察目标/)
  assert.doesNotMatch(livePanel, /Browserbase 只读研究会话/)
  assert.match(livePanel, /解锁 Live/)
  assert.match(livePanel, /title="交互式云浏览器"/)
})

test('revenue workspace removes oversized supervision marketing copy and dead helpers', () => {
  assert.match(revenuePage, /收益中心/)
  assert.doesNotMatch(revenuePage, /Revenue Supervision/)
  assert.doesNotMatch(revenuePage, /Supervision Pipeline/)
  assert.doesNotMatch(revenueLive, /自动任务保持只读，人工接管画面可以点击/)
  assert.doesNotMatch(revenueLive, /function TrustItem/)
  assert.doesNotMatch(revenueLive, /\bShieldCheck\b/)
})

test('settings and navigation are concise and expose proactive search as a primary workspace', () => {
  assert.doesNotMatch(layout, /item\.desc/)
  assert.doesNotMatch(layout, /真实来源模式/)
  assert.match(layout, /to: '\/app\/home', label: 'AI 首页'/)
  assert.match(layout, /to: '\/app\/market', label: '市场雷达'/)
  assert.match(layout, /to: '\/app\/discover', label: '搜索'/)
  assert.match(layout, /to: '\/app\/revenue', label: '收益中心'/)
  assert.match(layout, /to: '\/app\/account', label: '设置'/)
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
