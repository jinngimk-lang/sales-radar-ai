import { Router } from 'express'
import { readAIProviderConfig } from '../providers/ai-platform/ai-provider.factory.js'
import { readOpenAISalesAgentConfig } from '../services/openai-sales-agent.service.js'
import { readHostedResearchConfig } from '../services/market-intelligence/market-web-research.service.js'

export const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

healthRouter.get('/capabilities', (_request, response) => {
  const market = readHostedResearchConfig()
  const sales = readAIProviderConfig()
  const agent = readOpenAISalesAgentConfig()
  const exaEnabled = Boolean(process.env.EXA_API_KEY?.trim())
  const salesAIEnabled =
    ['qwen', 'openai'].includes(sales.provider) &&
    Boolean(sales.apiKey && sales.baseUrl && sales.model)
  const salesAgentEnabled = Boolean(agent.apiKey && agent.baseUrl && agent.model)

  response.json({
    data: {
      marketResearch: {
        enabled: Boolean(market) || exaEnabled,
        provider: market?.provider ?? (exaEnabled ? 'exa-web' : null),
        model: market?.model ?? (exaEnabled ? 'exa-web-search' : null),
      },
      salesAI: {
        enabled: salesAIEnabled,
        provider: salesAIEnabled ? sales.provider : 'rule-based',
        model: salesAIEnabled ? sales.model : 'rules-v1',
      },
      salesAgent: {
        enabled: salesAgentEnabled,
        provider: salesAgentEnabled ? 'openai' : null,
        model: salesAgentEnabled ? agent.model : null,
      },
      publicContactDiscovery: {
        enabled: true,
        provider: 'first-party-web',
        model: null,
      },
      salesDiscovery: {
        enabled: exaEnabled,
        provider: 'agent-reach/exa',
        model: null,
      },
    },
  })
})
