import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Radar,
  Search,
  Bot,
  BarChart3,
  User,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/app/discover', label: '客户发现', icon: Search, desc: '搜索全球潜在客户' },
  { to: '/app/assistant', label: 'AI 销售助手', icon: Bot, desc: '生成开发话术与跟进方案' },
  { to: '/app/dashboard', label: '数据看板', icon: BarChart3, desc: '销售数据总览' },
  { to: '/app/account', label: '个人中心', icon: User, desc: '账号与 API 设置' },
]

/** 工作台主布局：左侧导航 + 顶部 + 内容区 */
export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* 侧边栏 */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="px-3 py-2">
          <Link to="/app/discover" className="btn-primary w-full justify-start">
            <Radar className="h-4 w-4" />
            开始寻找客户
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            工作台
          </p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <Link
            to="/app/account"
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ink-100"
          >
            <Avatar initials="SR" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">Sales Rep</p>
              <p className="truncate text-xs text-ink-500">sales@company.com</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-400" />
          </Link>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏（移动端） */}
        <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white px-4 lg:hidden">
          <Link to="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg p-2 transition-colors',
                    isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-500 hover:bg-ink-100',
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
            <LayoutDashboard className="h-3.5 w-3.5" />
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
