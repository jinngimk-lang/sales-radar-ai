import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

const FOOTER_LINKS = [
  {
    title: '产品',
    links: [
      { label: '销售机会', href: '/app/discover' },
      { label: 'AI 销售助手', href: '/app/assistant' },
      { label: '市场机会中心', href: '/app/dashboard' },
      { label: '客户详情', href: '/app/customer/cus_001' },
    ],
  },
  {
    title: '解决方案',
    links: [
      { label: '外贸销售', href: '/#solutions' },
      { label: '销售团队', href: '/#solutions' },
      { label: '企业销售', href: '/#solutions' },
      { label: '营销获客', href: '/#solutions' },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '帮助中心', href: '/#' },
      { label: 'API 文档', href: '/#' },
      { label: '行业报告', href: '/#' },
      { label: '博客', href: '/#' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', href: '/#' },
      { label: '加入我们', href: '/#' },
      { label: '联系销售', href: '/#' },
      { label: '隐私政策', href: '/#' },
    ],
  },
]

/** Landing Page 底部 */
export function PublicFooter() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              销售机会发现平台。帮助销售发现企业动向、市场机会和值得跟进的潜在客户。
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-ink-900">{group.title}</h4>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-ink-500 transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">
            © 2026 Sales Radar AI. 保留所有权利。
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-400">
            <span>服务条款</span>
            <span>隐私政策</span>
            <span>Cookie 设置</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
