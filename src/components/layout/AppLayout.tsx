import { Bot, Radar, Settings2, ShieldCheck, WalletCards } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const WORKSPACE_ITEMS = [
  {
    to: '/app/home',
    label: 'AI 首页',
    icon: Bot,
    desc: '对话、工具轨迹与结构化结果',
  },
  {
    to: '/app/market',
    label: '市场雷达',
    icon: Radar,
    desc: '公开来源、市场信号与持续研究',
  },
  {
    to: '/app/revenue',
    label: '收益中心',
    icon: WalletCards,
    desc: '机会、执行画面、结算与证据',
  },
  {
    to: '/app/account',
    label: '设置',
    icon: Settings2,
    desc: '模型、数据源与运行状态',
  },
]

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="app-sidebar hidden w-[228px] shrink-0 flex-col lg:flex">
        <div className="flex h-[72px] items-center border-b border-white/10 px-5">
          <Link
            to="/app/home"
            aria-label="返回 Sales Radar AI 的 AI 首页"
            className="flex items-center gap-2.5"
          >
            <Logo variant="light" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
            Intelligence Workspace
          </p>
          <div className="space-y-1">
            {WORKSPACE_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all',
                    isActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-white/55 hover:bg-white/[0.055] hover:text-white',
                  )
                }
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] text-white/45 transition-colors group-hover:text-sky-300">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{item.label}</span>
                  <span className="mt-0.5 block truncate text-[9px] font-normal text-white/35">
                    {item.desc}
                  </span>
                </span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="m-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            真实来源模式
          </div>
          <p className="mt-2 text-[9px] leading-4 text-white/35">
            GPT-5.6 Sol · 未观察到的身份和联系方式不会被推断。
          </p>
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
