import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Telescope,
  BriefcaseBusiness,
  MessageCircleMore,
  ChartNoAxesCombined,
  FolderHeart,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const WORKSPACE_ITEMS = [
  {
    to: '/app/dashboard',
    label: '市场机会中心',
    icon: ChartNoAxesCombined,
    desc: '发现企业变化与市场信号',
  },
  {
    to: '/app/discover',
    label: '销售机会',
    icon: BriefcaseBusiness,
    desc: '筛选机会与确认客户',
  },
  {
    to: '/app/assistant',
    label: 'AI 销售助手',
    icon: MessageCircleMore,
    desc: '分析、策略与推荐动作',
  },
]

const PERSONAL_ITEMS = [
  {
    to: '/app/account',
    label: '我的工作区',
    icon: FolderHeart,
    desc: '收藏、历史记录与设置',
  },
]

/** 工作台主布局：左侧导航 + 顶部 + 内容区 */
export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 侧边栏 */}
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-[84px] items-center border-b border-ink-100 px-6">
          <Link to="/app/dashboard" className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-md border border-ink-200 bg-ink-50 px-1.5 py-1 text-[8px] font-bold tracking-[0.16em] text-ink-500 xl:inline">
              WORKSPACE
            </span>
          </Link>
        </div>

        <div className="px-4 pt-5">
          <Link
            to="/app/dashboard"
            className="group flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(37,99,235,0.65)] transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-[0_12px_24px_-12px_rgba(37,99,235,0.7)]"
          >
            <span className="flex items-center gap-2">
              <Telescope className="h-[18px] w-[18px]" />
              开始市场扫描
            </span>
            <Sparkles className="h-4 w-4 text-blue-100" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-7 scrollbar-thin">
          <NavSection label="Workspace" items={WORKSPACE_ITEMS} />
          <NavSection
            label="Personal"
            items={PERSONAL_ITEMS}
            className="mt-8 border-t border-ink-100 pt-6"
          />
        </nav>

        <div className="mx-4 mb-4 rounded-xl border border-ink-200 bg-ink-50 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            销售工作流
          </div>
          <p className="mt-2 text-[10px] leading-5 text-ink-500">
            观察市场 → 发现机会 → 研究企业 → 形成行动
          </p>
        </div>

        <div className="border-t border-ink-200 p-4">
          <Link
            to="/app/account"
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 shadow-sm">
              <FolderHeart className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">我的工作区</p>
              <p className="truncate text-xs text-ink-500">收藏、历史与设置</p>
            </div>
            <Settings2 className="h-4 w-4 text-ink-400" />
          </Link>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex flex-1 flex-col overflow-hidden bg-ink-50">
        {/* 顶部栏（移动端） */}
        <header className="flex h-16 items-center justify-between border-b border-ink-200 bg-white px-4 lg:hidden">
          <Link to="/app/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {[...WORKSPACE_ITEMS, ...PERSONAL_ITEMS].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg p-2 transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-500 hover:bg-ink-100',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        </header>

        {/* 移动端二级提示 */}
        {location.pathname === '/app' && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-ink-500 lg:hidden">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            选择上方功能开始使用
          </div>
        )}

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavSection({
  label,
  items,
  className,
}: {
  label: string
  items: typeof WORKSPACE_ITEMS
  className?: string
}) {
  return (
    <section className={className}>
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
              )
            }
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-500 shadow-sm transition-colors group-hover:text-brand-600">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{item.label}</span>
              <span className="mt-0.5 block truncate text-[10px] font-normal text-ink-500">
                {item.desc}
              </span>
            </span>
          </NavLink>
        ))}
      </div>
    </section>
  )
}
