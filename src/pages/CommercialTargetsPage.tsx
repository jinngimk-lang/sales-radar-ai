import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowRight,
  ChevronDown,
  CirclePause,
  CirclePlay,
  LoaderCircle,
  Pencil,
  Plus,
  Radar,
  Search,
  Target,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'
import type {
  CommercialGoal,
  SignalFocus,
} from '@/features/market-intelligence/market-intelligence.contract'
import { runMarketResearch } from '@/services/api'
import {
  createCommercialTarget,
  listCommercialTargets,
  updateCommercialTarget,
  type CommercialTarget,
  type CommercialTargetInput,
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

const SIGNAL_FOCUS_OPTIONS: Array<{ value: SignalFocus; label: string }> = [
  { value: 'ALL', label: '全部信号' },
  { value: 'FACTORY_EXPANSION', label: '扩产 / 建厂' },
  { value: 'INVESTMENT', label: '投资 / 融资' },
  { value: 'DIGITAL_TRANSFORMATION', label: '数字化升级' },
  { value: 'HIRING_SIGNAL', label: '招聘信号' },
  { value: 'POLICY_CHANGE', label: '政策变化' },
  { value: 'INDUSTRY_TREND', label: '行业趋势' },
]

const REGION_OPTIONS: Array<{
  value: NonNullable<CommercialTarget['region']>
  label: string
}> = [
  { value: 'USA', label: '美国' },
  { value: 'Europe', label: '欧洲' },
  { value: 'SoutheastAsia', label: '东南亚' },
  { value: 'China', label: '中国' },
  { value: 'MiddleEast', label: '中东' },
]

const CUSTOMER_TYPE_OPTIONS: Array<{
  value: NonNullable<CommercialTarget['customerType']>
  label: string
}> = [
  { value: 'Buyer', label: '买方' },
  { value: 'Company', label: '企业' },
  { value: 'Agent', label: '渠道 / 代理' },
  { value: 'Individual', label: '个人' },
]

const STATUS_LABELS: Record<CommercialTargetStatus, string> = {
  DRAFT: '草稿',
  ACTIVE: '进行中',
  PAUSED: '已暂停',
  CLOSED: '已关闭',
}

type TargetDraft = Pick<
  CommercialTargetInput,
  'name' | 'product' | 'industry' | 'region' | 'customerType' | 'goal' | 'signalFocus'
>

const EMPTY_DRAFT: TargetDraft = {
  name: '',
  product: '',
  industry: null,
  region: null,
  customerType: null,
  goal: 'FIND_BUYERS',
  signalFocus: 'ALL',
}

export function CommercialTargetsPage() {
  const [targets, setTargets] = useState<CommercialTarget[]>([])
  const [draft, setDraft] = useState<TargetDraft>(EMPTY_DRAFT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<TargetDraft>(EMPTY_DRAFT)
  const [expandedProgressId, setExpandedProgressId] = useState<string | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTargets = useCallback(async () => {
    const items = await listCommercialTargets()
    setTargets(items)
    return items
  }, [])

  useEffect(() => {
    let cancelled = false
    refreshTargets()
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
  }, [refreshTargets])

  const hasRunningTarget =
    Boolean(runningId) || targets.some((target) => target.lastRunStatus === 'RUNNING')

  useEffect(() => {
    if (!hasRunningTarget) return
    const timer = window.setInterval(() => {
      void refreshTargets().catch(() => undefined)
    }, 2500)
    return () => window.clearInterval(timer)
  }, [hasRunningTarget, refreshTargets])

  const activeTargets = useMemo(
    () => targets.filter((target) => target.status !== 'CLOSED'),
    [targets],
  )
  const closedTargets = useMemo(
    () => targets.filter((target) => target.status === 'CLOSED'),
    [targets],
  )
  const activeCount = useMemo(
    () => targets.filter((target) => target.status === 'ACTIVE').length,
    [targets],
  )

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValidDraft(draft) || saving) return
    setSaving(true)
    setError(null)
    try {
      const created = await createCommercialTarget(normalizeDraft(draft))
      setTargets((current) => [created, ...current])
      setDraft(EMPTY_DRAFT)
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
    if (updatingId || target.lastRunStatus === 'RUNNING') return
    setUpdatingId(target.id)
    setError(null)
    try {
      const updated = await updateCommercialTarget(target.id, { status })
      replaceTarget(updated)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '目标状态更新失败')
    } finally {
      setUpdatingId(null)
    }
  }

  const closeTarget = async (target: CommercialTarget) => {
    if (target.lastRunStatus === 'RUNNING') return
    if (!window.confirm(`关闭“${target.name}”？关闭后不会再作为发现/搜索的活动目标。`)) {
      return
    }
    await changeStatus(target, 'CLOSED')
  }

  const runTarget = async (target: CommercialTarget) => {
    if (target.status !== 'ACTIVE' || runningId || target.lastRunStatus === 'RUNNING') return
    setRunningId(target.id)
    setExpandedProgressId(target.id)
    setError(null)
    try {
      await runMarketResearch({
        product: target.product,
        industry: target.industry || undefined,
        region: target.region || undefined,
        customerType: target.customerType || undefined,
        goal: target.goal,
        signalFocus: target.signalFocus,
        targetId: target.id,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '目标运行失败')
    } finally {
      await refreshTargets().catch(() => undefined)
      setRunningId(null)
    }
  }

  const startEditing = (target: CommercialTarget) => {
    setEditingId(target.id)
    setEditDraft({
      name: target.name,
      product: target.product,
      industry: target.industry,
      region: target.region,
      customerType: target.customerType,
      goal: target.goal,
      signalFocus: target.signalFocus,
    })
  }

  const saveEdit = async (target: CommercialTarget) => {
    if (!isValidDraft(editDraft) || updatingId) return
    setUpdatingId(target.id)
    setError(null)
    try {
      const updated = await updateCommercialTarget(target.id, normalizeDraft(editDraft))
      replaceTarget(updated)
      setEditingId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '目标更新失败')
    } finally {
      setUpdatingId(null)
    }
  }

  const replaceTarget = (updated: CommercialTarget) => {
    setTargets((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="目标"
        description="定义长期商业任务，控制运行、暂停、关闭，并复用到发现与搜索。"
        actions={
          <div className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm">
            运行中 {activeCount} · 已关闭 {closedTargets.length}
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
              保存后可立即运行，也可进入发现或主动搜索继续工作。
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <TargetFields draft={draft} onChange={setDraft} />
          <div className="flex justify-end">
            <Button type="submit" className="h-10" disabled={saving || !isValidDraft(draft)}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">当前目标</h2>
            <p className="mt-1 text-[10px] text-ink-500">
              进度来自后端真实运行状态；没有运行就不显示虚假百分比。
            </p>
          </div>
          {closedTargets.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowClosed((value) => !value)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 text-[10px] font-semibold text-ink-600 hover:bg-ink-50"
            >
              <Archive className="h-3.5 w-3.5" />
              已关闭 {closedTargets.length}
              <ChevronDown className={`h-3.5 w-3.5 transition ${showClosed ? 'rotate-180' : ''}`} />
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-ink-200 bg-white">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
          </div>
        ) : activeTargets.length === 0 ? (
          <EmptyTargets />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeTargets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                updating={updatingId === target.id}
                running={runningId === target.id || target.lastRunStatus === 'RUNNING'}
                editing={editingId === target.id}
                editDraft={editDraft}
                progressOpen={expandedProgressId === target.id}
                onEditDraftChange={setEditDraft}
                onStartEdit={() => startEditing(target)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={() => void saveEdit(target)}
                onToggleProgress={() =>
                  setExpandedProgressId((current) => (current === target.id ? null : target.id))
                }
                onRun={() => void runTarget(target)}
                onStatusChange={(status) => void changeStatus(target, status)}
                onClose={() => void closeTarget(target)}
              />
            ))}
          </div>
        )}

        {showClosed && closedTargets.length > 0 ? (
          <div className="mt-5">
            <h3 className="mb-3 px-1 text-xs font-semibold text-ink-600">已关闭</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {closedTargets.map((target) => (
                <TargetCard
                  key={target.id}
                  target={target}
                  updating={updatingId === target.id}
                  running={false}
                  editing={false}
                  editDraft={EMPTY_DRAFT}
                  progressOpen={expandedProgressId === target.id}
                  onEditDraftChange={() => undefined}
                  onStartEdit={() => undefined}
                  onCancelEdit={() => undefined}
                  onSaveEdit={() => undefined}
                  onToggleProgress={() =>
                    setExpandedProgressId((current) => (current === target.id ? null : target.id))
                  }
                  onRun={() => undefined}
                  onStatusChange={(status) => void changeStatus(target, status)}
                  onClose={() => undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function TargetCard({
  target,
  updating,
  running,
  editing,
  editDraft,
  progressOpen,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleProgress,
  onRun,
  onStatusChange,
  onClose,
}: {
  target: CommercialTarget
  updating: boolean
  running: boolean
  editing: boolean
  editDraft: TargetDraft
  progressOpen: boolean
  onEditDraftChange: (value: TargetDraft) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onToggleProgress: () => void
  onRun: () => void
  onStatusChange: (status: CommercialTargetStatus) => void
  onClose: () => void
}) {
  const goalLabel = GOALS.find((item) => item.value === target.goal)?.label ?? target.goal
  const details = [target.industry, target.region, target.customerType].filter(Boolean)
  const closed = target.status === 'CLOSED'

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-card ${closed ? 'border-ink-100 opacity-80' : 'border-ink-200'}`}>
      {editing ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">编辑目标</h3>
            <button type="button" onClick={onCancelEdit} className="text-ink-400 hover:text-ink-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <TargetFields draft={editDraft} onChange={onEditDraftChange} compact />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={onCancelEdit} className="h-9 rounded-lg px-3 text-xs font-medium text-ink-500 hover:bg-ink-50">
              取消
            </button>
            <button type="button" onClick={onSaveEdit} disabled={updating || !isValidDraft(editDraft)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink-950 px-3 text-xs font-semibold text-white disabled:opacity-40">
              {updating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
              保存修改
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
                  {goalLabel}
                </span>
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
                  {STATUS_LABELS[target.status]}
                </span>
                <RunStatusBadge target={target} />
              </div>
              <h3 className="mt-3 truncate text-base font-semibold text-ink-950">{target.name}</h3>
              <p className="mt-1 text-xs leading-5 text-ink-600">{target.product}</p>
            </div>
            <Target className="h-5 w-5 shrink-0 text-ink-300" />
          </div>

          <div className="mt-4 text-[10px] text-ink-400">
            {details.length > 0 ? details.join(' · ') : '未限定行业、地区或对象类型'}
          </div>
          <div className="mt-2 text-[10px] text-ink-400">
            最近成功研究：{target.lastRunAt ? formatTime(target.lastRunAt) : '尚未运行'}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onToggleProgress} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 text-[10px] font-semibold text-ink-600 hover:bg-ink-50">
              <Radar className="h-3.5 w-3.5" />
              查看进度
            </button>
            {!closed ? (
              <button type="button" onClick={onStartEdit} disabled={running} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 text-[10px] font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40">
                <Pencil className="h-3.5 w-3.5" />
                编辑
              </button>
            ) : null}
          </div>

          {progressOpen ? <TargetProgress target={target} /> : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4">
            <div className="flex flex-wrap items-center gap-1">
              {target.status === 'ACTIVE' ? (
                <>
                  <button type="button" disabled={updating || running} onClick={onRun} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40">
                    {running ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CirclePlay className="h-3.5 w-3.5" />}
                    立即运行
                  </button>
                  <button type="button" disabled={updating || running} onClick={() => onStatusChange('PAUSED')} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium text-ink-500 hover:bg-ink-50 disabled:opacity-40">
                    <CirclePause className="h-3.5 w-3.5" />
                    暂停
                  </button>
                  <button type="button" disabled={updating || running} onClick={onClose} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                    <Archive className="h-3.5 w-3.5" />
                    关闭
                  </button>
                </>
              ) : target.status === 'PAUSED' || target.status === 'DRAFT' ? (
                <>
                  <button type="button" disabled={updating} onClick={() => onStatusChange('ACTIVE')} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40">
                    <CirclePlay className="h-3.5 w-3.5" />
                    启用
                  </button>
                  <button type="button" disabled={updating} onClick={onClose} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                    <Archive className="h-3.5 w-3.5" />
                    关闭
                  </button>
                </>
              ) : (
                <button type="button" disabled={updating} onClick={() => onStatusChange('ACTIVE')} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40">
                  <CirclePlay className="h-3.5 w-3.5" />
                  重新启用
                </button>
              )}
            </div>

            {target.status === 'ACTIVE' ? (
              <div className="flex flex-wrap gap-2">
                <Link to={`/app/discover?targetId=${encodeURIComponent(target.id)}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50">
                  <Search className="h-3.5 w-3.5" />
                  去搜索
                </Link>
                <Link to={`/app/market?targetId=${encodeURIComponent(target.id)}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3 text-xs font-semibold text-white hover:bg-ink-800">
                  去市场雷达
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}

function TargetProgress({ target }: { target: CommercialTarget }) {
  return (
    <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/70 p-3 text-[11px] text-ink-600">
      <div className="grid gap-2 sm:grid-cols-2">
        <ProgressItem label="状态" value={runStatusLabel(target)} />
        <ProgressItem label="开始" value={target.lastRunStartedAt ? formatTime(target.lastRunStartedAt) : '—'} />
        <ProgressItem label="完成" value={target.lastRunCompletedAt ? formatTime(target.lastRunCompletedAt) : '—'} />
        <ProgressItem
          label="结果"
          value={
            target.lastRunStatus === 'COMPLETED'
              ? `${target.lastRunSourceCount ?? 0} 个来源 · ${target.lastRunSignalCount ?? 0} 条信号`
              : '—'
          }
        />
      </div>
      {target.lastRunErrorCode ? (
        <div className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 font-mono text-[10px] text-rose-700">
          {target.lastRunErrorCode}
        </div>
      ) : null}
    </div>
  )
}

function RunStatusBadge({ target }: { target: CommercialTarget }) {
  const label = runStatusLabel(target)
  const className =
    target.lastRunStatus === 'RUNNING'
      ? 'bg-sky-50 text-sky-700'
      : target.lastRunStatus === 'COMPLETED'
        ? 'bg-emerald-50 text-emerald-700'
        : target.lastRunStatus === 'FAILED'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-white text-ink-400 ring-1 ring-ink-200'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${className}`}>{label}</span>
}

function runStatusLabel(target: CommercialTarget) {
  if (target.lastRunStatus === 'RUNNING') return '研究中'
  if (target.lastRunStatus === 'COMPLETED') return '最近已完成'
  if (target.lastRunStatus === 'FAILED') return '最近失败'
  return '未运行'
}

function ProgressItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-ink-400">{label}：</span>
      <span className="font-medium text-ink-700">{value}</span>
    </div>
  )
}

function TargetFields({
  draft,
  onChange,
  compact = false,
}: {
  draft: TargetDraft
  onChange: (value: TargetDraft) => void
  compact?: boolean
}) {
  const fieldClass = 'mt-1.5 h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-xs text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10'
  return (
    <div className={compact ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4'}>
      <Field label="目标名称">
        <input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} maxLength={120} placeholder="例如：欧洲工业机器人买家" className={fieldClass} />
      </Field>
      <Field label="产品 / 服务">
        <input value={draft.product} onChange={(event) => onChange({ ...draft, product: event.target.value })} maxLength={200} placeholder="你要围绕什么做研究" className={fieldClass} />
      </Field>
      <Field label="商业目标">
        <select value={draft.goal} onChange={(event) => onChange({ ...draft, goal: event.target.value as CommercialGoal })} className={fieldClass}>
          {GOALS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="行业">
        <input value={draft.industry ?? ''} onChange={(event) => onChange({ ...draft, industry: event.target.value || null })} maxLength={120} placeholder="可选，如 AI / 电池" className={fieldClass} />
      </Field>
      <Field label="地区">
        <select value={draft.region ?? ''} onChange={(event) => onChange({ ...draft, region: (event.target.value || null) as TargetDraft['region'] })} className={fieldClass}>
          <option value="">不限</option>
          {REGION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="对象类型">
        <select value={draft.customerType ?? ''} onChange={(event) => onChange({ ...draft, customerType: (event.target.value || null) as TargetDraft['customerType'] })} className={fieldClass}>
          <option value="">不限</option>
          {CUSTOMER_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="关注信号">
        <select value={draft.signalFocus ?? 'ALL'} onChange={(event) => onChange({ ...draft, signalFocus: event.target.value as SignalFocus })} className={fieldClass}>
          {SIGNAL_FOCUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium text-ink-500">{label}</span>
      {children}
    </label>
  )
}

function EmptyTargets() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 text-center">
      <Target className="h-8 w-8 text-ink-300" />
      <h3 className="mt-3 text-sm font-semibold text-ink-900">没有活动目标</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-ink-500">
        新建目标后可以直接运行研究，或进入发现和搜索继续工作。
      </p>
    </div>
  )
}

function normalizeDraft(draft: TargetDraft): CommercialTargetInput {
  return {
    name: draft.name.trim(),
    product: draft.product.trim(),
    industry: draft.industry?.trim() || null,
    region: draft.region || null,
    customerType: draft.customerType || null,
    goal: draft.goal,
    signalFocus: draft.signalFocus ?? 'ALL',
    status: 'ACTIVE',
  }
}

function isValidDraft(draft: TargetDraft) {
  return draft.name.trim().length >= 2 && draft.product.trim().length >= 2
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
