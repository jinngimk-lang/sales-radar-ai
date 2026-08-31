import { Radar, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DiscoveryModeSwitch({
  mode,
  targetId,
}: {
  mode: 'recommend' | 'search'
  targetId?: string | null
}) {
  const suffix = targetId ? `?targetId=${encodeURIComponent(targetId)}` : ''

  return (
    <div className="mb-4 inline-flex rounded-xl border border-ink-200 bg-white p-1 shadow-sm" aria-label="发现模式">
      <ModeLink
        to={`/app/market${suffix}`}
        active={mode === 'recommend'}
        icon={Radar}
        label="推荐信号"
        hint="从公开来源发现变化"
      />
      <ModeLink
        to={`/app/discover${suffix}`}
        active={mode === 'search'}
        icon={Search}
        label="主动搜索"
        hint="按目标检索对象"
      />
    </div>
  )
}

function ModeLink({
  to,
  active,
  icon: Icon,
  label,
  hint,
}: {
  to: string
  active: boolean
  icon: typeof Radar
  label: string
  hint: string
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'flex min-w-32 items-center gap-2 rounded-lg bg-ink-950 px-3 py-2 text-white'
          : 'flex min-w-32 items-center gap-2 rounded-lg px-3 py-2 text-ink-600 transition hover:bg-ink-50 hover:text-ink-900'
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        <span className={active ? 'block text-[9px] text-white/60' : 'block text-[9px] text-ink-400'}>{hint}</span>
      </span>
    </Link>
  )
}
