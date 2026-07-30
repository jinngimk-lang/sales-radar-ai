import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { Industry, Platform, Region } from '@prisma/client'
import { ProviderError } from '../errors/provider-error.js'
import {
  buildAgentReachProcessEnv,
  resolveAgentReachCommand,
} from '../../utils/agent-reach-runtime.js'
import type {
  SearchProvider,
  SearchProviderInput,
  SearchResult,
} from './search-provider.interface.js'
import { ProviderRequestScheduler } from './provider-request-scheduler.js'

const execFileAsync = promisify(execFile)

interface AgentReachRawResult {
  title: string
  url: string
  text: string
  author?: string
  profileUrl?: string
  publishedAt?: string
  company?: string
  companyDomain?: string
  companyWebsite?: string
  jobTitle?: string
  country?: string
  location?: string
  buyingNeed?: string
  metadata?: Record<string, unknown>
}

export interface AgentReachOutputDiagnostics {
  format: 'empty' | 'json' | 'text'
  byteLength: number
  containerKeys: string[]
  textBlockCount: number
  urlMarkerCount: number
}

const PLATFORM_DOMAINS: Partial<Record<Platform, string[]>> = {
  [Platform.Reddit]: ['reddit.com'],
  [Platform.X]: ['x.com', 'twitter.com'],
  [Platform.Instagram]: ['instagram.com'],
  [Platform.Facebook]: ['facebook.com'],
  [Platform.TikTok]: ['tiktok.com'],
  [Platform.LinkedIn]: ['linkedin.com'],
  [Platform.Xiaohongshu]: ['xiaohongshu.com', 'xhslink.com'],
  [Platform.YouTube]: ['youtube.com', 'youtu.be'],
}

const PUBLIC_DEFAULT_PLATFORMS = Object.values(Platform)

const REGION_COUNTRY: Record<Region, string> = {
  [Region.USA]: 'United States',
  [Region.Europe]: 'Europe',
  [Region.SoutheastAsia]: 'Southeast Asia',
  [Region.China]: 'China',
  [Region.MiddleEast]: 'Middle East',
}

export class AgentReachProvider implements SearchProvider {
  readonly name = 'agent-reach' as const

  private readonly command = resolveAgentReachCommand()
  private readonly timeoutMs = this.readPositiveInteger(
    process.env.AGENT_REACH_TIMEOUT_MS,
    15_000,
  )
  private readonly maxResults = Math.min(
    this.readPositiveInteger(process.env.AGENT_REACH_MAX_RESULTS, 10),
    10,
  )
  private readonly requestScheduler = new ProviderRequestScheduler(
    this.readPositiveInteger(
      process.env.AGENT_REACH_MIN_INTERVAL_MS,
      1_500,
    ),
  )

  async search(input: SearchProviderInput): Promise<SearchResult[]> {
    const platforms =
      input.platforms.length > 0
        ? input.platforms
        : [...PUBLIC_DEFAULT_PLATFORMS]
    const query = this.buildQuery(input.keyword, platforms, input.regions)
    const rawOutput = await this.requestScheduler.run(() =>
      this.executeSearch(query),
    )
    const rawResults = parseAgentReachOutput(rawOutput)
    const outputDiagnostics = inspectAgentReachOutput(rawOutput)

    console.info(
      '[AgentReachProvider] mcporter response diagnostics:',
      JSON.stringify({
        ...outputDiagnostics,
        parsedResultCount: rawResults.length,
      }),
    )
    if (rawResults[0]) {
      console.info(
        '[AgentReachProvider] first parsed result shape:',
        JSON.stringify(
          {
            fieldsPresent: [
              'title',
              'url',
              'text',
              'author',
              'profileUrl',
              'publishedAt',
              'company',
              'companyDomain',
              'companyWebsite',
              'jobTitle',
              'country',
              'location',
              'buyingNeed',
            ].filter((field) => {
              const value = rawResults[0]?.[field as keyof AgentReachRawResult]
              return value !== undefined && value !== null && value !== ''
            }),
            titleLength: rawResults[0].title.length,
            contentLength: rawResults[0].text.length,
            hasValidHttpUrl: /^https?:\/\//i.test(rawResults[0].url),
          },
        ),
      )
    }

    if (rawResults.length === 0) {
      throw new ProviderError(
        'INVALID_RESPONSE',
        'Agent Reach returned no parseable public search results',
        this.name,
      )
    }

    // Exa already applies maxResults to the upstream request. Preserve every
    // real result it returns so RadarAssessment can explain and score it,
    // including adjacent supplier, partner, social, and review-only signals.
    const consideredResults = rawResults
    const invalidUrlCount = consideredResults.filter(
      (result) => inferPlatform(result.url) === null,
    ).length
    const platformFilteredCount = consideredResults.filter((result) => {
      const platform = inferPlatform(result.url)
      return platform !== null && !platforms.includes(platform)
    }).length
    const adaptedResults = consideredResults
      .map((result) => this.toSearchResult(result, input, platforms))
      .filter((result): result is SearchResult => result !== null)

    console.info(
      '[AgentReachProvider] adapter diagnostics:',
      JSON.stringify({
        parsedResultCount: rawResults.length,
        consideredResultCount: consideredResults.length,
        adaptedResultCount: adaptedResults.length,
        invalidUrlCount,
        platformFilteredCount,
        requestedPlatforms: platforms,
      }),
    )

    return adaptedResults
  }

