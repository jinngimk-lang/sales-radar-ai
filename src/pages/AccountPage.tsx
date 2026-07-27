import { useState } from 'react'
import {
  User,
  Key,
  History,
  Star,
  Users,
  Check,
  Copy,
  Eye,
  EyeOff,
  Mail,
  Globe2,
  CreditCard,
  Bell,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

type TabKey = 'account' | 'api' | 'history' | 'favorites' | 'crm'

const TABS: Array<{ key: TabKey; label: string; icon: typeof User }> = [
  { key: 'account', label: '账号信息', icon: User },
  { key: 'api', label: 'API 设置', icon: Key },
  { key: 'history', label: '搜索历史', icon: History },
  { key: 'favorites', label: '收藏客户', icon: Star },
  { key: 'crm', label: 'CRM 管理', icon: Users },
]

const SEARCH_HISTORY = [
  { keyword: '工业机器人', time: '今天 14:32', count: 328 },
  { keyword: '美容仪 OEM', time: '今天 11:08', count: 156 },
  { keyword: 'TWS 耳机', time: '昨天 16:45', count: 286 },
  { keyword: 'CNC 加工中心', time: '昨天 09:20', count: 94 },
  { keyword: '医用监护仪', time: '2 天前', count: 178 },
]

const FAVORITE_CUSTOMERS = [
  { name: 'Marcus Reyes', initials: 'MR', platform: 'Reddit', score: 92 },
  { name: 'Ahmed Al-Farsi', initials: 'AF', platform: 'LinkedIn', score: 90 },
  { name: 'Dr. Emily Carter', initials: 'EC', platform: 'LinkedIn', score: 95 },
  { name: 'Grace Kim', initials: 'GK', platform: 'Instagram', score: 91 },
]

const CRM_PIPELINE = [
  { stage: '新线索', count: 128, color: 'bg-ink-100 text-ink-700' },
  { stage: '已联系', count: 64, color: 'bg-brand-50 text-brand-700' },
  { stage: '谈判中', count: 28, color: 'bg-amber-50 text-amber-700' },
  { stage: '已成交', count: 12, color: 'bg-emerald-50 text-emerald-700' },
]

/** 个人中心 */
export function AccountPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('account')
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const apiKey = 'sk-sra-2026-xxxxxxxxxxxxxxxxxxxxxxxx'

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">个人中心</h1>
        <p className="mt-1 text-sm text-ink-500">管理账号、API、搜索历史与客户资源</p>
      </div>

      {/* 用户概览卡 */}
      <div className="card mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar initials="SR" size="lg" />
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Sales Rep</h2>
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <Mail className="h-3.5 w-3.5" />
              sales@company.com
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="chip bg-brand-50 text-brand-700">Pro 计划</span>
              <span className="chip bg-emerald-50 text-emerald-700">已认证</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">编辑资料</button>
          <button className="btn-primary">升级套餐</button>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-ink-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {activeTab === 'account' && <AccountTab />}
      {activeTab === 'api' && (
        <ApiTab
          showKey={showKey}
          setShowKey={setShowKey}
          apiKey={apiKey}
          onCopy={handleCopyKey}
          copied={copied}
        />
      )}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'favorites' && <FavoritesTab />}
      {activeTab === 'crm' && <CrmTab />}
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-ink-900">{title}</h3>
      {desc && <p className="mt-0.5 text-sm text-ink-500">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function AccountTab() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Section title="基本信息" desc="用于账户登录与身份展示">
        <div className="space-y-3">
          <Field label="显示名" value="Sales Rep" />
          <Field label="邮箱" value="sales@company.com" />
          <Field label="公司" value="Global Trade Co., Ltd." />
          <Field label="所在地区" value="中国 · 上海" />
        </div>
      </Section>
      <Section title="偏好设置" desc="定制你的使用体验">
        <div className="space-y-3">
          <ToggleRow icon={Globe2} label="界面语言" value="简体中文" />
          <ToggleRow icon={Bell} label="邮件通知" value="已开启" />
          <ToggleRow icon={CreditCard} label="自动续费" value="已开启" />
        </div>
      </Section>
    </div>
  )
}

