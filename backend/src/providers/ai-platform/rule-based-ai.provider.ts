import type { OutreachContext } from '../ai/ai-provider.interface.js'
import { ruleBasedOutreachProvider } from '../ai/rule-based-outreach.provider.js'
import { AITaskType } from './ai-task-type.js'
import {
  AIProviderUnavailableError,
  type AIGenerateRequest,
  type AIGenerateResult,
  type AIProvider,
} from './ai-provider.interface.js'

export class RuleBasedAIProvider implements AIProvider {
  readonly name = 'rule-based'
  readonly model = 'rules-v1'

  async generate(request: AIGenerateRequest): Promise<AIGenerateResult> {
    if (request.taskType === AITaskType.OUTREACH_GENERATION) {
      const outreachContext = request.context.outreachContext
      if (!outreachContext || typeof outreachContext !== 'object') {
        throw new AIProviderUnavailableError(
          this.name,
          'Outreach context is required for the rule-based provider',
        )
      }
      return {
        output: await ruleBasedOutreachProvider.generateOutreach(
          outreachContext as OutreachContext,
        ),
        provider: this.name,
        model: this.model,
      }
    }

    if ('fallbackResponse' in request.context) {
      return {
        output: request.context.fallbackResponse,
        provider: this.name,
        model: this.model,
      }
    }

    throw new AIProviderUnavailableError(
      this.name,
      `No rule-based handler is registered for ${request.taskType}`,
    )
  }
}

export const ruleBasedAIProvider = new RuleBasedAIProvider()
