import { useState } from 'react'
import {
  User,
  Key,
  History,
  Star,
  Users,
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

/** 我的工作区 */
export function AccountPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('account')

  return (
    <div className="workspace-page max-w-6xl">
      {/* 标题 */}
      <div className="workspace-heading">
        <div>
          <p className="workspace-kicker">WORKSPACE SETTINGS</p>
          <h1>我的工作区</h1>
          <p>集中管理账户信息、产品偏好与销售研究记录。</p>
        </div>
      </div>

      {/* 用户概览卡 */}
      <div className="workspace-panel mb-7 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
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
          <button className="workspace-secondary-action">编辑资料</button>
          <button className="workspace-primary-action">升级套餐</button>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="mb-7 flex gap-1 overflow-x-auto border-b border-ink-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b px-4 py-3 text-sm font-medium transition-colors',
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
      {activeTab === 'api' && <ApiTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'favorites' && <FavoritesTab />}
      {activeTab === 'crm' && <CrmTab />}
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="workspace-panel p-6">
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

function ApiTab() {
  return (
    <Section title="API 设置" desc="用于连接你的业务系统">
      <AccountEmptyState
        icon={Key}
        title="尚未配置 API"
        description="这里不会展示模拟密钥或虚假配额。正式接入后再显示真实配置。"
      />
    </Section>
  )
}

function HistoryTab() {
  return (
    <Section title="搜索历史" desc="最近的关键词搜索记录">
      <AccountEmptyState
        icon={History}
        title="还没有可展示的搜索记录"
        description="完成真实销售机会搜索后，历史记录会出现在这里。"
      />
    </Section>
  )
}

function FavoritesTab() {
  return (
    <Section title="收藏客户" desc="你重点关注的潜在客户">
      <AccountEmptyState
        icon={Star}
        title="还没有收藏的客户"
        description="只有经过验证并由你主动收藏的客户才会显示在这里。"
      />
    </Section>
  )
}

function CrmTab() {
  return (
    <Section title="CRM 管理" desc="将已确认客户连接到你的销售流程">
      <AccountEmptyState
        icon={Users}
        title="尚未连接 CRM"
        description="连接能力开放后，你可以主动同步已确认客户；市场机会不会自动进入 CRM。"
      />
    </Section>
  )
}

function AccountEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof History
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-6 text-center">
      <Icon className="h-5 w-5 text-ink-300" />
      <p className="mt-4 text-sm font-semibold text-ink-800">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-6 text-ink-400">
        {description}
      </p>
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
