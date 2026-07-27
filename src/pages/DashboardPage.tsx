import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Radar,
  Flame,
  Factory,
  Globe2,
  Monitor,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle2,
  Phone,
  MessageSquare,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { StatCard, ChartPoint, FollowUpStatus } from '@/types'
import {
  getDashboardStats,
  getDiscoveryTrend,
  getIndustryDistribution,
  getPlatformDistribution,
  getCrmStats,
} from '@/services/api'
import { useAllCrmRecords } from '@/lib/useCrm'
import { cn } from '@/lib/utils'

const ICON_MAP = {
  discovery: Radar,
  intent: Flame,
  industry: Factory,
  region: Globe2,
  platform: Monitor,
}

const PIE_COLORS = ['#2046d8', '#3563f0', '#5a8bff', '#8eb4ff', '#bcd2ff', '#d9e6ff']
const BAR_COLOR = '#2046d8'

/** 数据看板 */
export function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([])
  const [trend, setTrend] = useState<ChartPoint[]>([])
  const [industry, setIndustry] = useState<ChartPoint[]>([])
  const [platform, setPlatform] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getDiscoveryTrend(),
      getIndustryDistribution(),
      getPlatformDistribution(),
    ]).then(([s, t, i, p]) => {
      setStats(s)
      setTrend(t)
      setIndustry(i)
      setPlatform(p)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">数据看板</h1>
        <p className="mt-1 text-sm text-ink-500">销售获客数据总览，实时掌握业务动态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = ICON_MAP[stat.icon]
          const isText = typeof stat.value === 'string'
          return (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                {stat.trend !== undefined && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-xs font-semibold',
                      stat.trend >= 0 ? 'text-emerald-600' : 'text-red-500',
                    )}
                  >
                    {stat.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(stat.trend)}%
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className={cn('font-bold text-ink-900', isText ? 'text-lg' : 'text-2xl')}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{stat.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 图表区 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* 趋势图 */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink-900">客户发现趋势</h2>
              <p className="text-xs text-ink-500">最近 14 天每日新增潜在客户</p>
            </div>
            <span className="chip bg-brand-50 text-brand-700">
              <TrendingUp className="h-3 w-3" />
              环比上升 12.5%
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BAR_COLOR} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={BAR_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aa1b0' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9aa1b0' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #dde1e9',
                    fontSize: 12,
                    boxShadow: '0 4px 16px rgba(15,30,77,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={BAR_COLOR}
                  strokeWidth={2.5}
                  fill="url(#trendGradient)"
                  dot={{ r: 3, fill: BAR_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 行业分布 */}
        <div className="card p-6">
          <h2 className="font-semibold text-ink-900">行业分布</h2>
          <p className="text-xs text-ink-500">客户线索按行业占比</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={industry}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {industry.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #dde1e9',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {industry.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <span className="flex-1 text-ink-600">{item.name}</span>
                <span className="font-semibold text-ink-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 平台来源 */}
      <div className="card mt-6 p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-ink-900">平台来源分布</h2>
          <p className="text-xs text-ink-500">客户线索来自哪些社交平台</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={platform} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aa1b0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9aa1b0' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: '#eef4ff' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #dde1e9',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CRM 销售漏斗 */}
      <CrmFunnelPanel />
    </div>
  )
}

/** CRM 销售漏斗面板：展示跟进状态分布 */
function CrmFunnelPanel() {
  // 订阅 CRM 变化，实时刷新
  useAllCrmRecords()
  const stats = getCrmStats()

  const FUNNEL: {
    key: FollowUpStatus
    label: string
    icon: typeof CheckCircle2
    color: string
    iconColor: string
  }[] = [
    { key: 'new', label: '未联系', icon: Flame, color: 'text-ink-700', iconColor: 'bg-ink-100 text-ink-600' },
    { key: 'contacted', label: '已联系', icon: Phone, color: 'text-blue-700', iconColor: 'bg-blue-50 text-blue-600' },
    { key: 'engaging', label: '沟通中', icon: MessageSquare, color: 'text-amber-700', iconColor: 'bg-amber-50 text-amber-600' },
    { key: 'won', label: '已成交', icon: Trophy, color: 'text-emerald-700', iconColor: 'bg-emerald-50 text-emerald-600' },
    { key: 'lost', label: '已流失', icon: XCircle, color: 'text-rose-700', iconColor: 'bg-rose-50 text-rose-600' },
  ]

  const total = Object.values(stats).reduce((a, b) => a + b, 0)

  return (
    <div className="card mt-6 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <CheckCircle2 className="h-4 w-4 text-brand-600" />
            销售漏斗
          </h2>
          <p className="text-xs text-ink-500">客户跟进状态分布，点击客户卡片可更新状态</p>
        </div>
        {total > 0 && (
          <span className="chip bg-brand-50 text-brand-700">
            共追踪 {total} 个客户
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {FUNNEL.map((stage) => {
          const count = stats[stage.key]
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const Icon = stage.icon
          return (
            <div
              key={stage.key}
              className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4 transition-all hover:border-brand-200 hover:bg-brand-50/30"
            >
              <div className={cn('mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl', stage.iconColor)}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <p className={cn('text-2xl font-bold', count > 0 ? stage.color : 'text-ink-300')}>
                {count}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">{stage.label}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-ink-400">{pct}%</p>
            </div>
          )
        })}
      </div>

      {total === 0 && (
        <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-center text-xs text-ink-400">
          还没有跟进记录。前往「客户搜索」收藏客户或更新跟进状态，漏斗数据将在这里实时展示。
        </p>
      )}
    </div>
  )
}
