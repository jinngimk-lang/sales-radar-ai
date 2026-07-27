import type {
  SearchIntent,
  SearchIntentProvider,
  SearchTargetType,
} from './search-intent-provider.interface.js'

const UNKNOWN = 'Unknown'

const COUNTRY_RULES = [
  { pattern: /\b(germany|deutschland)\b|德国/i, country: 'Germany', region: 'Europe' },
  { pattern: /\b(united states|usa|u\.s\.)\b|美国/i, country: 'United States', region: 'USA' },
  { pattern: /\b(china|prc)\b|中国/i, country: 'China', region: 'China' },
  { pattern: /\b(france)\b|法国/i, country: 'France', region: 'Europe' },
  { pattern: /\b(italy)\b|意大利/i, country: 'Italy', region: 'Europe' },
  { pattern: /\b(india)\b|印度/i, country: 'India', region: 'Asia' },
  { pattern: /\b(vietnam)\b|越南/i, country: 'Vietnam', region: 'SoutheastAsia' },
  { pattern: /\b(uae|united arab emirates)\b|阿联酋/i, country: 'United Arab Emirates', region: 'MiddleEast' },
]

const REGION_RULES = [
  { pattern: /\b(europe|european|eu)\b|欧洲|欧盟/i, region: 'Europe' },
]

const PRODUCT_RULES = [
  { pattern: /industrial automation\s+(?:saas|software)|(?:saas|software)\s+for\s+industrial automation/i, product: 'industrial automation SaaS', industry: 'Industrial Manufacturing' },
  { pattern: /\b(?:crm|customer relationship management)\s+(?:saas|software)\b|\bsaas\s+(?:crm|for customer relationship management)\b/i, product: 'CRM SaaS', industry: 'Business Software' },
  { pattern: /\bb2b\s+(?:saas|software)\b/i, product: 'B2B software', industry: 'Software' },
  { pattern: /自动化设备|industrial automation(?: equipment)?/i, product: 'industrial automation equipment', industry: 'Industrial Automation' },
  { pattern: /包装机械|packaging machin(?:e|ery)/i, product: 'packaging machinery', industry: 'Packaging Machinery' },
  { pattern: /工业机器人|industrial robots?/i, product: 'industrial robots', industry: 'Industrial Automation' },
  { pattern: /太阳能板|光伏组件|solar panels?|photovoltaic modules?/i, product: 'solar panels', industry: 'Renewable Energy' },
  { pattern: /医疗设备|medical devices?|medical equipment/i, product: 'medical equipment', industry: 'Medical Equipment' },
  { pattern: /电子元件|electronic components?/i, product: 'electronic components', industry: 'Electronics' },
  { pattern: /\bsaas\b/i, product: 'SaaS software', industry: 'Software' },
  { pattern: /\bsoftware\b/i, product: 'software', industry: 'Software' },
]

export class RuleBasedSearchIntentProvider implements SearchIntentProvider {
  readonly name = 'rule-based-search-intent-v1'

  async parse(input: string): Promise<SearchIntent> {
    const normalized = input.trim()
    const buyerSignal =
      /找客户|寻找客户|买家|采购商|采购方|终端客户|进口商|\b(buyer|buyers|customer|customers|purchaser|procurement|importer)\b/i.test(
        normalized,
      )
    const channelSignal =
      /代理商|经销商|渠道商|渠道伙伴|合作伙伴|系统集成商|贸易公司|\b(distributors?|resellers?|channel partners?|partner networks?|system integrators?|trading companies)\b/i.test(
        normalized,
      )
    const marketExploration =
      /市场|market|market entry|market access/i.test(normalized)
    const targetType: SearchTargetType =
      buyerSignal && channelSignal
        ? 'both'
        : channelSignal
          ? 'channel'
          : buyerSignal
            ? 'buyer'
            : marketExploration
              ? 'both'
              : 'buyer'

    const countryRule = COUNTRY_RULES.find((rule) => rule.pattern.test(normalized))
    const regionRule = REGION_RULES.find((rule) => rule.pattern.test(normalized))
    const productRule = PRODUCT_RULES.find((rule) => rule.pattern.test(normalized))

    return {
      targetType,
      customerType: this.customerType(normalized, targetType),
      industry: productRule?.industry ?? UNKNOWN,
      product: productRule?.product ?? this.fallbackProduct(normalized),
      region: countryRule?.region ?? regionRule?.region ?? UNKNOWN,
      country: countryRule?.country ?? UNKNOWN,
      relationship: this.relationship(normalized, targetType),
      language: this.language(normalized),
      businessProblem: this.businessProblem(normalized),
      buyingSignals: this.buyingSignals(normalized),
    }
  }