  private async executeSearch(query: string): Promise<string> {
    const escapedQuery = query.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const expression = `exa.web_search_exa(query: '${escapedQuery}', numResults: ${this.maxResults})`
    const toolCallArgument =
      process.platform === 'win32' ? `"${expression}"` : expression

    try {
      const { stdout, stderr } = await execFileAsync(
        this.command,
        ['call', toolCallArgument],
        {
          encoding: 'utf8',
          timeout: this.timeoutMs,
          windowsHide: true,
          shell: process.platform === 'win32',
          env: buildAgentReachProcessEnv(),
          maxBuffer: 2 * 1024 * 1024,
        },
      )

      if (stderr && /rate.?limit|too many requests|429/i.test(stderr)) {
        throw new ProviderError(
          'RATE_LIMIT',
          'Agent Reach search was rate limited',
          this.name,
        )
      }

      return stdout
    } catch (error) {
      if (error instanceof ProviderError) throw error

      const details = this.readExecutionError(error)
      if (
        details.killed ||
        details.signal === 'SIGTERM' ||
        /timed?out|etime/i.test(details.message)
      ) {
        throw new ProviderError(
          'TIMEOUT',
          `Agent Reach search exceeded ${this.timeoutMs}ms`,
          this.name,
          { cause: error },
        )
      }

      if (/rate.?limit|too many requests|429/i.test(details.output)) {
        throw new ProviderError(
          'RATE_LIMIT',
          'Agent Reach search was rate limited',
          this.name,
          { cause: error },
        )
      }

      if (
        /auth|credential|api.?key|unauthorized|forbidden|401|403/i.test(
          details.output,
        )
      ) {
        throw new ProviderError(
          'AUTH_ERROR',
          'Agent Reach search credentials are unavailable or invalid',
          this.name,
          { cause: error },
        )
      }

      throw new ProviderError(
        'INVALID_RESPONSE',
        details.code === 'ENOENT' ||
          /not recognized|cannot find|无法将|找不到指定的文件/i.test(
            details.output,
          )
          ? `Agent Reach runtime not found: ${this.command}. Ensure mcporter is installed and available on PATH, or set AGENT_REACH_MCPORTER_PATH to its executable path.`
          : `Agent Reach search failed: ${details.message}`,
        this.name,
        { cause: error },
      )
    }
  }

  private toSearchResult(
    raw: AgentReachRawResult,
    input: SearchProviderInput,
    requestedPlatforms: Platform[],
  ): SearchResult | null {
    const platform = inferPlatform(raw.url)
    if (!platform || !requestedPlatforms.includes(platform)) return null

    const region =
      input.regions[0] ?? inferRegion(input.keyword) ?? Region.USA
    const company = cleanOptionalValue(raw.company)
    const author = cleanOptionalValue(raw.author)
    const username = author || inferSocialHandle(raw.url, platform)
    const customerName =
      author ||
      company ||
      (platform === Platform.Reddit
        ? `${username ?? 'Reddit'} discussion`
        : `${platform} source`)
    const externalId = createHash('sha256')
      .update(`${platform}:${raw.url}`)
      .digest('hex')

    return {
      externalId,
      platform,
      sourceUrl: raw.url,
      profileUrl:
        cleanOptionalValue(raw.profileUrl) ||
        inferProfileUrl(raw.url, platform, author) ||
        raw.url,
      company,
      customerName,
      country:
        cleanOptionalValue(raw.country) ||
        cleanOptionalValue(raw.location) ||
        REGION_COUNTRY[region],
      region,
      industry: inferIndustry(`${input.keyword} ${raw.title} ${raw.text}`),
      rawContent: raw.text || raw.title,
      metadata: {
        provider: this.name,
        searchEngine: 'exa',
        title: raw.title,
        author,
        username,
        publishedAt: raw.publishedAt,
        companyDomain: raw.companyDomain,
        companyWebsite: raw.companyWebsite,
        jobTitle: raw.jobTitle,
        location: raw.location,
        buyingNeed: raw.buyingNeed,
        originalMetadata: raw.metadata ?? {},
      },
    }
  }