function ApiTab({
  showKey,
  setShowKey,
  apiKey,
  onCopy,
  copied,
}: {
  showKey: boolean
  setShowKey: (v: boolean) => void
  apiKey: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="space-y-6">
      <Section title="API 密钥" desc="用于调用 Sales Radar AI 的数据接口">
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <code className="flex-1 truncate font-mono text-sm text-ink-800">
              {showKey ? apiKey : '•'.repeat(apiKey.length)}
            </code>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                aria-label={showKey ? '隐藏' : '显示'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={onCopy}
                className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                aria-label="复制"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary">重新生成</button>
          <button className="btn-ghost text-red-500 hover:bg-red-50">撤销密钥</button>
        </div>
      </Section>

      <Section title="调用配额" desc="本月 API 使用情况">
        <div className="grid grid-cols-3 gap-4">
          <QuotaCard label="客户搜索" used={2840} total={10000} />
          <QuotaCard label="AI 对话" used={562} total={2000} />
          <QuotaCard label="开发信生成" used={128} total={500} />
        </div>
      </Section>

      <Section title="接入文档" desc="接入你的后端系统">
        <div className="rounded-xl bg-ink-900 p-4 font-mono text-xs leading-relaxed text-ink-100">
          <p className="text-ink-400"># 基础请求示例</p>
          <p><span className="text-emerald-400">curl</span> -X POST \</p>
          <p className="pl-4">https://api.salesradar.ai/v1/customers/search \</p>
          <p className="pl-4">-H <span className="text-amber-300">"Authorization: Bearer {apiKey.slice(0, 16)}..."</span> \</p>
          <p className="pl-4">-H <span className="text-amber-300">"Content-Type: application/json"</span> \</p>
          <p className="pl-4">-d <span className="text-amber-300">{'\'{"query": "industrial robots"}\''}</span></p>
        </div>
      </Section>
    </div>
  )
}

function HistoryTab() {
  return (
    <Section title="搜索历史" desc="最近的关键词搜索记录">
      <div className="overflow-hidden rounded-xl border border-ink-200">
        <table className="w-full">
          <thead className="bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">关键词</th>
              <th className="px-4 py-3">搜索时间</th>
              <th className="px-4 py-3 text-right">发现客户</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {SEARCH_HISTORY.map((item, idx) => (
              <tr key={idx} className="text-sm transition-colors hover:bg-ink-50/50">
                <td className="px-4 py-3 font-medium text-ink-900">{item.keyword}</td>
                <td className="px-4 py-3 text-ink-500">{item.time}</td>
                <td className="px-4 py-3 text-right font-semibold text-brand-600">{item.count}</td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost px-2 py-1 text-xs">重新搜索</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

function FavoritesTab() {
  return (
    <Section title="收藏客户" desc="你重点关注的潜在客户">
      <div className="grid gap-3 sm:grid-cols-2">
        {FAVORITE_CUSTOMERS.map((c) => (
          <div key={c.name} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3">
            <Avatar initials={c.initials} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{c.name}</p>
              <p className="text-xs text-ink-500">{c.platform}</p>
            </div>
            <span className="chip bg-emerald-50 text-emerald-700">{c.score}%</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function CrmTab() {
  return (
    <div className="space-y-6">
      <Section title="销售漏斗" desc="客户从线索到成交的转化情况">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CRM_PIPELINE.map((stage) => (
            <div key={stage.stage} className="rounded-xl border border-ink-200 p-4 text-center">
              <div className={cn('mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', stage.color)}>
                {stage.count}
              </div>
              <p className="mt-2 text-xs font-medium text-ink-600">{stage.stage}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="CRM 集成" desc="将客户同步到你的 CRM 系统">
        <div className="grid gap-3 sm:grid-cols-3">
          {['Salesforce', 'HubSpot', 'Zoho CRM'].map((crm) => (
            <button
              key={crm}
              className="card flex items-center justify-between p-4 text-left transition-all hover:border-brand-300 hover:shadow-card-hover"
            >
              <span className="text-sm font-medium text-ink-900">{crm}</span>
              <span className="chip bg-ink-100 text-ink-500">连接</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</label>
      <div className="mt-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
        {value}
      </div>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-ink-700">
        <Icon className="h-4 w-4 text-ink-400" />
        {label}
      </span>
      <span className="text-sm font-medium text-ink-900">{value}</span>
    </div>
  )
}

function QuotaCard({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = Math.round((used / total) * 100)
  return (
    <div className="rounded-xl border border-ink-200 p-3">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">
        {used.toLocaleString()} <span className="text-ink-400">/ {total.toLocaleString()}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn('h-full rounded-full', pct > 80 ? 'bg-red-500' : 'bg-brand-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-ink-400">{pct}% 已使用</p>
    </div>
  )
}