  private businessProblem(input: string): string {
    const rules: Array<[RegExp, string]> = [
      [/\b(downtime|unplanned downtime)\b/i, 'reduce production downtime'],
      [/\b(manual process|manual workflow)\b/i, 'replace manual workflows'],
      [/\b(efficiency|productivity|throughput)\b/i, 'improve operational efficiency'],
      [/\b(integration|legacy system)\b/i, 'integrate legacy systems'],
      [/\b(cost reduction|reduce costs?|lower costs?)\b/i, 'reduce operating costs'],
      [/\b(digital transformation|digitization|digitalization)\b/i, 'modernize operations'],
    ]
    return rules.find(([pattern]) => pattern.test(input))?.[1] ?? UNKNOWN
  }

  private buyingSignals(input: string): string[] {
    const rules: Array<[RegExp, string]> = [
      [/\b(expansion|expanding|new factory|new plant)\b/i, 'factory expansion'],
      [/\b(upgrade|modernization|modernisation)\b/i, 'technology upgrade'],
      [/\b(rfq|request for quotation|tender)\b/i, 'active RFQ or tender'],
      [/\b(evaluating|evaluation|shortlisting)\b/i, 'solution evaluation'],
      [/\b(hiring|recruiting)\b/i, 'relevant hiring activity'],
    ]
    return rules
      .filter(([pattern]) => pattern.test(input))
      .map(([, signal]) => signal)
  }

  private relationship(input: string, targetType: SearchTargetType): string {
    if (/系统集成商|\bsystem integrators?\b/i.test(input)) return 'system_integration'
    if (/代理商|经销商|\b(distributor|reseller)\b/i.test(input)) return 'distribution'
    if (/合作伙伴|\b(channel partner|partner)\b/i.test(input)) return 'partnership'
    if (/贸易公司|\btrading company\b/i.test(input)) return 'trade_cooperation'
    if (/采购商|采购方|\b(procurement|purchaser)\b/i.test(input)) return 'procurement'
    if (/进口商|\bimporter\b/i.test(input)) return 'import'
    return targetType === 'channel'
      ? 'channel_cooperation'
      : targetType === 'both'
        ? 'market_development'
        : 'sales_opportunity'
  }

  private customerType(
    input: string,
    targetType: SearchTargetType,
  ): string {
    if (targetType === 'channel') return 'Channel partners'
    if (targetType === 'both') return 'Buyers and channel partners'
    if (
      /\b(manufacturing companies|manufacturers?|factory operators?|industrial enterprises?)\b/i.test(
        input,
      )
    ) {
      return 'Manufacturing companies'
    }
    if (/\b(small businesses|small companies|smbs?|smes?)\b/i.test(input)) {
      return 'Small businesses'
    }
    if (/\b(factory|factories|plants?)\b/i.test(input)) {
      return 'Factory operators'
    }
    return 'Buyer companies'
  }

  private language(input: string): string {
    if (/[\u4e00-\u9fff]/.test(input)) return 'zh'
    if (/[äöüß]|\b(deutschland|händler)\b/i.test(input)) return 'de'
    return 'en'
  }

  private fallbackProduct(input: string): string {
    const cleaned = input
      .replace(
        /找客户|寻找客户|寻找|查找|找|代理商|经销商|渠道商|渠道伙伴|合作伙伴|采购商|采购方|买家|市场|公司|企业/gi,
        ' ',
      )
      .replace(
        /\b(find|looking for|search for|buyers?|customers?|distributors?|resellers?|partners?|market|companies)\b/gi,
        ' ',
      )
      .replace(
        /德国|美国|中国|法国|意大利|印度|越南|阿联酋|欧洲|欧盟|\b(germany|usa|united states|china|france|italy|india|vietnam|uae|europe|european|eu)\b/gi,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned || UNKNOWN
  }
}

export const ruleBasedSearchIntentProvider =
  new RuleBasedSearchIntentProvider()
