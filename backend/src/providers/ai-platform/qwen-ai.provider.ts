import {
  OpenAICompatibleAIProvider,
  type OpenAICompatibleAIProviderConfig,
} from './openai-compatible-ai.provider.js'

export interface QwenAIProviderConfig
  extends Omit<OpenAICompatibleAIProviderConfig, 'name'> {}

export class QwenAIProvider extends OpenAICompatibleAIProvider {
  constructor(config: QwenAIProviderConfig, fetcher: typeof fetch = fetch) {
    super({ ...config, name: 'qwen' }, fetcher)
  }
}