  private buildQuery(
    keyword: string,
    platforms: Platform[],
    regions: Region[],
  ): string {
    const domains = platforms.includes(Platform.Website)
      ? []
      : platforms.flatMap((platform) => PLATFORM_DOMAINS[platform] ?? [])
    const siteClause = domains.map((domain) => `site:${domain}`).join(' OR ')
    const regionClause = regions.map((region) => REGION_COUNTRY[region]).join(' OR ')

    return [
      keyword.trim(),
      regionClause ? `(${regionClause})` : '',
      siteClause ? `(${siteClause})` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  private readPositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }

  private readExecutionError(error: unknown): {
    message: string
    code?: string
    killed?: boolean
    signal?: string
    output: string
  } {
    if (!error || typeof error !== 'object') {
      return { message: String(error), output: String(error) }
    }

    const value = error as {
      message?: string
      code?: string
      killed?: boolean
      signal?: string
      stdout?: string
      stderr?: string
    }

    return {
      message: value.message ?? 'Unknown command error',
      code: value.code,
      killed: value.killed,
      signal: value.signal,
      output: `${value.message ?? ''}\n${value.stdout ?? ''}\n${value.stderr ?? ''}`,
    }
  }
}

export function parseAgentReachOutput(output: string): AgentReachRawResult[] {
  const trimmed = output.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed) as unknown
    const structured = collectStructuredResults(parsed)
    if (structured.length > 0) return structured
  } catch {
    // mcporter may emit human-readable MCP text instead of JSON.
  }

  return parseTextResults(trimmed)
}

export function inspectAgentReachOutput(
  output: string,
): AgentReachOutputDiagnostics {
  const trimmed = output.trim()
  if (!trimmed) {
    return {
      format: 'empty',
      byteLength: 0,
      containerKeys: [],
      textBlockCount: 0,
      urlMarkerCount: 0,
    }
  }

  let format: AgentReachOutputDiagnostics['format'] = 'text'
  let containerKeys: string[] = []
  try {
    const parsed = JSON.parse(trimmed) as unknown
    format = 'json'
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      containerKeys = ['results', 'items', 'data', 'content', 'output'].filter(
        (key) => record[key] !== undefined,
      )
    }
  } catch {
    // The default mcporter output can be human-readable MCP text.
  }

  return {
    format,
    byteLength: Buffer.byteLength(trimmed, 'utf8'),
    containerKeys,
    textBlockCount: trimmed.split(/\n\s*\n/).filter(Boolean).length,
    urlMarkerCount: (trimmed.match(/https?:\/\//gi) ?? []).length,
  }
}

function collectStructuredResults(value: unknown): AgentReachRawResult[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStructuredResults(item))
  }

  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>

  const direct = toRawResult(record)
  if (direct) return [direct]

  const results: AgentReachRawResult[] = []
  for (const key of ['results', 'items', 'data', 'content', 'output']) {
    const child = record[key]
    if (typeof child === 'string') {
      results.push(...parseTextResults(child))
    } else if (child !== undefined) {
      results.push(...collectStructuredResults(child))
    }
  }
  return results
}

function toRawResult(
  record: Record<string, unknown>,
): AgentReachRawResult | null {
  const url = readString(record, ['url', 'link', 'sourceUrl'])
  if (!url || !/^https?:\/\//i.test(url)) return null

  const title = readString(record, ['title', 'name']) ?? url
  const text =
    readString(record, ['text', 'content', 'snippet', 'summary']) ?? title

  return {
    title,
    url,
    text,
    author: readMeaningfulString(record, [
      'author',
      'customerName',
      'contactName',
      'personName',
      'fullName',
    ]),
    profileUrl: readString(record, ['profileUrl', 'authorUrl']),
    publishedAt: readString(record, ['publishedDate', 'publishedAt', 'date']),
    company: readMeaningfulString(record, [
      'company',
      'companyName',
      'organization',
      'organizationName',
    ]),
    companyDomain: readString(record, ['companyDomain', 'domain']),
    companyWebsite: readString(record, [
      'companyWebsite',
      'companyUrl',
      'website',
    ]),
    jobTitle: readMeaningfulString(record, ['jobTitle', 'position', 'role']),
    country: readMeaningfulString(record, ['country', 'countryName']),
    location: readMeaningfulString(record, ['location', 'region']),
    buyingNeed: readMeaningfulString(record, [
      'buyingNeed',
      'purchaseRequirement',
      'procurementNeed',
      'buyerIntent',
    ]),
    metadata: record,
  }
}

function parseTextResults(text: string): AgentReachRawResult[] {
  const blocks = text.split(/\n\s*\n/)
  const results: AgentReachRawResult[] = []

  for (const block of blocks) {
    const url =
      block.match(/(?:URL|Url|url|Link):\s*(https?:\/\/\S+)/)?.[1] ??
      block.match(/https?:\/\/[^\s)\]]+/)?.[0]
    if (!url) continue

    const title =
      block.match(/(?:Title|title):\s*(.+)/)?.[1]?.trim() ??
      block.split('\n')[0]?.replace(/^[-#*\s]+/, '').trim() ??
      url
    const content =
      block.match(/(?:Highlights|Text|Content|Snippet|Summary):\s*([\s\S]+)/i)?.[1]?.trim() ??
      block.replace(url, '').trim()
    const author = cleanOptionalValue(
      block.match(/^Author:\s*(.+)$/im)?.[1],
    )
    const publishedAt = cleanOptionalValue(
      block.match(/^Published:\s*(.+)$/im)?.[1],
    )

    results.push({
      title,
      url: url.replace(/[.,;]+$/, ''),
      text: content || title,
      author: author ?? undefined,
      publishedAt: publishedAt ?? undefined,
      metadata: {
        format: 'exa-text',
        title,
        author,
        publishedAt,
      },
    })
  }

  return results
}

function readString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function readMeaningfulString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  return cleanOptionalValue(readString(record, keys)) ?? undefined
}

