import { Router } from 'express'
import { readAIProviderConfig } from '../providers/ai-platform/ai-provider.factory.js'
import { readHostedResearchConfig } from '../services/market-intelligence/market-web-research.service.js'

export const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

healthRouter.get('/capabilities', (_request, response) => {
  const market = readHostedResearchConfig()
  const sales = readAIProviderConfig()
  const salesAIEnabled =
    sales.provider === 'qwen' &&
    Boolean(sales.apiKey && sales.baseUrl && sales.model)

  response.json({
    data: {
      marketResearch: {
        enabled: Boolean(market),
        provider: market?.provider ?? null,
        model: market?.model ?? null,
      },
      salesAI: {
        enabled: salesAIEnabled,
        provider: salesAIEnabled ? sales.provider : 'rule-based',
        model: salesAIEnabled ? sales.model : 'rules-v1',
      },
      publicContactDiscovery: {
        enabled: true,
        provider: 'first-party-web',
        model: null,
      },
      salesDiscovery: {
        enabled: Boolean(process.env.EXA_API_KEY?.trim()),
        provider: 'agent-reach/exa',
        model: null,
      },
    },
  })
})
