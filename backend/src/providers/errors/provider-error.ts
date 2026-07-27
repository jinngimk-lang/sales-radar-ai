import type { SearchProviderName } from '../search/search-provider.interface.js'

export type ProviderErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INVALID_RESPONSE'
  | 'AUTH_ERROR'

export class ProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly provider: SearchProviderName,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ProviderError'
  }
}
