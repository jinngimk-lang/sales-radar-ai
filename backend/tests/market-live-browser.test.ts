import assert from 'node:assert/strict'
import test from 'node:test'
import { MarketLiveBrowserService } from '../src/services/market-live-browser.service.js'

test('market live browser starts a read-only public Browserbase run and returns only safe live-view fields', async () => {
  let task = ''
  const service = new MarketLiveBrowserService({
    provider: {
      async createRun(value) {
        task = value
        return {
          runId: 'run-1',
          status: 'RUNNING',
          task: value,
          createdAt: '2026-08-06T00:00:00.000Z',
          updatedAt: '2026-08-06T00:00:00.000Z',
          sessionId: 'session-1',
        }
      },
      async retrieveRun() {
        return {
          runId: 'run-1',
          status: 'RUNNING',
          task,
          createdAt: '2026-08-06T00:00:00.000Z',
          updatedAt: '2026-08-06T00:00:00.000Z',
          sessionId: 'session-1',
        }
      },
      async getLiveView() {
        return {
          debuggerFullscreenUrl: 'https://www.browserbase.com/sessions/session-1',
          debuggerUrl: 'https://www.browserbase.com/sessions/session-1/debug',
          pages: [{
            id: 'page-1',
            debuggerFullscreenUrl: 'https://www.browserbase.com/sessions/session-1',
            debuggerUrl: 'https://www.browserbase.com/sessions/session-1/debug',
            faviconUrl: null,
            title: 'Battery company',
            url: 'https://battery.example/news',
          }],
        }
      },
      async releaseSession() {},
    },
  })

  const status = await service.start('user-1', {
    url: 'https://battery.example/news',
    title: 'Battery company',
  })

  assert.match(task, /Start URL: https:\/\/battery\.example\/news/)
  assert.match(task, /Do not log in/)
  assert.equal(status.liveView?.debuggerFullscreenUrl, 'https://www.browserbase.com/sessions/session-1')
  assert.equal(status.currentPage?.url, 'https://battery.example/news')
  assert.equal('wsUrl' in (status.liveView ?? {}), false)
})
