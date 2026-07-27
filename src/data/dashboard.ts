import type { StatCard, ChartPoint, ChatSession, ChatMessage } from '@/types'

/**
 * 模拟 Dashboard 统计数据
 */
export const DASHBOARD_STATS: StatCard[] = [
  { label: '今日发现客户', value: 128, trend: 12.5, icon: 'discovery' },
  { label: '高意向客户', value: 36, trend: 8.3, icon: 'intent' },
  { label: '热门行业', value: '工业制造', icon: 'industry' },
  { label: '热门地区', value: '美国', icon: 'region' },
  { label: '热门平台', value: 'Reddit', icon: 'platform' },
]

/** 客户发现趋势（最近 14 天） */
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

/** 行业分布 */
export const INDUSTRY_DISTRIBUTION: ChartPoint[] = [
  { name: '工业制造', value: 348 },
  { name: '消费电子', value: 286 },
  { name: '医疗健康', value: 194 },
  { name: 'SaaS 软件', value: 168 },
  { name: '贸易出口', value: 142 },
  { name: '美容行业', value: 98 },
]

/** 平台来源分布 */
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

/**
 * AI 助手模拟数据
 */
export const CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'sess_001',
    customerName: 'Marcus Reyes',
    initials: 'MR',
    platform: 'Reddit',
    lastMessage: '已生成英文开发信草稿，建议本周内跟进。',
    updatedAt: '10 分钟前',
  },
  {
    id: 'sess_002',
    customerName: 'Ahmed Al-Farsi',
    initials: 'AF',
    platform: 'LinkedIn',
    lastMessage: '阶梯报价表已生成，TWS 耳机 MOQ 5000 起。',
    updatedAt: '1 小时前',
  },
  {
    id: 'sess_003',
    customerName: 'Dr. Emily Carter',
    initials: 'EC',
    platform: 'LinkedIn',
    lastMessage: '已准备 ISO 13485 资质材料，建议附 FDA 注册。',
    updatedAt: '3 小时前',
  },
  {
    id: 'sess_004',
    customerName: 'Grace Kim',
    initials: 'GK',
    platform: 'Instagram',
    lastMessage: 'OEM 代工方案已整理，精华低 MOQ 1000 瓶起。',
    updatedAt: '昨天',
  },
  {
    id: 'sess_005',
    customerName: 'Carlos Mendes',
    initials: 'CM',
    platform: 'Facebook',
    lastMessage: 'FOB 报价已发送，建议关注桑托斯港海运周期。',
    updatedAt: '2 天前',
  },
]

/** 默认 AI 对话内容 */
export const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_001',
    role: 'assistant',
    content:
      '你好！我是 Sales Radar AI 销售助手。我可以帮你跟进客户、生成开发话术、制定报价建议。\n\n你可以试试问我：「帮我跟进 Marcus Reyes 这个客户」。',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
]

/** 模拟 AI 回复（按关键词匹配） */
export const MOCK_AI_REPLIES: Array<{ keywords: string[]; reply: string }> = [
  {
    keywords: ['跟进', 'follow', 'follow up', '跟进客户'],
    reply:
      '已分析该客户的近期动态，为你制定跟进方案：\n\n1. 即时动作（今日内）\n发送一封英文开发信，主题突出「为你的工厂产线自动化提速」。开篇回应他在 Reddit 提到的 Q3 采购预算，附上 2 个同行业交付案例。\n\n2. 三日内\n通过 LinkedIn 连接，分享一篇自动化 ROI 计算文章，建立专业信任。\n\n3. 一周内\n提供定制化方案报价，附交付周期与售后承诺，推动决策。\n\n4. 持续培育\n每两周一次行业洞察推送，保持触达。\n\n需要我直接生成开发信草稿吗？',
  },
  {
    keywords: ['邮件', '开发信', 'email', '邮件开发'],
    reply:
      '英文开发信草稿如下：\n\nSubject: Scaling your assembly line with proven industrial robots\n\nHi Marcus,\n\nI noticed your post about seeking automation solutions for your factory. With Q3 procurement budget approved, timing matters.\n\nWe have helped 3 manufacturers in the Midwest cut assembly cycle time by 38% with our industrial robot line. One client went from 60 to 92 units/day within 8 weeks.\n\nI can share a short case deck and a tailored proposal. Open to a 15-min call this week?\n\nBest,\n[Your Name]',
  },
  {
    keywords: ['报价', '价格', 'quote', 'price', '报价建议'],
    reply:
      '基于客户背景与采购量，给出阶梯报价建议：\n\n方案 A（标准款）\n单价 $12,800 / 台，MOQ 5 台，交付 6 周。\n\n方案 B（批量优惠）\nMOQ 10 台，单价 $11,200 / 台，赠送安装调试。\n\n方案 C（战略合作）\nMOQ 20 台，单价 $9,800 / 台，含 2 年质保 + 培训。\n\n建议先以方案 A 切入建立信任，再升级方案 C 锁定长期合作。需要我生成完整报价单吗？',
  },
  {
    keywords: ['whatsapp', 'WhatsApp', '消息'],
    reply:
      'WhatsApp 跟进消息草稿：\n\nHi Marcus! Saw your post about factory automation. We supply industrial robots that helped similar shops boost output by 38%. Got 2 mins? I can send a quick case study. 🏭',
  },
  {
    keywords: ['linkedin', '私信', 'LinkedIn'],
    reply:
      'LinkedIn 私信草稿：\n\nHi Marcus, really enjoyed your perspective on factory automation. We work with manufacturers scaling their assembly lines — happy to share what is working in 2026 if useful. No pitch, just value first.',
  },
]

/** 默认匹配回复 */
export const DEFAULT_AI_REPLY =
  '我可以帮你处理这类需求：跟进客户、生成英文邮件、撰写 WhatsApp / LinkedIn 消息、制定阶梯报价。请告诉我你想先做哪一项，或者直接发送客户名称，我来分析。'
