import { Router } from 'express'
import { readAIProviderConfig } from '../providers/ai-platform/ai-provider.factory.js'
import {
  listSalesAgentModelOptions,
  readOpenAISalesAgentConfig,
} from '../services/openai-sales-agent.service.js'
import { openAIRuntimeVerifier } from '../services/openai-runtime-verifier.service.js'
import { readHostedResearchConfig } from '../services/market-intelligence/market-web-research.service.js'

export const healthRouter = Router()

healthRouter.get('/', (_request, response) => {
  // Liveness must stay independent from every optional provider. Runtime
  // verification belongs to /capabilities and may perform bounded probes.
  response.status(200).json({ status: 'ok' })
})

healthRouter.get('/capabilities', (_request, response) => {
  const agentRuntimeProvider =
    process.env.AGENT_RUNTIME_PROVIDER?.trim().toLowerCase() || 'openai'
  if (agentRuntimeProvider === 'openai') void openAIRuntimeVerifier.verify()
  const market = readHostedResearchConfig()
  const sales = readAIProviderConfig()
  const agent = readOpenAISalesAgentConfig()
  const openaiRuntime = openAIRuntimeVerifier.getStatus()
  const exaEnabled = Boolean(process.env.EXA_API_KEY?.trim())
  const salesAIEnabled =
    ['qwen', 'glm', 'kimi', 'openai'].includes(sales.provider) &&
    Boolean(sales.apiKey && sales.baseUrl && sales.model)
  const salesAgentEnabled =
    agentRuntimeProvider === 'livekit'
      ? Boolean(process.env.LIVEKIT_AGENT_RUNTIME_URL?.trim())
      : Boolean(agent.apiKey && agent.baseUrl && agent.model)

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
        fallback: {
          enabled: true,
          provider: 'rule-based',
          model: 'rules-v1',
          cost: 'local-zero-api-cost',
        },
      },
      salesAgent: {
        enabled: salesAgentEnabled,
        provider: salesAgentEnabled ? agentRuntimeProvider : null,
        model: agentRuntimeProvider === 'livekit' ? 'livekit-bridge' : agent.model,
        reason: salesAgentEnabled
          ? 'ready'
          : agentRuntimeProvider === 'livekit'
            ? 'missing_runtime_configuration'
            : 'missing_api_key',
        models:
          agentRuntimeProvider === 'openai'
            ? listSalesAgentModelOptions(agent)
            : [],
        verification:
          agentRuntimeProvider === 'openai' ? openaiRuntime : null,
      },
      agentRuntime: {
        provider: agentRuntimeProvider,
        enabled: salesAgentEnabled,
        transport:
          agentRuntimeProvider === 'livekit' ? 'http-bridge' : 'in-process',
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
