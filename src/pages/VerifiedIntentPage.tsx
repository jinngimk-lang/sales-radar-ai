import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  LoaderCircle,
  MessageCircleReply,
  Search,
  Trophy,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { ChatSession, LeadOutcome, LeadOutcomeStatus } from '@/types'
import { getChatSessions, getLeadOutcome } from '@/services/api'
import { getUserFacingApiError } from '@/services/api-errors'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'

const VERIFIED_INTENT_STATUSES = new Set<LeadOutcomeStatus>([
  'REPLIED',
  'MEETING',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
])

const STATUS_LABELS: Record<LeadOutcomeStatus, string> = {
  NEW: '新发现',
  CONTACTED: '已联系',
  REPLIED: '已回复',
  MEETING: '已会议',
  QUALIFIED: '已确认机会',
  PROPOSAL: '方案阶段',
  WON: '已成交',
  LOST: '已关闭',
}

interface IntentRecord {
  session: ChatSession
  outcome: LeadOutcome
}

export function VerifiedIntentPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<IntentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const sessions = await getChatSessions()
        const outcomes = await Promise.all(
          sessions.map(async (session) => ({
            session,
            outcome: await getLeadOutcome(session.id).catch(() => null),
          })),
        )
        if (cancelled) return
        setRecords(
          outcomes.filter(
            (item): item is IntentRecord =>
              Boolean(
                item.outcome && VERIFIED_INTENT_STATUSES.has(item.outcome.status),
              ),
          ),
        )
      } catch (cause) {
        if (!cancelled) {
          setError(getUserFacingApiError(cause, '暂时无法读取意向记录'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const replied = records.filter((item) => item.outcome.status === 'REPLIED').length
    const meetings = records.filter((item) => item.outcome.status === 'MEETING').length
    const won = records.filter((item) => item.outcome.status === 'WON').length
    return { replied, meetings, won }
  }, [records])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="意向"
        description="这里只展示已有 LeadOutcome 记录支持的回复、会议、资格确认、方案或成交状态；预测分数不算事实。"
        actions={
          <div className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm">
            回复 {counts.replied} · 会议 {counts.meetings} · 成交 {counts.won}
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-ink-200 bg-white">
          <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
        </div>
      ) : records.length === 0 ? (
        <EmptyIntentState />
      ) : (
        <div className="space-y-3">
          {records.map(({ session, outcome }) => (
            <article
              key={outcome.id}
              className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={outcome.status} />
                    <span className="text-[10px] text-ink-400">
                      {formatTime(outcome.updatedAt)}
                    </span>
                  </div>
                  <h2 className="mt-3 truncate text-base font-semibold text-ink-950">
                    {session.customerName}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {session.displayName}
                    {session.company ? ` · ${session.company}` : ''}
                  </p>
                  <p className="mt-3 max-w-3xl text-xs leading-5 text-ink-600">
                    {outcome.note?.trim() || '该状态来自已保存的 LeadOutcome 记录。'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/app/customer/${encodeURIComponent(session.id)}`)}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
                >
                  查看对象
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: LeadOutcomeStatus }) {
  const icon =
    status === 'WON' ? (
      <Trophy className="h-3 w-3" />
    ) : status === 'MEETING' ? (
      <CalendarCheck2 className="h-3 w-3" />
    ) : status === 'REPLIED' ? (
      <MessageCircleReply className="h-3 w-3" />
    ) : (
      <BadgeCheck className="h-3 w-3" />
    )

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
      {icon}
      {STATUS_LABELS[status]}
    </span>
  )
}

function EmptyIntentState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 text-center">
      <BadgeCheck className="h-9 w-9 text-ink-300" />
      <h2 className="mt-3 text-sm font-semibold text-ink-900">暂无已验证意向</h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-ink-500">
        预测购买概率不会出现在这里。只有保存为真实回复、会议、资格确认、方案、成交或关闭的结果，才会进入意向工作区。
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          to="/app/communication"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
        >
          去沟通
        </Link>
        <Link
          to="/app/discover"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
        >
          <Search className="h-3.5 w-3.5" />
          去搜索
        </Link>
      </div>
    </div>
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
