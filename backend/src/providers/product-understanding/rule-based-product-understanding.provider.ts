import type {
  ProductUnderstandingProvider,
  ProductUnderstandingResult,
} from './product-understanding-provider.interface.js'

interface ProductProfile extends ProductUnderstandingResult {
  patterns: RegExp[]
}

const INDUSTRIAL_PLATFORMS = [
  'Google',
  'LinkedIn',
  'Industry directories',
  'Distributor directories',
]

const PROFILES: ProductProfile[] = [
  {
    patterns: [/自动包装机|自动包装设备|automatic packaging machine|automated packaging/i],
    productUnderstanding: {
      productName: 'Automatic Packaging Machinery',
      category: 'Industrial Automation Equipment',
      industry: 'Packaging Machinery',
      applications: [
        'Food packaging automation',
        'Pharmaceutical packaging',
        'Consumer goods packaging',
        'Factory automation',
        'Production line upgrades',
      ],
      keywords: [
        'automatic packaging machine',
        'packaging line automation',
        'food packaging equipment',
        'pharmaceutical packaging machinery',
        'end-of-line packaging automation',
      ],
      relatedProducts: [
        'Cartoning machines',
        'Filling machines',
        'Labeling machines',
        'Conveyors',
        'Case packers',
      ],
    },
    buyerPersona: [
      {
        customerType: 'Manufacturer',
        industry: 'Food and Beverage',
        companyType: 'Food processing factory',
        reason: 'Packaging throughput and consistency directly affect production capacity.',
        painPoints: ['Manual labor dependency', 'Packaging speed', 'Product changeover time'],
      },
      {
        customerType: 'Manufacturer',
        industry: 'Pharmaceutical',
        companyType: 'Pharmaceutical manufacturer',
        reason: 'Packaging operations require repeatability, traceability, and controlled handling.',
        painPoints: ['Compliance', 'Traceability', 'Line integration'],
      },
    ],
    recommendedRoles: [
      { role: 'Production Manager', department: 'Production', reason: 'Owns throughput and line performance.' },
      { role: 'Engineering Manager', department: 'Engineering', reason: 'Evaluates automation and integration feasibility.' },
      { role: 'Purchasing Manager', department: 'Procurement', reason: 'Manages supplier evaluation and commercial terms.' },
      { role: 'Factory Owner', department: 'Management', reason: 'Often owns capital-equipment decisions in smaller factories.' },
    ],
    searchStrategy: {
      buyerKeywords: [
        'food manufacturer packaging line expansion',
        'pharmaceutical factory packaging automation project',
        'manufacturer seeking automatic packaging equipment',
      ],
      channelKeywords: [
        'packaging machinery distributor',
        'packaging automation system integrator',
        'industrial equipment trading company',
      ],
      countries: ['Germany', 'United States', 'Mexico', 'Vietnam', 'Indonesia'],
      languages: ['English', 'German', 'Spanish', 'Vietnamese', 'Indonesian'],
      recommendedPlatforms: INDUSTRIAL_PLATFORMS,
    },
    salesPreparation: {
      buyingSignals: [
        'New packaging line project',
        'Factory expansion',
        'Production automation upgrade',
        'Hiring packaging or automation engineers',
        'Requests for equipment suppliers or quotations',
      ],
      customerPainPoints: [
        'Labor cost and availability',
        'Low packaging throughput',
        'Frequent downtime',
        'Integration with existing production lines',
      ],
      recommendedValueAngle: 'Improve throughput and packaging consistency while reducing integration and labor risk.',
    },
  },
  {
    patterns: [/工业机器人|industrial robots?|robotic automation/i],
    productUnderstanding: {
      productName: 'Industrial Robots',
      category: 'Industrial Automation Equipment',
      industry: 'Industrial Automation',
      applications: ['Welding', 'Material handling', 'Palletizing', 'Machine tending', 'Production line upgrades'],
      keywords: ['industrial robot', 'robotic automation', 'robotic palletizing', 'machine tending robot', 'factory automation'],
      relatedProducts: ['Robot controllers', 'End effectors', 'Machine vision', 'Safety systems', 'Conveyors'],
    },
    buyerPersona: [
      {
        customerType: 'Manufacturer',
        industry: 'Automotive and General Manufacturing',
        companyType: 'Production factory',
        reason: 'Robotics can address repetitive processes, capacity constraints, and safety requirements.',
        painPoints: ['Labor shortages', 'Cycle time', 'Workplace safety', 'Integration risk'],
      },
    ],
    recommendedRoles: [
      { role: 'Automation Manager', department: 'Engineering', reason: 'Owns factory automation programs.' },
      { role: 'Engineering Manager', department: 'Engineering', reason: 'Validates technical fit and integration.' },
      { role: 'Purchasing Manager', department: 'Procurement', reason: 'Evaluates suppliers and commercial terms.' },
      { role: 'Plant Manager', department: 'Operations', reason: 'Owns plant output and operational performance.' },
    ],
    searchStrategy: {
      buyerKeywords: ['factory robotics upgrade project', 'manufacturer seeking robotic automation', 'industrial robot procurement'],
      channelKeywords: ['industrial robot system integrator', 'automation distributor', 'robotics solution partner'],
      countries: ['United States', 'Germany', 'Mexico', 'India', 'Vietnam'],
      languages: ['English', 'German', 'Spanish', 'Hindi', 'Vietnamese'],
      recommendedPlatforms: INDUSTRIAL_PLATFORMS,
    },
    salesPreparation: {
      buyingSignals: ['Automation project announcement', 'Factory expansion', 'Robotics engineering recruitment', 'System integrator search'],
      customerPainPoints: ['Labor shortages', 'Production consistency', 'Integration complexity', 'Safety'],
      recommendedValueAngle: 'Connect automation performance with integration feasibility, uptime, and measurable production outcomes.',
    },
  },
  {
    patterns: [/\bsaas\b|软件即服务|云软件|cloud software|subscription software/i],
    productUnderstanding: {
      productName: 'SaaS Software',
      category: 'Business Software',
      industry: 'Software',
      applications: ['Workflow automation', 'Team collaboration', 'Data management', 'Customer operations', 'Business analytics'],
      keywords: ['B2B SaaS platform', 'workflow automation software', 'cloud business software', 'subscription software'],
      relatedProducts: ['API integrations', 'Data connectors', 'Analytics tools', 'Identity management', 'Implementation services'],
    },
    buyerPersona: [
      {
        customerType: 'Business user',
        industry: 'Cross-industry',
        companyType: 'Digitally enabled company',
        reason: 'Teams adopt SaaS to standardize processes and reduce manual work.',
        painPoints: ['Fragmented workflows', 'Manual reporting', 'Poor system integration', 'User adoption'],
      },
    ],
    recommendedRoles: [
      { role: 'Head of Operations', department: 'Operations', reason: 'Owns workflow efficiency.' },
      { role: 'IT Director', department: 'Information Technology', reason: 'Evaluates security and integration.' },
      { role: 'Department Head', department: 'Business Function', reason: 'Owns the business use case and adoption.' },
      { role: 'Procurement Manager', department: 'Procurement', reason: 'Manages software vendor terms in larger organizations.' },
    ],
    searchStrategy: {
      buyerKeywords: ['companies evaluating workflow automation SaaS', 'business software replacement project', 'SaaS procurement requirements'],
      channelKeywords: ['SaaS implementation partner', 'software reseller', 'cloud consulting partner'],
      countries: ['United States', 'United Kingdom', 'Germany', 'Singapore', 'Australia'],
      languages: ['English', 'German'],
      recommendedPlatforms: ['Google', 'LinkedIn', 'Software directories', 'Technology communities'],
    },
    salesPreparation: {
      buyingSignals: ['Software replacement', 'Digital transformation project', 'Integration requirements', 'Operations hiring'],
      customerPainPoints: ['Implementation effort', 'Integration', 'Security review', 'User adoption'],
      recommendedValueAngle: 'Connect the software to a measurable workflow outcome while reducing implementation and adoption risk.',
    },
  },
  {
    patterns: [/护肤品|化妆品|美妆|skincare|cosmetics?|beauty products?/i],
    productUnderstanding: {
      productName: 'Beauty and Skincare Products',
      category: 'Consumer Products',
      industry: 'Beauty and Personal Care',
      applications: ['Daily skincare', 'Beauty retail', 'Social commerce', 'Private-label distribution'],
      keywords: ['skincare products', 'beauty brand', 'cosmetics wholesale', 'private label skincare'],
      relatedProducts: ['Facial cleansers', 'Serums', 'Creams', 'Sunscreen', 'Beauty accessories'],
    },
    buyerPersona: [
      {
        customerType: 'Retail buyer',
        industry: 'Beauty Retail',
        companyType: 'Retailer, marketplace seller, or beauty distributor',
        reason: 'Consumer product growth depends on assortment fit, margin, repeat demand, and channel reach.',
        painPoints: ['Product differentiation', 'Inventory risk', 'Consumer acquisition cost', 'Compliance'],
      },
    ],
    recommendedRoles: [
      { role: 'Category Buyer', department: 'Merchandising', reason: 'Selects products and manages assortment.' },
      { role: 'Purchasing Manager', department: 'Procurement', reason: 'Handles supply and commercial terms.' },
      { role: 'Brand Owner', department: 'Management', reason: 'Owns product positioning in smaller brands.' },
      { role: 'E-commerce Manager', department: 'E-commerce', reason: 'Evaluates online channel fit and demand.' },
    ],
    searchStrategy: {
      buyerKeywords: ['beauty retailer sourcing skincare products', 'cosmetics wholesale buyers', 'skincare marketplace sellers'],
      channelKeywords: ['beauty products distributor', 'cosmetics reseller', 'skincare import trading company'],
      countries: ['United States', 'United Kingdom', 'United Arab Emirates', 'Indonesia', 'Thailand'],
      languages: ['English', 'Arabic', 'Indonesian', 'Thai'],
      recommendedPlatforms: ['Instagram', 'TikTok', 'Google', 'Marketplaces', 'Beauty directories'],
    },
    salesPreparation: {
      buyingSignals: ['New product assortment', 'Distributor search', 'Retail category expansion', 'Private-label sourcing'],
      customerPainPoints: ['Margin', 'Inventory turnover', 'Brand differentiation', 'Regulatory compliance'],
      recommendedValueAngle: 'Lead with assortment differentiation, channel margin, repeat-purchase potential, and supply reliability.',
    },
  },
]

