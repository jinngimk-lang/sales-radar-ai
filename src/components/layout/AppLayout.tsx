import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Telescope,
  BriefcaseBusiness,
  MessageCircleMore,
  ChartNoAxesCombined,
  CircleUserRound,
  Settings2,
  Sparkles,
  WalletCards,
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
    to: '/app/revenue',
    label: '收益控制台',
    icon: WalletCards,
    desc: '机会排序、收益与结算证据',
  },
  {
    to: '/app/assistant',
    label: 'AI 销售助手',
    icon: MessageCircleMore,
    desc: '分析、策略与推荐动作',
  },
]

const ACCOUNT_ITEM = {
  to: '/app/account',
  label: '账户与设置',
  icon: CircleUserRound,
  desc: '账户、AI 与数据源状态',
}

/** 工作台主布局：左侧导航 + 顶部 + 内容区 */
export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* 侧边栏 */}
      <aside className="app-sidebar hidden w-[272px] shrink-0 flex-col lg:flex">
        <div className="flex h-[84px] items-center border-b border-white/10 px-6">
          <Link
            to="/"
            aria-label="返回 Sales Radar AI 首页"
            className="flex items-center gap-3"
          >
            <Logo variant="light" />
            <span className="hidden rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-1 text-[8px] font-bold tracking-[0.16em] text-white/45 xl:inline">
              WORKSPACE
            </span>
          </Link>
        </div>

        <div className="px-4 pt-5">
          <Link
            to="/app/dashboard"
            className="group flex w-full items-center justify-between rounded-xl border border-sky-300/20 bg-sky-300 px-4 py-3.5 text-sm font-semibold text-brand-950 shadow-[0_12px_28px_-16px_rgba(56,189,248,0.9)] transition-all hover:-translate-y-0.5 hover:bg-sky-200"
          >
            <span className="flex items-center gap-2">
              <Telescope className="h-[18px] w-[18px]" />
              开始市场扫描
            </span>
            <Sparkles className="h-4 w-4 text-brand-800" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-7 scrollbar-thin">
          <NavSection label="Workspace" items={WORKSPACE_ITEMS} />
        </nav>

        <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/[0.055] p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            收益工作流
          </div>
          <p className="mt-2 text-[10px] leading-5 text-white/40">
            发现机会 → 核验证据 → 执行任务 → 确认结算
          </p>
        </div>

        <div className="border-t border-white/10 p-4">
          <Link
            to="/app/account"
            className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.06]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.07] text-sky-300">
              <CircleUserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/85">账户与设置</p>
              <p className="truncate text-xs text-white/40">AI、数据源与工作区</p>
            </div>
            <Settings2 className="h-4 w-4 text-white/30" />
          </Link>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="app-workspace-canvas flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏（移动端） */}
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-brand-950 px-4 lg:hidden">
          <Link to="/" aria-label="返回 Sales Radar AI 首页">
            <Logo variant="light" />
          </Link>
          <div className="flex items-center gap-1">
            {[...WORKSPACE_ITEMS, ACCOUNT_ITEM].map((item) => (
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
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
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
                  ? 'bg-white/10 text-white'
                  : 'text-white/55 hover:bg-white/[0.055] hover:text-white',
              )
            }
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] text-white/45 transition-colors group-hover:text-sky-300">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{item.label}</span>
              <span className="mt-0.5 block truncate text-[10px] font-normal text-white/35">
                {item.desc}
              </span>
            </span>
          </NavLink>
        ))}
      </div>
    </section>
  )
}
