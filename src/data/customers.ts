import type { Customer, CustomerType, RecommendedAction } from '@/types'

/**
 * 模拟客户数据集
 * 覆盖工业制造、消费电子、医疗健康、SaaS 软件、贸易出口、美容行业六大行业。
 * 未来接入真实 API 时，仅需替换 services/api.ts 中的实现，数据结构保持一致。
 */

/** 原始数据（customerType / recommendedAction 可选，由下方推导函数补全） */
interface RawCustomer extends Omit<Customer, 'customerType' | 'recommendedAction'> {
  customerType?: CustomerType
  recommendedAction?: RecommendedAction
}

/** 根据意向类型 / 平台推导客户类型 */
function deriveCustomerType(c: RawCustomer): CustomerType {
  if (c.customerType) return c.customerType
  const intent = c.analysis.intentType
  if (intent.includes('渠道') || intent.includes('代理') || intent.includes('分销')) return 'Agent'
  if (c.platform === 'LinkedIn') return 'Company'
  if (c.analysis.intentScore >= 70) return 'Buyer'
  return 'Individual'
}

/** 根据意向评分推导 AI 推荐行动 */
function deriveAction(c: RawCustomer): RecommendedAction {
  if (c.recommendedAction) return c.recommendedAction
  const s = c.analysis.intentScore
  if (s >= 85) return 'contact_now'
  if (s >= 60) return 'follow_up'
  if (s >= 45) return 'monitor'
  return 'nurture'
}

