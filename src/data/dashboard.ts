import type { StatCard, ChartPoint } from '@/types'

/** Legacy dashboard fixtures retained for the non-market dashboard helpers. */
export const DASHBOARD_STATS: StatCard[] = [
  { label: '今日发现客户', value: 128, trend: 12.5, icon: 'discovery' },
  { label: '高意向客户', value: 36, trend: 8.3, icon: 'intent' },
  { label: '热门行业', value: '工业制造', icon: 'industry' },
  { label: '热门地区', value: '美国', icon: 'region' },
  { label: '热门平台', value: 'Reddit', icon: 'platform' },
]

export const DISCOVERY_TREND: ChartPoint[] = [
  { name: '7/10', value: 42 },
  { name: '7/11', value: 58 },
  { name: '7/12', value: 51 },
  { name: '7/13', value: 73 },
  { name: '7/14', value: 69 },
  { name: '7/15', value: 88 },
  { name: '7/16', value: 95 },
  { name: '7/17', value: 112 },
  { name: '7/18', value: 104 },
  { name: '7/19', value: 128 },
  { name: '7/20', value: 121 },
  { name: '7/21', value: 143 },
  { name: '7/22', value: 156 },
  { name: '7/23', value: 128 },
]

export const INDUSTRY_DISTRIBUTION: ChartPoint[] = [
  { name: '工业制造', value: 348 },
  { name: '消费电子', value: 286 },
  { name: '医疗健康', value: 194 },
  { name: 'SaaS 软件', value: 168 },
  { name: '贸易出口', value: 142 },
  { name: '美容行业', value: 98 },
]

export const PLATFORM_DISTRIBUTION: ChartPoint[] = [
  { name: 'Reddit', value: 386 },
  { name: 'LinkedIn', value: 294 },
  { name: 'X', value: 218 },
  { name: 'Instagram', value: 176 },
  { name: 'Facebook', value: 132 },
  { name: 'TikTok', value: 98 },
  { name: 'YouTube', value: 64 },
  { name: '小红书', value: 42 },
]
