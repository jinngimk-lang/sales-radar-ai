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
        query: `${product} procurement buyers${suffix}`.trim(),
      })
    }
    if (intent.targetType === 'channel' || intent.targetType === 'both') {
      keywords.push({
        language: 'en',
        query: `${product} ${this.englishChannelTerm(intent.relationship)}${suffix}`.trim(),
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
