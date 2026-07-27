import { Prisma } from '@prisma/client'

/**
 * Removes characters PostgreSQL cannot store and guarantees that arbitrary
 * provider metadata can make a complete JSON stringify/parse round trip.
 */
export function sanitizeProviderValue(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeProviderString(value)
  if (Array.isArray(value)) return value.map(sanitizeProviderValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [
          sanitizeProviderString(key),
          sanitizeProviderValue(entry),
        ]),
    )
  }
  if (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value
  }
  return null
}

export function sanitizeProviderString(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '\uFFFD')
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1\uFFFD')
}

export function toSafeJson(value: unknown): Prisma.InputJsonValue {
  const sanitized = sanitizeProviderValue(value)
  return JSON.parse(JSON.stringify(sanitized)) as Prisma.InputJsonValue
}
