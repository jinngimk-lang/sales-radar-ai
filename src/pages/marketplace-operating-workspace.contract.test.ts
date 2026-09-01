import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

test('primary workspace follows the active marketplace operating sequence', async () => {
  const [app, layout] = await Promise.all([
    read('../App.tsx'),
    read('../components/layout/AppLayout.tsx'),
  ])

  assert.match(layout, /label: 'AI 工作台'/)
  assert.match(layout, /to: '\/app\/targets', label: '目标'/)
  assert.match(layout, /to: '\/app\/market', label: '推荐'/)
  assert.match(layout, /to: '\/app\/discover', label: '搜索'/)
  assert.match(layout, /to: '\/app\/communication', label: '沟通'/)
  assert.match(layout, /to: '\/app\/intent', label: '意向'/)
  assert.doesNotMatch(layout, /to: '\/app\/revenue'|label: '收益'/)
  assert.match(layout, /to: '\/app\/account', label: '设置'/)
  assert.match(app, /path="communication"/)
  assert.match(app, /path="intent"/)
  assert.match(app, /path="revenue" element={<Navigate to="\/app\/market" replace \/>}/)
})

test('communication workspace never manufactures sent or replied state', async () => {
  const page = await read('./CommunicationWorkspacePage.tsx')

  assert.match(page, /getChatSessions/)
  assert.match(page, /contacts\.length/)
  assert.match(page, /没有发送回执就不显示/)
  assert.match(page, /准备沟通/)
  assert.doesNotMatch(page, /fake|mock conversation/i)
})

test('intent workspace is derived from persisted lead outcomes instead of prediction scores', async () => {
  const page = await read('./VerifiedIntentPage.tsx')

  assert.match(page, /getLeadOutcome/)
  assert.match(page, /REPLIED/)
  assert.match(page, /MEETING/)
  assert.match(page, /QUALIFIED/)
  assert.match(page, /PROPOSAL/)
  assert.match(page, /WON/)
  assert.match(page, /预测购买概率不会出现在这里/)
  assert.doesNotMatch(page, /purchaseProbability/)
})