function inferPlatform(url: string): Platform | null {
  let hostname: string
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }

  for (const [platform, domains] of Object.entries(PLATFORM_DOMAINS)) {
    if (
      domains?.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      )
    ) {
      return platform as Platform
    }
  }
  return Platform.Website
}

function inferCompany(title: string, url: string): string | null {
  const titlePart = title.split(/[|–—-]/)[0]?.trim()
  if (titlePart && titlePart.length <= 100) return titlePart

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return hostname.split('.')[0] ?? null
  } catch {
    return null
  }
}

function inferSocialHandle(url: string, platform: Platform): string | null {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean)
    if (platform === Platform.Reddit) {
      const communityIndex = segments.findIndex(
        (segment) => segment.toLowerCase() === 'r',
      )
      if (communityIndex >= 0 && segments[communityIndex + 1]) {
        return `r/${segments[communityIndex + 1]}`
      }
    }
    if (platform === Platform.X && segments[0]) return segments[0]
    if (platform === Platform.YouTube) {
      return segments.find((segment) => segment.startsWith('@')) ?? null
    }
    return null
  } catch {
    return null
  }
}

function inferProfileUrl(
  sourceUrl: string,
  platform: Platform,
  author: string | null,
): string | null {
  if (author && platform === Platform.Reddit) {
    return `https://www.reddit.com/user/${encodeURIComponent(author)}`
  }
  const handle = inferSocialHandle(sourceUrl, platform)
  if (!handle) return null
  if (platform === Platform.X) return `https://x.com/${handle}`
  if (platform === Platform.YouTube) return `https://www.youtube.com/${handle}`
  return null
}

function cleanOptionalValue(value: string | undefined): string | null {
  const cleaned = value?.trim()
  if (
    !cleaned ||
    /^(?:n\/?a|none|null|unknown|not available|anonymous|-+)$/i.test(cleaned)
  ) {
    return null
  }
  return cleaned
}

function inferRegion(keyword: string): Region | null {
  if (/\b(usa|united states|america|american)\b/i.test(keyword)) {
    return Region.USA
  }
  if (/\b(europe|eu|germany|france|italy|spain|uk)\b/i.test(keyword)) {
    return Region.Europe
  }
  if (/\b(china|chinese)\b/i.test(keyword)) return Region.China
  if (/\b(southeast asia|singapore|vietnam|thailand|malaysia)\b/i.test(keyword)) {
    return Region.SoutheastAsia
  }
  if (/\b(middle east|uae|saudi|dubai)\b/i.test(keyword)) {
    return Region.MiddleEast
  }
  return null
}

function inferIndustry(text: string): Industry {
  if (/medical|health|hospital|device|pharma/i.test(text)) {
    return Industry.MedicalHealth
  }
  if (/saas|software|cloud|analytics|api/i.test(text)) {
    return Industry.SaaSSoftware
  }
  if (/beauty|cosmetic|skincare/i.test(text)) {
    return Industry.BeautyIndustry
  }
  if (/electronics|semiconductor|device|hardware/i.test(text)) {
    return Industry.ConsumerElectronics
  }
  if (/trade|export|import|wholesale/i.test(text)) {
    return Industry.TradeExport
  }
  return Industry.IndustrialManufacturing
}

export const agentReachProvider = new AgentReachProvider()
