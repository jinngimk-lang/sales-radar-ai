import type {
  Platform,
  PlatformMeta,
  Region,
  CustomerType,
  CustomerTypeMeta,
  Industry,
  IndustryMeta,
  IntentLevel,
  FollowUpStatus,
  FollowUpStatusMeta,
  RecommendedAction,
  RecommendedActionMeta,
} from '@/types'

/** 平台元数据：用于图标渲染与主题色 */
export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  Reddit: { name: 'Reddit', label: 'Reddit', color: '#FF4500' },
  X: { name: 'X', label: 'X (Twitter)', color: '#0f1419' },
  Instagram: { name: 'Instagram', label: 'Instagram', color: '#E1306C' },
  Facebook: { name: 'Facebook', label: 'Facebook', color: '#1877F2' },
  TikTok: { name: 'TikTok', label: 'TikTok', color: '#000000' },
  LinkedIn: { name: 'LinkedIn', label: 'LinkedIn', color: '#0A66C2' },
  Xiaohongshu: { name: 'Xiaohongshu', label: '小红书', color: '#FF2442' },
  YouTube: { name: 'YouTube', label: 'YouTube', color: '#FF0000' },
}

/** 全部平台，用于筛选 */
export const ALL_PLATFORMS: PlatformMeta[] = Object.values(PLATFORM_META)

/** 地区元数据 */
export const REGION_META: Record<Region, { key: Region; label: string }> = {
  USA: { key: 'USA', label: '美国' },
  Europe: { key: 'Europe', label: '欧洲' },
  SoutheastAsia: { key: 'SoutheastAsia', label: '东南亚' },
  China: { key: 'China', label: '中国' },
  MiddleEast: { key: 'MiddleEast', label: '中东' },
}

export const ALL_REGIONS = Object.values(REGION_META)

/** 客户类型元数据 */
export const CUSTOMER_TYPE_META: Record<CustomerType, CustomerTypeMeta> = {
  Buyer: { key: 'Buyer', label: '采购商', desc: '有明确采购需求与预算' },
  Agent: { key: 'Agent', label: '代理商', desc: '渠道分销 / 中间贸易' },
  Company: { key: 'Company', label: '企业客户', desc: 'B2B 企业决策人' },
  Individual: { key: 'Individual', label: '个人用户', desc: 'C 端个人消费者' },
}

export const ALL_CUSTOMER_TYPES = Object.values(CUSTOMER_TYPE_META)

/** 意向等级元数据 */
export const INTENT_LEVEL_META: Record<IntentLevel, { key: IntentLevel; label: string }> = {
  high: { key: 'high', label: '高' },
  medium: { key: 'medium', label: '中' },
  low: { key: 'low', label: '低' },
}

export const ALL_INTENT_LEVELS = Object.values(INTENT_LEVEL_META)

/** 行业元数据 */
export const INDUSTRY_META: Record<Industry, IndustryMeta> = {
  IndustrialManufacturing: { key: 'IndustrialManufacturing', label: '工业制造' },
  ConsumerElectronics: { key: 'ConsumerElectronics', label: '消费电子' },
  MedicalHealth: { key: 'MedicalHealth', label: '医疗健康' },
  SaaSSoftware: { key: 'SaaSSoftware', label: 'SaaS 软件' },
  TradeExport: { key: 'TradeExport', label: '贸易出口' },
  BeautyIndustry: { key: 'BeautyIndustry', label: '美容行业' },
}

export const ALL_INDUSTRIES = Object.values(INDUSTRY_META)

/** CRM 跟进状态元数据 */
export const FOLLOW_UP_STATUS_META: Record<FollowUpStatus, FollowUpStatusMeta> = {
  new: { key: 'new', label: '未联系', color: 'text-ink-600 bg-ink-100', dotClass: 'bg-ink-400' },
  contacted: { key: 'contacted', label: '已联系', color: 'text-blue-700 bg-blue-50', dotClass: 'bg-blue-500' },
  engaging: { key: 'engaging', label: '沟通中', color: 'text-amber-700 bg-amber-50', dotClass: 'bg-amber-500' },
  won: { key: 'won', label: '已成交', color: 'text-emerald-700 bg-emerald-50', dotClass: 'bg-emerald-500' },
  lost: { key: 'lost', label: '已流失', color: 'text-rose-700 bg-rose-50', dotClass: 'bg-rose-500' },
}

export const ALL_FOLLOW_UP_STATUSES = Object.values(FOLLOW_UP_STATUS_META)

/** AI 推荐行动元数据 */
export const RECOMMENDED_ACTION_META: Record<RecommendedAction, RecommendedActionMeta> = {
  contact_now: { key: 'contact_now', label: '立即联系', desc: '决策窗口紧迫，优先触达', color: 'text-rose-700 bg-rose-50 ring-rose-200' },
  follow_up: { key: 'follow_up', label: '尽快跟进', desc: '意向较高，本周内触达', color: 'text-amber-700 bg-amber-50 ring-amber-200' },
  monitor: { key: 'monitor', label: '持续观察', desc: '需求在培育期，定期触达', color: 'text-blue-700 bg-blue-50 ring-blue-200' },
  nurture: { key: 'nurture', label: '内容培育', desc: '认知阶段，用内容沉淀', color: 'text-ink-600 bg-ink-100 ring-ink-200' },
}

/** 首页快速行业标签 */
export const QUICK_INDUSTRY_TAGS = [
  '工业制造',
  '消费电子',
  '医疗健康',
  'SaaS软件',
  '贸易出口',
  '美容行业',
]
