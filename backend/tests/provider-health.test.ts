import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ProviderHealthService,
  type ProviderHealthCommand,
} from '../src/services/provider-health.service.js'
import { AppError } from '../src/utils/app-error.js'

describe('ProviderHealthService', () => {
  it('reports AgentReach and Exa as available', async () => {
    const command: ProviderHealthCommand = async () => ({
      stdout: JSON.stringify({
        servers: [
          { name: 'unrelated', status: 'offline' },
          { name: 'exa', status: 'connected' },
        ],
      }),
    })
    const service = new ProviderHealthService(command, 'mcporter')

    const health = await service.checkAgentReach()

    assert.equal(health.state, 'AVAILABLE')
    assert.equal(health.code, 'OK')
  })

  it('blocks search with a structured error when Exa is unavailable', async () => {
    const command: ProviderHealthCommand = async () => ({
      stdout: JSON.stringify({
        servers: [{ name: 'exa', status: 'offline' }],
      }),
    })
    const service = new ProviderHealthService(command, 'mcporter')

    await assert.rejects(
      () => service.requireAgentReach(),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 503 &&
        error.code === 'SEARCH_PROVIDER_UNAVAILABLE' &&
        error.details?.providerState === 'DEGRADED' &&
        error.details?.dependency === 'exa',
    )
  })

  it('reports a missing runtime as unavailable', async () => {
    const command: ProviderHealthCommand = async () => {
      const error = new Error('mcporter not found') as Error & { code: string }
      error.code = 'ENOENT'
      throw error
    }
    const service = new ProviderHealthService(command, 'mcporter')

    const health = await service.checkAgentReach()

    assert.equal(health.state, 'UNAVAILABLE')
    assert.equal(health.code, 'MCPORTER_NOT_FOUND')
  })
})
