import type {
  ProductUnderstandingProvider,
  ProductUnderstandingResult,
} from '../providers/product-understanding/product-understanding-provider.interface.js'
import { ruleBasedProductUnderstandingProvider } from '../providers/product-understanding/rule-based-product-understanding.provider.js'

export interface ProductUnderstandingResponse
  extends ProductUnderstandingResult {
  provider: string
}

export class ProductUnderstandingService {
  constructor(
    private readonly provider: ProductUnderstandingProvider =
      ruleBasedProductUnderstandingProvider,
  ) {}

  async understand(query: string): Promise<ProductUnderstandingResponse> {
    return {
      ...(await this.provider.understand(query)),
      provider: this.provider.name,
    }
  }
}

export const productUnderstanding = new ProductUnderstandingService()
