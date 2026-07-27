import type { SearchIntent } from '../providers/search-intent/search-intent-provider.interface.js'

export interface ExpandedKeyword {
  language: string
  query: string
}

export class SearchKeywordExpansionService {
  expand(intent: SearchIntent): ExpandedKeyword[] {
    const product =
      intent.product === 'Unknown' ? intent.industry : intent.product
    if (product === 'Unknown') return []

    const location =
      intent.country === 'Unknown' ? intent.region : intent.country
    const suffix = location === 'Unknown' ? '' : ` ${location}`
    const keywords: ExpandedKeyword[] = []

    if (intent.targetType === 'buyer' || intent.targetType === 'both') {
      keywords.push({
        language: 'en',
        query: this.buyerQuery(intent, product, suffix),
      })
    }
    if (intent.targetType === 'channel' || intent.targetType === 'both') {
      keywords.push({
        language: 'en',
        query: [
          product,
          intent.industry === 'Unknown' ? '' : intent.industry,
          this.englishChannelTerm(intent.relationship),
          'official company website',
          suffix,
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      })
    }

    if (intent.country === 'Germany') {
      if (intent.targetType === 'buyer' || intent.targetType === 'both') {
        keywords.push({
          language: 'de',
          query: `${this.germanProduct(product)} Einkäufer Deutschland`,
        })
      }
      if (intent.targetType === 'channel' || intent.targetType === 'both') {
        keywords.push({
          language: 'de',
          query: `${this.germanProduct(product)} ${this.germanChannelTerm(intent.relationship)} Deutschland`,
        })
      }
    }

    if (intent.country === 'China' || intent.language === 'zh') {
      const chineseProduct = this.chineseProduct(product)
      keywords.push({
        language: 'zh',
        query:
          intent.targetType === 'channel'
            ? `${intent.country === 'China' ? '中国' : ''}${chineseProduct}经销商 渠道合作`
            : `${intent.country === 'China' ? '中国' : ''}${chineseProduct}采购商`,
      })
    }

    return this.unique(keywords)
  }

  private buyerQuery(
    intent: SearchIntent,
    product: string,
    locationSuffix: string,
  ): string {
    const customerType = this.customerTypeTerm(intent)
    const industry =
      intent.industry === 'Unknown' ? '' : intent.industry
    const businessProblem =
      intent.businessProblem === 'Unknown' ? '' : intent.businessProblem
    const buyingSignals = intent.buyingSignals.slice(0, 2).join(' ')
    const productRelevance = this.productRelevanceTerm(product)

    return [
      industry,
      `end-user ${customerType}`,
      productRelevance,
      businessProblem,
      buyingSignals,
      'official company website',
      locationSuffix,
      '-vendor',
      '-supplier',
      '-reseller',
      '-distributor',
      '-case-study',
      '-whitepaper',
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private productRelevanceTerm(product: string): string {
    if (/industrial automation.*(?:saas|software)/i.test(product)) {
      return `${product} factory operations digital transformation`
    }
    if (/\bcrm\b.*\b(?:saas|software)\b/i.test(product)) {
      return `${product} customer relationship management adoption`
    }
    if (/\b(?:saas|software)\b/i.test(product)) {
      return `${product} adoption business operations`
    }
    return `${product} application`
  }

  private customerTypeTerm(intent: SearchIntent): string {
    const value = intent.customerType.toLowerCase()
    if (value.includes('manufacturer') || value.includes('manufacturing')) {
      return 'manufacturing companies'
    }
    if (
      value.includes('small business') ||
      value.includes('small compan') ||
      value.includes('smb') ||
      value.includes('sme')
    ) {
      return 'small businesses'
    }
    if (value.includes('factory operator')) return 'factory operators'
    if (value.includes('supplier')) return 'supplier companies'
    if (value.includes('logistics')) return 'logistics companies'
    if (value.includes('buyer') || value.includes('company')) {
      return 'companies'
    }
    return `${intent.customerType} companies`
  }

  private englishChannelTerm(relationship: string): string {
    return {
      system_integration: 'system integrator',
      distribution: 'authorized distributor',
      trade_cooperation: 'trading company',
      partnership: 'channel partner',
    }[relationship] ?? 'distributor channel partner'
  }

  private germanChannelTerm(relationship: string): string {
    return relationship === 'system_integration'
      ? 'Systemintegrator'
      : relationship === 'partnership'
        ? 'Vertriebspartner'
        : 'Händler'
  }

  private germanProduct(product: string): string {
    return {
      'packaging machinery': 'Verpackungsmaschinen',
      'industrial automation equipment': 'Industrieautomatisierung',
      'industrial robots': 'Industrieroboter',
      'medical equipment': 'Medizintechnik',
      'electronic components': 'Elektronikkomponenten',
      'solar panels': 'Solarmodule',
    }[product] ?? product
  }

  private chineseProduct(product: string): string {
    return {
      'packaging machinery': '包装机械',
      'industrial automation equipment': '自动化设备',
      'industrial robots': '工业机器人',
      'medical equipment': '医疗设备',
      'electronic components': '电子元件',
      'solar panels': '光伏组件',
      'software solutions': '软件解决方案',
    }[product] ?? product
  }

  private unique(keywords: ExpandedKeyword[]): ExpandedKeyword[] {
    const seen = new Set<string>()
    return keywords.filter((keyword) => {
      const key = `${keyword.language}:${keyword.query}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}

export const searchKeywordExpansion = new SearchKeywordExpansionService()
