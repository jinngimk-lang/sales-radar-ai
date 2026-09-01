import { execFileSync, spawn } from 'node:child_process'
import process from 'node:process'
import puppeteer from 'puppeteer-core'

const BASE_URL = 'http://127.0.0.1:4173'
const TARGET_NAME = 'E2E 欧洲工业机器人买家'
const TARGET_PRODUCT = 'industrial robot procurement'

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  return execFileSync(
    'bash',
    [
      '-lc',
      'command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser',
    ],
    { encoding: 'utf8' },
  ).trim()
}

async function waitForServer(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
      lastError = new Error(`preview returned HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw lastError ?? new Error('preview did not become ready')
}

async function clickTextLink(page, label, expectedPath) {
  await page.waitForFunction(
    (text) =>
      [...document.querySelectorAll('a')].some(
        (link) => link.textContent?.trim() === text,
      ),
    { timeout: 8_000 },
    label,
  )
  const clicked = await page.evaluate((text) => {
    const link = [...document.querySelectorAll('a')].find(
      (item) => item.textContent?.trim() === text,
    )
    if (!link) return false
    link.click()
    return true
  }, label)
  if (!clicked) throw new Error(`link not clickable: ${label}`)
  await page.waitForFunction(
    (pathname) => window.location.pathname === pathname,
    { timeout: 8_000 },
    expectedPath,
  )
}

async function waitForBodyIncludes(page, expectedText) {
  await page.waitForFunction(
    (text) => document.body.innerText.includes(text),
    { timeout: 8_000 },
    expectedText,
  )
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}

async function main() {
  const preview = spawn(
    'npm',
    ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    },
  )

  let previewOutput = ''
  preview.stdout.on('data', (chunk) => {
    previewOutput += chunk.toString()
  })
  preview.stderr.on('data', (chunk) => {
    previewOutput += chunk.toString()
  })

  let browser
  try {
    await waitForServer(`${BASE_URL}/app/targets`)

    browser = await puppeteer.launch({
      executablePath: findChrome(),
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 1000 })

    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(`${BASE_URL}/app/targets`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('input[placeholder="例如：欧洲工业机器人买家"]')

    let text = await bodyText(page)
    if (!text.includes('目标') || !text.includes('新建商业目标')) {
      throw new Error('targets page did not render expected content')
    }
    if (text.includes('收益')) {
      throw new Error('Revenue navigation is still visible')
    }

    const desktopLabels = await page.$$eval('aside nav a', (links) =>
      links.map((link) => link.textContent?.trim()).filter(Boolean),
    )
    const expectedLabels = ['AI 工作台', '目标', '推荐', '搜索', '沟通', '意向', '设置']
    if (JSON.stringify(desktopLabels) !== JSON.stringify(expectedLabels)) {
      throw new Error(`unexpected workspace navigation: ${JSON.stringify(desktopLabels)}`)
    }

    await page.type('input[placeholder="例如：欧洲工业机器人买家"]', TARGET_NAME)
    await page.type('input[placeholder="输入你要围绕什么做研究"]', TARGET_PRODUCT)
    const saveClicked = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((item) =>
        item.textContent?.includes('保存目标'),
      )
      if (!button || button.disabled) return false
      button.click()
      return true
    })
    if (!saveClicked) throw new Error('Save Target button could not be clicked')

    await waitForBodyIncludes(page, TARGET_NAME)
    await page.reload({ waitUntil: 'networkidle0' })
    await waitForBodyIncludes(page, TARGET_NAME)

    await clickTextLink(page, '去市场雷达', '/app/market')
    if (!new URL(page.url()).searchParams.get('targetId')) {
      throw new Error('targetId was not carried into Market Radar')
    }
    await waitForBodyIncludes(page, '市场雷达')
    text = await bodyText(page)
    for (const forbidden of [
      'Browserbase',
      'REVENUE_OPERATOR_TOKEN',
      '启动 Live',
      '等待云端浏览器开始研究',
    ]) {
      if (text.includes(forbidden)) {
        throw new Error(`obsolete cloud-browser dependency is visible: ${forbidden}`)
      }
    }

    await clickTextLink(page, '搜索', '/app/discover')
    await waitForBodyIncludes(page, '搜索')

    await clickTextLink(page, '推荐', '/app/market')
    await waitForBodyIncludes(page, '市场雷达')
    await clickTextLink(page, '目标', '/app/targets')
    await waitForBodyIncludes(page, '新建商业目标')

    await page.goto(`${BASE_URL}/app/revenue`, { waitUntil: 'networkidle0' })
    await page.waitForFunction(
      () => window.location.pathname === '/app/market',
      { timeout: 8_000 },
    )
    await waitForBodyIncludes(page, '市场雷达')

    if (pageErrors.length > 0) {
      throw new Error(`uncaught browser errors: ${pageErrors.join(' | ')}`)
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          checks: [
            'workspace navigation excludes Revenue',
            'saved target persists across reload',
            'clicked target -> Market Radar with targetId',
            'Market Radar excludes Browserbase/operator-token/Live unlock copy',
            'clicked Search, Recommendation and Targets navigation',
            'legacy /app/revenue redirects to /app/market',
          ],
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error(previewOutput)
    throw error
  } finally {
    if (browser) await browser.close()
    preview.kill('SIGTERM')
  }
}

await main()