const RAW_CUSTOMERS: RawCustomer[] = [
  // ===== 工业制造 Industrial Manufacturing =====
  {
    id: 'cus_001',
    username: 'factory_automator',
    displayName: 'Marcus Reyes',
    initials: 'MR',
    platform: 'Reddit',
    postContent:
      "Looking for automation solutions for factory — we're scaling production and need reliable industrial robots for our assembly line. Budget approved for Q3 procurement. Any solid vendors?",
    postedAt: '2 小时前',
    country: '美国',
    region: 'USA',
    industry: 'IndustrialManufacturing',
    analysis: {
      intentType: '采购需求',
      intentScore: 92,
      tags: ['#automation', '#factory', '#robotics', '#procurement'],
      suggestion: '建议主动联系，客户已批准 Q3 采购预算，决策窗口紧迫。',
      background: '中型制造企业，正在扩大产线，年采购规模约 50 万美元。',
      need: '寻找可靠的工业机器人与装配线自动化设备。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，重点突出案例与交付周期。',
    },
    sourceUrl: 'https://reddit.com/r/manufacturing/automator',
    profileUrl: 'https://reddit.com/user/factory_automator',
  },
  {
    id: 'cus_002',
    username: 'precision_eng_david',
    displayName: 'David Müller',
    initials: 'DM',
    platform: 'LinkedIn',
    postContent:
      'Our precision engineering shop is upgrading CNC equipment. Seeking suppliers of 5-axis machining centers with after-sales support in Europe. DM with specs.',
    postedAt: '5 小时前',
    country: '德国',
    region: 'Europe',
    industry: 'IndustrialManufacturing',
    analysis: {
      intentType: '采购需求',
      intentScore: 88,
      tags: ['#CNC', '#machining', '#precision', '#engineering'],
      suggestion: '高价值 B2B 线索，建议立即跟进并提供欧洲售后方案。',
      background: '德国精密加工企业，设备更新周期明确。',
      need: '采购五轴加工中心，重视售后支持。',
      purchaseProbability: 'high',
      salesStrategy: 'LinkedIn 私信开发，附产品技术参数。',
    },
    sourceUrl: 'https://linkedin.com/feed/precision-eng-david',
    profileUrl: 'https://linkedin.com/in/david-muller',
  },
  {
    id: 'cus_003',
    username: 'warehouse_ops_jen',
    displayName: 'Jennifer Cole',
    initials: 'JC',
    platform: 'X',
    postContent:
      'Need recommendations for warehouse automation — AGVs and palletizing robots. Scaling to 3 new DCs this year. Who should I talk to?',
    postedAt: '1 天前',
    country: '美国',
    region: 'USA',
    industry: 'IndustrialManufacturing',
    analysis: {
      intentType: '采购需求',
      intentScore: 85,
      tags: ['#warehouse', '#AGV', '#logistics', '#automation'],
      suggestion: '多仓扩张期客户，单笔订单潜力大。',
      background: '物流仓储运营负责人，年内新建 3 个配送中心。',
      need: 'AGV 与码垛机器人批量采购。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，强调多仓部署能力。',
    },
    sourceUrl: 'https://x.com/warehouse_ops_jen/status/123',
    profileUrl: 'https://x.com/warehouse_ops_jen',
  },
  {
    id: 'cus_004',
    username: 'cn_factory_boss',
    displayName: '陈志强',
    initials: '陈',
    platform: 'Xiaohongshu',
    postContent: '工厂要上智能产线，求推荐靠谱的工业自动化方案商，最好是能整体交付的，长三角优先。',
    postedAt: '3 小时前',
    country: '中国',
    region: 'China',
    industry: 'IndustrialManufacturing',
    analysis: {
      intentType: '采购需求',
      intentScore: 78,
      tags: ['#智能制造', '#自动化', '#工厂', '#长三角'],
      suggestion: '本地化需求明确，优先提供长三角交付案例。',
      background: '长三角民营制造老板，关注整体交付能力。',
      need: '寻找能整体交付的智能产线方案商。',
      purchaseProbability: 'medium',
      salesStrategy: '中文沟通，可上门拜访演示。',
    },
    sourceUrl: 'https://xiaohongshu.com/cn_factory_boss',
    profileUrl: 'https://xiaohongshu.com/user/cn_factory_boss',
  },

  // ===== 消费电子 Consumer Electronics =====
  {
    id: 'cus_005',
    username: 'tech_reviewer_kai',
    displayName: 'Kai Tanaka',
    initials: 'KT',
    platform: 'YouTube',
    postContent:
      "Reviewing the latest consumer electronics — if you make smart home gadgets, audio gear, or wearables, hit me up. Always looking for innovative products to feature.",
    postedAt: '6 小时前',
    country: '日本',
    region: 'SoutheastAsia',
    industry: 'ConsumerElectronics',
    analysis: {
      intentType: '渠道合作',
      intentScore: 68,
      tags: ['#techreview', '#smarthome', '#audio', '#wearables'],
      suggestion: 'KOL 渠道线索，适合通过测评合作建立品牌曝光。',
      background: '消费电子领域头部测评博主，粉丝量大。',
      need: '寻找有创新性的消费电子产品进行测评。',
      purchaseProbability: 'medium',
      salesStrategy: '英文邮件开发，提供样品与评测 brief。',
    },
    sourceUrl: 'https://youtube.com/tech_reviewer_kai',
    profileUrl: 'https://youtube.com/@tech_reviewer_kai',
  },
  {
    id: 'cus_006',
    username: 'gadget_wholesaler',
    displayName: 'Ahmed Al-Farsi',
    initials: 'AF',
    platform: 'LinkedIn',
    postContent:
      'Distributing consumer electronics across the Middle East. Looking for new suppliers of TWS earbuds and power banks — competitive pricing required, MOQ flexible.',
    postedAt: '8 小时前',
    country: '阿联酋',
    region: 'MiddleEast',
    industry: 'ConsumerElectronics',
    analysis: {
      intentType: '采购需求',
      intentScore: 90,
      tags: ['#wholesale', '#TWS', '#powerbank', '#distribution'],
      suggestion: '高意向区域分销商，订单稳定且量大，建议立即报价。',
      background: '中东消费电子区域分销商，渠道网络覆盖海湾国家。',
      need: '采购 TWS 耳机与充电宝，价格敏感度高。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，附阶梯报价表。',
    },
    sourceUrl: 'https://linkedin.com/feed/gadget-wholesaler',
    profileUrl: 'https://linkedin.com/in/ahmed-alfarsi',
  },
  {
    id: 'cus_007',
    username: 'phone_case_seller',
    displayName: 'Priya Sharma',
    initials: 'PS',
    platform: 'Instagram',
    postContent:
      'Running an online accessories store in India. Need bulk suppliers for premium phone cases and screen protectors. Reliable shipping a must!',
    postedAt: '12 小时前',
    country: '印度',
    region: 'SoutheastAsia',
    industry: 'ConsumerElectronics',
    analysis: {
      intentType: '采购需求',
      intentScore: 72,
      tags: ['#accessories', '#phonecase', '#wholesale', '#india'],
      suggestion: '中小批量采购商，关注物流时效。',
      background: '印度电商配件店主，月采购量稳定。',
      need: '批量采购高端手机壳与钢化膜。',
      purchaseProbability: 'medium',
      salesStrategy: '英文邮件开发，强调发货与售后。',
    },
    sourceUrl: 'https://instagram.com/phone_case_seller',
    profileUrl: 'https://instagram.com/phone_case_seller',
  },
  {
    id: 'cus_008',
    username: 'eu_retail_buyer',
    displayName: 'Sophie Laurent',
    initials: 'SL',
    platform: 'Facebook',
    postContent:
      'Buying for a retail chain in France. Interested in sourcing smart home devices and IoT products for our 2026 catalog. Send catalogues please.',
    postedAt: '1 天前',
    country: '法国',
    region: 'Europe',
    industry: 'ConsumerElectronics',
    analysis: {
      intentType: '采购需求',
      intentScore: 84,
      tags: ['#smarthome', '#IoT', '#retail', '#sourcing'],
      suggestion: '欧洲连锁零售买手，2026 目录采购周期明确。',
      background: '法国零售连锁买手，覆盖上百家门店。',
      need: '为 2026 产品目录采购智能家居与 IoT 产品。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，提供 CE 认证与目录。',
    },
    sourceUrl: 'https://facebook.com/eu-retail-buyer',
    profileUrl: 'https://facebook.com/sophie.laurent',
  },

  // ===== 医疗健康 Medical Health =====
  {
    id: 'cus_009',
    username: 'clinic_director',
    displayName: 'Dr. Emily Carter',
    initials: 'EC',
    platform: 'LinkedIn',
    postContent:
      'Expanding our clinic network. Need reliable suppliers of medical-grade devices — patient monitors, ultrasound, and ECG machines. ISO 13485 preferred.',
    postedAt: '4 小时前',
    country: '美国',
    region: 'USA',
    industry: 'MedicalHealth',
    analysis: {
      intentType: '采购需求',
      intentScore: 95,
      tags: ['#medical', '#healthcare', '#ISO13485', '#devices'],
      suggestion: '顶级高意向线索，资质门槛清晰，建议优先报价。',
      background: '美国连锁诊所负责人，多院扩建中。',
      need: '采购医用监护仪、超声、心电图机等设备。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，附 ISO 13485 证书与 FDA 注册。',
    },
    sourceUrl: 'https://linkedin.com/feed/clinic-director',
    profileUrl: 'https://linkedin.com/in/emily-carter-md',
  },
  {
    id: 'cus_010',
    username: 'home_care_owner',
    displayName: 'Robert Hayes',
    initials: 'RH',
    platform: 'Reddit',
    postContent:
      "Running a home healthcare service. Looking to source portable oxygen concentrators and mobility aids for elderly patients. Need bulk pricing.",
    postedAt: '10 小时前',
    country: '美国',
    region: 'USA',
    industry: 'MedicalHealth',
    analysis: {
      intentType: '采购需求',
      intentScore: 80,
      tags: ['#homecare', '#elderly', '#oxygen', '#mobility'],
      suggestion: '居家养老细分赛道，复购需求强。',
      background: '居家医疗服务机构运营者。',
      need: '采购便携制氧机与助行器具。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，突出适老化设计。',
    },
    sourceUrl: 'https://reddit.com/r/healthcare/home-care-owner',
    profileUrl: 'https://reddit.com/user/home_care_owner',
  },
  {
    id: 'cus_011',
    username: 'medspa_manager',
    displayName: 'Isabella Rossi',
    initials: 'IR',
    platform: 'Instagram',
    postContent:
      'Managing a premium med-spa. Want to upgrade our aesthetic devices — laser, RF microneedling, body contouring. Open to demos!',
    postedAt: '1 天前',
    country: '意大利',
    region: 'Europe',
    industry: 'MedicalHealth',
    analysis: {
      intentType: '采购需求',
      intentScore: 82,
      tags: ['#medspa', '#laser', '#aesthetic', '#rf'],
      suggestion: '高端医美机构，客单价高，设备预算充足。',
      background: '意大利高端医美机构运营经理。',
      need: '升级激光、射频微针、身体塑形设备。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，提供现场演示安排。',
    },
    sourceUrl: 'https://instagram.com/medspa_manager',
    profileUrl: 'https://instagram.com/medspa_manager',
  },

  // ===== SaaS 软件 SaaS Software =====
  {
    id: 'cus_012',
    username: 'startup_pm_lisa',
    displayName: 'Lisa Chen',
    initials: 'LC',
    platform: 'X',
    postContent:
      'Our startup needs an affordable CRM that integrates with our existing tools. Open source preferred. Anyone using something they love? #startup #crm',
    postedAt: '3 小时前',
    country: '新加坡',
    region: 'SoutheastAsia',
    industry: 'SaaSSoftware',
    analysis: {
      intentType: '采购需求',
      intentScore: 76,
      tags: ['#CRM', '#startup', '#opensource', '#integration'],
      suggestion: '初创团队选型阶段，适合免费试用转化。',
      background: '新加坡初创公司产品经理，关注性价比与集成。',
      need: '采购可集成的、价格友好的 CRM 系统。',
      purchaseProbability: 'medium',
      salesStrategy: '英文私信开发，提供免费试用与集成方案。',
    },
    sourceUrl: 'https://x.com/startup_pm_lisa/status/456',
    profileUrl: 'https://x.com/startup_pm_lisa',
  },
  {
    id: 'cus_013',
    username: 'cto_oliver',
    displayName: 'Oliver Bennett',
    initials: 'OB',
    platform: 'LinkedIn',
    postContent:
      'Evaluating AI-powered analytics platforms for our SaaS product. Need something with strong API, real-time dashboards, and reasonable pricing for 50 seats.',
    postedAt: '7 小时前',
    country: '英国',
    region: 'Europe',
    industry: 'SaaSSoftware',
    analysis: {
      intentType: '采购需求',
      intentScore: 88,
      tags: ['#analytics', '#AI', '#API', '#SaaS'],
      suggestion: '决策人级别线索，需求明确，建议产品 demo。',
      background: '英国 SaaS 公司 CTO，负责技术选型。',
      need: '采购 AI 数据分析平台，要求强 API 与实时看板。',
      purchaseProbability: 'high',
      salesStrategy: 'LinkedIn 私信开发，安排产品演示。',
    },
    sourceUrl: 'https://linkedin.com/feed/cto-oliver',
    profileUrl: 'https://linkedin.com/in/oliver-bennett-cto',
  },
  {
    id: 'cus_014',
    username: 'agency_owner_tom',
    displayName: 'Tom Walker',
    initials: 'TW',
    platform: 'Reddit',
    postContent:
      'Running a marketing agency. Need a tool to automate lead generation and client reporting. Budget set. Drop your recommendations below!',
    postedAt: '14 小时前',
    country: '美国',
    region: 'USA',
    industry: 'SaaSSoftware',
    analysis: {
      intentType: '采购需求',
      intentScore: 74,
      tags: ['#agency', '#leadgen', '#automation', '#reporting'],
      suggestion: '代理机构客户，预算已定，可快速成单。',
      background: '美国营销代理机构创始人。',
      need: '采购线索自动生成与客户报告工具。',
      purchaseProbability: 'medium',
      salesStrategy: '英文邮件开发，强调代理机构场景适配。',
    },
    sourceUrl: 'https://reddit.com/r/marketing/agency-owner-tom',
    profileUrl: 'https://reddit.com/user/agency_owner_tom',
  },

  // ===== 贸易出口 Trade Export =====
  {
    id: 'cus_015',
    username: 'import_export_sara',
    displayName: 'Sara Nguyen',
    initials: 'SN',
    platform: 'LinkedIn',
    postContent:
      'Import-export business connecting Asia and North America. Looking for reliable manufacturers of sustainable packaging. MOQ 10k units. Long-term partnership.',
    postedAt: '5 小时前',
    country: '越南',
    region: 'SoutheastAsia',
    industry: 'TradeExport',
    analysis: {
      intentType: '采购需求',
      intentScore: 86,
      tags: ['#packaging', '#sustainable', '#export', '#longterm'],
      suggestion: '长期合作型买家，MOQ 明确，稳定性高。',
      background: '越南贸易商，连接亚洲与北美市场。',
      need: '寻找可持续包装制造商，MOQ 1 万件。',
      purchaseProbability: 'high',
      salesStrategy: 'LinkedIn 私信开发，强调长期合作与认证。',
    },
    sourceUrl: 'https://linkedin.com/feed/import-export-sara',
    profileUrl: 'https://linkedin.com/in/sara-nguyen-trade',
  },
  {
    id: 'cus_016',
    username: 'trade_expo_buyer',
    displayName: 'Carlos Mendes',
    initials: 'CM',
    platform: 'Facebook',
    postContent:
      'Visited Canton Fair last month. Still looking for suppliers of home textiles and kitchenware for our Brazilian retail chain. Shipping to Santos port.',
    postedAt: '9 小时前',
    country: '巴西',
    region: 'SoutheastAsia',
    industry: 'TradeExport',
    analysis: {
      intentType: '采购需求',
      intentScore: 83,
      tags: ['#textiles', '#kitchenware', '#cantonfair', '#brazil'],
      suggestion: '广交会活跃买家，需求持续，物流路径明确。',
      background: '巴西零售连锁买手，常驻广交会采购。',
      need: '采购家纺与餐厨用品，发往桑托斯港。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，附 FOB 报价。',
    },
    sourceUrl: 'https://facebook.com/trade-expo-buyer',
    profileUrl: 'https://facebook.com/carlos.mendes',
  },
  {
    id: 'cus_017',
    username: 'textile_sourcing',
    displayName: 'Mei Lin',
    initials: 'ML',
    platform: 'Xiaohongshu',
    postContent: '帮客户找面料供应商，主要做女装品牌，需要高品质针织面料，能小批量起订最好，长期合作。',
    postedAt: '16 小时前',
    country: '中国',
    region: 'China',
    industry: 'TradeExport',
    analysis: {
      intentType: '采购需求',
      intentScore: 70,
      tags: ['#面料', '#女装', '#针织', '#小批量'],
      suggestion: '中间代采角色，掌握品牌客户资源。',
      background: '面料采购代理，服务女装品牌客户。',
      need: '采购高品质针织面料，小批量起订。',
      purchaseProbability: 'medium',
      salesStrategy: '中文沟通，提供小批量打样服务。',
    },
    sourceUrl: 'https://xiaohongshu.com/textile_sourcing',
    profileUrl: 'https://xiaohongshu.com/user/textile_sourcing',
  },

  // ===== 美容行业 Beauty Industry =====
  {
    id: 'cus_018',
    username: 'beauty_brand_grace',
    displayName: 'Grace Kim',
    initials: 'GK',
    platform: 'Instagram',
    postContent:
      'Launching a new skincare brand! Need OEM/ODM partners for serums and creams. Clean ingredients, cruelty-free, low MOQ to start. Based in Korea, shipping globally.',
    postedAt: '2 小时前',
    country: '韩国',
    region: 'SoutheastAsia',
    industry: 'BeautyIndustry',
    analysis: {
      intentType: '采购需求',
      intentScore: 91,
      tags: ['#skincare', '#OEM', '#cleanbeauty', '#launch'],
      suggestion: '新品牌代工需求，启动期客户，潜力大。',
      background: '韩国新锐护肤品牌创始人，全球发货。',
      need: '寻找精华与面霜 OEM/ODM 代工，低 MOQ。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，附代工方案与起订量。',
    },
    sourceUrl: 'https://instagram.com/beauty_brand_grace',
    profileUrl: 'https://instagram.com/beauty_brand_grace',
  },
  {
    id: 'cus_019',
    username: 'salon_chain_owner',
    displayName: 'Rachel Moore',
    initials: 'RM',
    platform: 'TikTok',
    postContent:
      'Own a chain of 8 hair salons. Looking for professional-grade color lines and styling tools at wholesale. Anyone got connections?',
    postedAt: '6 小时前',
    country: '美国',
    region: 'USA',
    industry: 'BeautyIndustry',
    analysis: {
      intentType: '采购需求',
      intentScore: 79,
      tags: ['#salon', '#haircolor', '#wholesale', '#styling'],
      suggestion: '连锁美发机构，采购量稳定。',
      background: '美国 8 家连锁美发沙龙老板。',
      need: '批发采购专业染发与造型工具。',
      purchaseProbability: 'high',
      salesStrategy: '英文私信开发，提供连锁专属折扣。',
    },
    sourceUrl: 'https://tiktok.com/@salon_chain_owner',
    profileUrl: 'https://tiktok.com/@salon_chain_owner',
  },
  {
    id: 'cus_020',
    username: 'beauty_device_seeker',
    displayName: 'Yuki Sato',
    initials: 'YS',
    platform: 'Xiaohongshu',
    postContent: '美容院想引进家用美容仪做零售，求推荐靠谱的源头厂家，要有欧盟认证的，可以贴牌。',
    postedAt: '11 小时前',
    country: '中国',
    region: 'China',
    industry: 'BeautyIndustry',
    analysis: {
      intentType: '采购需求',
      intentScore: 77,
      tags: ['#美容仪', '#OEM', '#欧盟认证', '#贴牌'],
      suggestion: '美容院零售拓品需求，贴牌意向明确。',
      background: '美容院经营者，拓展家用美容仪零售。',
      need: '采购可贴牌的家用美容仪，需欧盟认证。',
      purchaseProbability: 'medium',
      salesStrategy: '中文沟通，提供 CE 认证与贴牌方案。',
    },
    sourceUrl: 'https://xiaohongshu.com/beauty_device_seeker',
    profileUrl: 'https://xiaohongshu.com/user/beauty_device_seeker',
  },
  {
    id: 'cus_021',
    username: 'cosmetics_distributor',
    displayName: 'Fatima Hassan',
    initials: 'FH',
    platform: 'LinkedIn',
    postContent:
      'Distributing cosmetics in the GCC region. Seeking halal-certified beauty brands for exclusive distribution partnerships. Strong retail network.',
    postedAt: '1 天前',
    country: '沙特阿拉伯',
    region: 'MiddleEast',
    industry: 'BeautyIndustry',
    analysis: {
      intentType: '渠道合作',
      intentScore: 85,
      tags: ['#halal', '#cosmetics', '#GCC', '#distribution'],
      suggestion: '海湾地区独家代理合作，渠道资源优质。',
      background: '沙特化妆品区域分销商，零售网络强。',
      need: '寻找清真认证美妆品牌的独家代理权。',
      purchaseProbability: 'high',
      salesStrategy: '英文邮件开发，提供独家代理方案。',
    },
    sourceUrl: 'https://linkedin.com/feed/cosmetics-distributor',
    profileUrl: 'https://linkedin.com/in/fatima-hassan-gcc',
  },

  // ===== 补充：低意向 / 观望类 =====
  {
    id: 'cus_022',
    username: 'curious_founder',
    displayName: 'Alex Turner',
    initials: 'AT',
    platform: 'X',
    postContent:
      'Just curious — has anyone tried automating outbound sales with AI? Wondering if it actually works or just hype. Would love to hear real experiences.',
    postedAt: '18 小时前',
    country: '美国',
    region: 'USA',
    industry: 'SaaSSoftware',
    analysis: {
      intentType: '兴趣探索',
      intentScore: 42,
      tags: ['#AI', '#outbound', '#sales', '#curious'],
      suggestion: '当前处于认知阶段，建议通过内容培育转化。',
      background: '初创创始人，对 AI 销售工具处于了解期。',
      need: '了解 AI 外呼自动化是否真实有效。',
      purchaseProbability: 'low',
      salesStrategy: '提供行业案例与免费试用培育。',
    },
    sourceUrl: 'https://x.com/curious_founder/status/789',
    profileUrl: 'https://x.com/curious_founder',
  },
]

/** 标准化客户数据：补全 customerType / recommendedAction / reasoning / needKeywords */
export const CUSTOMERS: Customer[] = RAW_CUSTOMERS.map((c) => ({
  ...c,
  customerType: deriveCustomerType(c),
  recommendedAction: deriveAction(c),
  analysis: {
    ...c.analysis,
    reasoning: c.analysis.reasoning ?? c.analysis.suggestion,
    needKeywords:
      c.analysis.needKeywords ?? c.analysis.tags.map((t) => t.replace(/^#/, '')),
  },
}))

/** 按 id 查找客户 */
export function findCustomerById(id: string): Customer | undefined {
  return CUSTOMERS.find((c) => c.id === id)
}
