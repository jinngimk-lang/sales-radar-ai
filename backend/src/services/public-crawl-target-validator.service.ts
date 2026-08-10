import { isIP } from 'node:net'
import { resolve4, resolve6 } from 'node:dns/promises'

type HostResolver = (hostname: string) => Promise<string[]>

export class PublicCrawlTargetValidator {
  constructor(private readonly resolveHost: HostResolver = defaultResolveHost) {}

  async validate(value: string): Promise<void> {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS crawl targets are allowed')
    }
    if (url.username || url.password) throw new Error('Credentialed URLs are not allowed')
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
      throw new Error('Local crawl targets are not allowed')
    }

    const addresses = isIP(hostname) ? [hostname] : await this.resolveHost(hostname)
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
      throw new Error('Crawl target must resolve only to public addresses')
    }
  }
}

async function defaultResolveHost(hostname: string) {
  const [ipv4, ipv6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ])
  return [...ipv4, ...ipv6]
}

function isPrivateAddress(address: string) {
  if (address.includes(':')) {
    const normalized = address.toLowerCase()
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')
  }
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true
  const [a, b] = parts
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

export const publicCrawlTargetValidator = new PublicCrawlTargetValidator()