export class RuleBasedProductUnderstandingProvider
  implements ProductUnderstandingProvider
{
  readonly name = 'rule-based-product-understanding-v1'

  async understand(query: string): Promise<ProductUnderstandingResult> {
    const profile = PROFILES.find((candidate) =>
      candidate.patterns.some((pattern) => pattern.test(query)),
    )
    if (profile) return this.withoutPatterns(profile)
    return this.fallback(query)
  }

  private withoutPatterns(profile: ProductProfile): ProductUnderstandingResult {
    const { patterns: _patterns, ...result } = profile
    void _patterns
    return structuredClone(result)
  }

  private fallback(query: string): ProductUnderstandingResult {
    const productName = query.trim() || 'Unknown'
    return {
      productUnderstanding: {
        productName,
        category: 'Unknown',
        industry: 'Unknown',
        applications: [],
        keywords: [productName],
        relatedProducts: [],
      },
      buyerPersona: [],
      recommendedRoles: [],
      searchStrategy: {
        buyerKeywords: [`${productName} buyers`],
        channelKeywords: [`${productName} distributor`],
        countries: [],
        languages: this.language(query),
        recommendedPlatforms: ['Google', 'LinkedIn'],
      },
      salesPreparation: {
        buyingSignals: [],
        customerPainPoints: [],
        recommendedValueAngle: 'Validate the product application and customer outcome before selecting a sales angle.',
      },
    }
  }

  private language(query: string): string[] {
    return /[\u4e00-\u9fff]/.test(query) ? ['Chinese', 'English'] : ['English']
  }
}

export const ruleBasedProductUnderstandingProvider =
  new RuleBasedProductUnderstandingProvider()
