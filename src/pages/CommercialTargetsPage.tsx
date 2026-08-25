import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CirclePause,
  CirclePlay,
  LoaderCircle,
  Plus,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'
import type { CommercialGoal } from '@/features/market-intelligence/market-intelligence.contract'
import {
  createCommercialTarget,
  listCommercialTargets,
  updateCommercialTarget,
  type CommercialTarget,
  type CommercialTargetStatus,
} from '@/services/commercial-targets'

const GOALS: Array<{ value: CommercialGoal; label: string }> = [
  { value: 'FIND_BUYERS', label: '找买家' },
  { value: 'FIND_SUPPLIERS', label: '找供应商' },
  { value: 'FIND_PARTNERS', label: '找合作伙伴' },
  { value: 'FIND_DISTRIBUTORS', label: '找渠道' },
  { value: 'RESEARCH_COMPETITORS', label: '研究竞品' },
  { value: 'EXPLORE_MARKET', label: '探索市场' },
]

const STATUS_LABELS: Record<CommercialTargetStatus, string> = {
  DRAFT: '草稿',
  ACTIVE: '进行中',
  PAUSED: '已暂停',
  CLOSED: '已关闭',
}

export function CommercialTargetsPage() {
  const [targets, setTargets] = useState<CommercialTarget[]>([])
  const [name, setName] = useState('')
  const [product, setProduct] = useState('')
  const [goal, setGoal] = useState<CommercialGoal>('FIND_BUYERS')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeCount = useMemo(
    () => targets.filter((target) => target.status === 'ACTIVE').length,
    [targets],
  )

  useEffect(() => {
    let cancelled = false
    listCommercialTargets()
      .then((items) => {
        if (!cancelled) setTargets(items)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '暂时无法读取目标')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 2 || product.trim().length < 2 || saving) return

    setSaving(true)
    setError(null)
    try {
      const created = await createCommercialTarget({
        name: name.trim(),
        product: product.trim(),
        goal,
        signalFocus: 'ALL',
        status: 'ACTIVE',
      })
      setTargets((current) => [created, ...current])
      setName('')
      setProduct('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '目标创建失败')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (
    target: CommercialTarget,
    status: CommercialTargetStatus,
  ) => {
    if (updatingId) return
    setUpdatingId(target.id)
    setError(null)
    try {
      const updated = await updateCommercialTarget(target.id, { status })
      setTargets((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '目标状态更新失败')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="目标"
        description="保存长期商业需求，在推荐、搜索和市场研究之间复用同一份上下文。"
        actions={
          <div className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm">
            进行中 {activeCount} · 全部 {targets.length}
          </div>
        }
      />

      <section className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">新建商业目标</h2>
            <p className="mt-0.5 text-[10px] text-ink-500">
              目标只是你的需求配置，不会自动生成客户、机会或意向。
            </p>
          </div>
        </div>

        <form
          onSubmit={handleCreate}
          className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_0.9fr_auto]"
        >
          <label className="block">
            <span className="text-[10px] font-medium text-ink-500">目标名称</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder="例如：欧洲工业机器人买家"
              className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium text-ink-500">产品 / 服务</span>
            <input
              value={product}
              onChange={(event) => setProduct(event.target.value)}
              maxLength={200}
              placeholder="输入你要围绕什么做研究"
              className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium text-ink-500">商业目标</span>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value as CommercialGoal)}
              className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10"
            >
              {GOALS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              type="submit"
              className="h-11 w-full lg:w-auto"
              disabled={saving || name.trim().length < 2 || product.trim().length < 2}
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              保存目标
            </Button>
          </div>
        </form>
      </section>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">已保存目标</h2>
            <p className="mt-1 text-[10px] text-ink-500">
              选择一个目标进入市场雷达，系统会精确恢复它的研究条件。
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-ink-200 bg-white">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
          </div>
        ) : targets.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 text-center">
            <Target className="h-8 w-8 text-ink-300" />
            <h3 className="mt-3 text-sm font-semibold text-ink-900">还没有保存目标</h3>
            <p className="mt-2 max-w-sm text-xs leading-5 text-ink-500">
              先保存一个真实的商业需求。没有目标时，推荐和市场雷达仍然可以按临时输入运行。
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                updating={updatingId === target.id}
                onStatusChange={changeStatus}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function TargetCard({
  target,
  updating,
  onStatusChange,
}: {
  target: CommercialTarget
  updating: boolean
  onStatusChange: (
    target: CommercialTarget,
    status: CommercialTargetStatus,
  ) => void
}) {
  const goalLabel = GOALS.find((item) => item.value === target.goal)?.label ?? target.goal
  const details = [target.industry, target.region, target.customerType].filter(Boolean)

  return (
    <article className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
              {goalLabel}
            </span>
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
              {STATUS_LABELS[target.status]}
            </span>
          </div>
          <h3 className="mt-3 truncate text-base font-semibold text-ink-950">
            {target.name}
          </h3>
          <p className="mt-1 text-xs leading-5 text-ink-600">{target.product}</p>
        </div>
        <Target className="h-5 w-5 shrink-0 text-ink-300" />
      </div>

      <div className="mt-4 min-h-5 text-[10px] text-ink-400">
        {details.length > 0 ? details.join(' · ') : '未限定行业、地区或对象类型'}
      </div>
      <div className="mt-2 text-[10px] text-ink-400">
        最近成功研究：{target.lastRunAt ? formatTime(target.lastRunAt) : '尚未运行'}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4">
        <div className="flex items-center gap-1.5">
          {target.status === 'ACTIVE' ? (
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(target, 'PAUSED')}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900 disabled:opacity-50"
            >
              {updating ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CirclePause className="h-3.5 w-3.5" />
              )}
              暂停
            </button>
          ) : target.status === 'PAUSED' || target.status === 'DRAFT' ? (
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(target, 'ACTIVE')}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium text-ink-500 transition hover:bg-ink-50 hover:text-ink-900 disabled:opacity-50"
            >
              {updating ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CirclePlay className="h-3.5 w-3.5" />
              )}
              启用
            </button>
          ) : null}
        </div>

        <Link
          to={`/app/market?targetId=${encodeURIComponent(target.id)}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
        >
          去市场雷达
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
