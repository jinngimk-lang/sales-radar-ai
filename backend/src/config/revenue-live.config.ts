export interface RevenueLiveConfig {
  operatorToken: string | null
  browserbaseApiKey: string | null
  browserbaseBaseUrl: string
  loopEnabled: boolean
  loopIntervalMinutes: number
  providerConfigured: boolean
}

export function getRevenueLiveConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RevenueLiveConfig {
  const operatorToken = readNonEmpty(environment.REVENUE_OPERATOR_TOKEN)
  const browserbaseApiKey = readNonEmpty(environment.BROWSERBASE_API_KEY)
  const browserbaseBaseUrl = normalizeBaseUrl(
    readNonEmpty(environment.BROWSERBASE_BASE_URL) ??
      'https://api.browserbase.com',
  )

  return {
    operatorToken,
    browserbaseApiKey,
    browserbaseBaseUrl,
    loopEnabled: environment.REVENUE_LIVE_LOOP_ENABLED === 'true',
    loopIntervalMinutes: readIntervalMinutes(
      environment.REVENUE_LIVE_LOOP_INTERVAL_MINUTES,
    ),
    providerConfigured: Boolean(browserbaseApiKey),
  }
}

function readNonEmpty(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeBaseUrl(value: string) {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'https://api.browserbase.com'
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return 'https://api.browserbase.com'
  }
}

function readIntervalMinutes(value: string | undefined) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 5 || parsed > 1_440) return 30
  return parsed
}
