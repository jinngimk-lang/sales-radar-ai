import { isIP } from 'node:net'
import { AppError } from '../utils/app-error.js'

export interface RevenueResearchTaskInput {
  title: string
  platform: string
  sourceUrl: string
}

export function validateRevenueResearchUrl(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw rejectedUrl()
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw rejectedUrl()
  }
  if (parsed.username || parsed.password) throw rejectedUrl()

  const hostname = stripIpv6Brackets(parsed.hostname).toLowerCase().replace(/\.$/, '')
  if (!hostname || isLocalHostname(hostname) || isPrivateLiteralAddress(hostname)) {
    throw rejectedUrl()
  }

  return parsed
}

export function buildRevenueResearchTask(
  input: RevenueResearchTaskInput,
): string {
  const source = validateRevenueResearchUrl(input.sourceUrl).toString()
  return [
    'Complete a strictly read-only public-web research task.',
    `Opportunity: ${input.title}`,
    `Platform: ${input.platform}`,
    `Start URL: ${source}`,
    '',
    'Open the public opportunity page and verify payout terms, eligibility, scope, deadline, competition, required deliverables, and the evidence needed for payment.',
    'Follow only public links needed to verify those facts. Return a concise summary, source URLs, and explicit uncertainty.',
    '',
    'Hard restrictions:',
    '- Do not log in.',
    '- Do not create an account.',
    '- Do not submit forms, applications, reports, messages, comments, code, or files.',
    '- Do not communicate with any person or organization.',
    '- Do not accept terms, contracts, invitations, cookies beyond what is technically necessary to view a public page, or legal agreements.',
    '- Do not handle KYC, identity documents, payment details, wallets, bank accounts, deposits, withdrawals, purchases, trading, or leverage.',
    '- Do not download or execute files.',
    '- Do not perform security testing, scanning, exploitation, vulnerability validation, or secret collection.',
    '- Do not solve or bypass CAPTCHAs, access controls, robots restrictions, paywalls, or authentication gates.',
    '- Stop and report the boundary if the task requires any prohibited action.',
  ].join('\n')
}

export function sanitizeProviderText(
  value: unknown,
  limit = 1_200,
): string | null {
  const raw = toText(value)
  if (!raw) return null

  const sanitized = raw
    .replace(/https?:\/\/[^\s<>"']+/gi, (match) => redactUrl(match))
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) return null
  return sanitized.length > limit
    ? `${sanitized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
    : sanitized
}

function toText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return null
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function redactUrl(raw: string) {
  const suffixMatch = raw.match(/[),.;!?]+$/)
  const suffix = suffixMatch?.[0] ?? ''
  const candidate = suffix ? raw.slice(0, -suffix.length) : raw
  try {
    const parsed = new URL(candidate)
    parsed.username = ''
    parsed.password = ''
    parsed.search = ''
    parsed.hash = ''
    return `${parsed.origin}${parsed.pathname}${suffix}`
  } catch {
    return '[redacted-url]'
  }
}

function isLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'internal' ||
    hostname.endsWith('.internal') ||
    hostname === 'local' ||
    hostname.endsWith('.local')
  )
}

function isPrivateLiteralAddress(hostname: string) {
  const addressType = isIP(hostname)
  if (addressType === 4) return isPrivateIpv4(hostname)
  if (addressType === 6) return isPrivateIpv6(hostname)
  return false
}

function isPrivateIpv4(address: string) {
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value))) {
    return true
  }
  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase()
  if (normalized === '::' || normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

  const firstGroup = Number.parseInt(normalized.split(':')[0] || '0', 16)
  if (Number.isFinite(firstGroup) && firstGroup >= 0xfe80 && firstGroup <= 0xfebf) {
    return true
  }

  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPrivateIpv4(mapped[1]) : false
}

function stripIpv6Brackets(hostname: string) {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname
}

function rejectedUrl() {
  return new AppError(
    400,
    'REVENUE_LIVE_URL_REJECTED',
    'Revenue live research requires a public HTTP or HTTPS opportunity URL',
  )
}
