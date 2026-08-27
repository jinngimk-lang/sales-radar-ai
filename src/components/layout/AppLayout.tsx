import {
  BadgeCheck,
  Bot,
  MessageSquareText,
  Search,
  Settings2,
  Target,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const WORKSPACE_ITEMS = [
  { to: '/app/home', label: '工作台', icon: Bot, activePaths: ['/app/home'] },
  { to: '/app/targets', label: '目标', icon: Target, activePaths: ['/app/targets'] },
  { to: '/app/market', label: '发现', icon: Search, activePaths: ['/app/market', '/app/discover'] },
  {
    to: '/app/communication',
    label: '沟通',
    icon: MessageSquareText,
    activePaths: ['/app/communication', '/app/customer'],
  },
  { to: '/app/intent', label: '机会', icon: BadgeCheck, activePaths: ['/app/intent'] },
  { to: '/app/account', label: '设置', icon: Settings2, activePaths: ['/app/account'] },
]

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="app-sidebar z-40 hidden w-[208px] shrink-0 flex-col lg:flex">
        <div className="flex h-[64px] items-center px-5">
          <Link
            to="/app/home"
            aria-label="返回 Sales Radar AI 工作台"
            className="flex items-center gap-2.5"
          >
            <Logo variant="light" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin" aria-label="主工作区">
          <div className="space-y-1">
            {WORKSPACE_ITEMS.map((item) => {
              const active = item.activePaths.some((path) =>
                isPathActive(location.pathname, path),
              )
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/[0.055] hover:text-white',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                      active ? 'text-sky-300' : 'text-white/45 group-hover:text-sky-300',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="px-5 pb-5 text-[10px] text-white/25">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
          Evidence-first workspace
        </div>
      </aside>

      <div className="app-workspace-canvas flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-brand-950 px-4 lg:hidden">
          <Link to="/app/home" aria-label="返回工作台">
            <Logo variant="light" />
          </Link>
          <div className="flex max-w-[calc(100vw-120px)] items-center gap-1 overflow-x-auto scrollbar-thin">
            {WORKSPACE_ITEMS.map((item) => {
              const active = item.activePaths.some((path) =>
                isPathActive(location.pathname, path),
              )
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-lg p-2 transition-colors',
                    active
                      ? 'bg-white/10 text-sky-300'
                      : 'text-white/45 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              )
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function isPathActive(current: string, path: string) {
  return current === path || current.startsWith(`${path}/`)
}
