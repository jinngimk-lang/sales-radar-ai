import { Bot, Radar, Settings2, WalletCards } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const WORKSPACE_ITEMS = [
  { to: '/app/home', label: 'AI 首页', icon: Bot },
  { to: '/app/market', label: '市场雷达', icon: Radar },
  { to: '/app/revenue', label: '收益中心', icon: WalletCards },
  { to: '/app/account', label: '设置', icon: Settings2 },
]

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="app-sidebar z-40 hidden w-[208px] shrink-0 flex-col lg:flex">
        <div className="flex h-[64px] items-center px-5">
          <Link
            to="/app/home"
            aria-label="返回 Sales Radar AI 的 AI 首页"
            className="flex items-center gap-2.5"
          >
            <Logo variant="light" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
          <div className="space-y-1">
            {WORKSPACE_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/[0.055] hover:text-white',
                  )
                }
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors group-hover:text-sky-300">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="px-5 pb-5 text-[10px] text-white/25">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
          Source-backed
        </div>
      </aside>

      <div className="app-workspace-canvas flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-brand-950 px-4 lg:hidden">
          <Link to="/app/home" aria-label="返回 AI 首页">
            <Logo variant="light" />
          </Link>
          <div className="flex items-center gap-1">
            {WORKSPACE_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg p-2 transition-colors',
                    isActive
                      ? 'bg-white/10 text-sky-300'
                      : 'text-white/45 hover:bg-white/[0.06] hover:text-white',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
