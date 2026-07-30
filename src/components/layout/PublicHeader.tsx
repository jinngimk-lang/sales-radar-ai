import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: '产品', href: '/#features' },
  { label: '解决方案', href: '/#solutions' },
  { label: '行业', href: '/#industries' },
  { label: '价格', href: '/#pricing' },
]

/** Landing Page 顶部导航 */
export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-xs font-medium tracking-wide text-ink-500 transition-colors hover:text-ink-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/app/discover"
            className={cn(
              'btn-ghost',
              location.pathname.startsWith('/app') && 'text-brand-600',
            )}
          >
            登录
          </Link>
          <Link
            to="/app/discover"
            className="inline-flex items-center rounded-full bg-brand-900 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-700"
          >
            开始发现
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-ink-600 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="菜单"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link to="/app/discover" className="btn-secondary w-full">
                登录
              </Link>
              <Link to="/app/discover" className="btn-primary w-full">
                开始发现机会
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
