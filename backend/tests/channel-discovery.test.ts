import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ChannelDiscoveryService,
  type ChannelDiscoveryRepository,
  type ChannelLead,
} from '../src/services/channel-discovery.service.js'

function lead(overrides: Partial<ChannelLead> = {}): ChannelLead {
  return {
    id: 'lead-1',
    company: 'Acme Automation',
    industry: 'IndustrialManufacturing',
    region: 'USA',
    country: 'United States',
    sourceUrl: 'https://acme.example.com',
    postContent: 'Acme provides industrial automation equipment.',
    sourceMetadata: null,
    searchTask: { regions: ['USA'] },
    ...overrides,
  }
}

describe('Channel Discovery Agent v1', () => {
  const service = new ChannelDiscoveryService()

  it('recognizes a verified distributor', () => {
    const result = service.analyze(
      lead({
        sourceUrl: 'https://acme.example.com/distributors',
        postContent:
          'Acme is an authorized distributor selling industrial automation equipment.',
      }),
    )
    assert.equal(result.channelType, 'distributor')
    assert.ok(result.channelScore >= 80)
    assert.match(result.cooperationStrategy, /distribution agreement/i)
  })

  it('does not classify an ordinary company as a channel', () => {
    const result = service.analyze(
      lead({
        postContent:
          'Acme manufactures components for its own production facilities.',
      }),
    )
    assert.equal(result.channelType, 'unknown')
    assert.match(result.recommendationReason, /No reliable commercial channel/)
  })

  it('recognizes a system integrator from explicit evidence', () => {
    const result = service.analyze(
      lead({
        postContent:
          'We are a systems integrator delivering industrial automation and control solutions.',
      }),
    )
    assert.equal(result.channelType, 'system_integrator')
    assert.match(result.cooperationStrategy, /solution-integration/i)
  })

  it('returns Unknown fields when no commercial evidence exists', () => {
    const result = service.analyze(
      lead({
        company: null,
        sourceUrl: 'https://reddit.com/r/automation/post',
        postContent: 'A general discussion about manufacturing trends.',
      }),
    )
    assert.equal(result.channelType, 'unknown')
    assert.equal(result.companyName, 'Unknown')
    assert.equal(result.website, 'Unknown')
    assert.equal(result.cooperationStrategy, 'Unknown')
  })

  it('upserts the same profile on repeated discovery', async () => {
    let writes = 0
    const repository: ChannelDiscoveryRepository = {
      findLead: async () =>
        lead({
          postContent:
            'Authorized distributor selling industrial equipment.',
        }),
      findProfile: async () => null,
      upsertProfile: async (leadId, result) => {
        writes += 1
        return { id: 'channel-1', leadId, ...result }
      },
    }
    const idempotentService = new ChannelDiscoveryService(repository)

    const first = await idempotentService.discover('lead-1')
    const second = await idempotentService.discover('lead-1')

    assert.equal(writes, 2)
    assert.equal((first as { id: string }).id, 'channel-1')
    assert.equal((second as { id: string }).id, 'channel-1')
  })
})
