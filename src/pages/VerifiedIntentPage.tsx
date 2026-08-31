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
import type { ChatSession, LeadOutcome } from '@/types'
import { getChatSessions, getLeadOutcome } from '@/services/api'
import {
  getCommunicationSummary,
  type CommunicationSummary,
} from '@/services/communication-evidence'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'

type OpportunityStage = 'REPLIED' | 'MEETING' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST'

const STAGE_LABELS: Record<OpportunityStage, string> = {
  REPLIED: '已回复',
  MEETING: '已约会议',
  QUALIFIED: '已确认机会',
  PROPOSAL: '方案阶段',
  WON: '已成交',
  LOST: '已关闭',
}

interface OpportunityRecord {
  session: ChatSession
  outcome: LeadOutcome | null
  communication: CommunicationSummary
  stage: OpportunityStage
}

export function VerifiedIntentPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<OpportunityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const sessions = await getChatSessions()
        const rows = await Promise.all(
          sessions.map(async (session) => {
            const [outcome, communication] = await Promise.all([
              getLeadOutcome(session.id).catch(() => null),
              getCommunicationSummary(session.id).catch(() => null),
            ])
            if (!communication) return null
            const stage = deriveOpportunityStage(outcome, communication)
            return stage ? { session, outcome, communication, stage } : null
          }),
        )
        if (!cancelled) {
          setRecords(rows.filter((row): row is OpportunityRecord => Boolean(row)))
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '暂时无法读取机会记录')
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
    const replied = records.filter((item) => item.stage === 'REPLIED').length
    const meetings = records.filter((item) => item.stage === 'MEETING').length
    const won = records.filter((item) => item.stage === 'WON').length
    return { replied, meetings, won }
  }, [records])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="机会"
        description="只把真实回复、会议凭证或独立业务结果推进到这里；预测分数和人工点选的旧沟通标签不算机会事实。"
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
        <EmptyOpportunityState />
      ) : (
        <div className="space-y-3">
          {records.map(({ session, outcome, communication, stage }) => (
            <article
              key={session.id}
              className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StageBadge stage={stage} />
                    <span className="text-[10px] text-ink-400">
                      {communication.lastEvent
                        ? `沟通事实 ${formatTime(communication.lastEvent.occurredAt)}`
                        : outcome
                          ? `业务结果 ${formatTime(outcome.updatedAt)}`
                          : '事实时间未知'}
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
                    {opportunityEvidenceCopy(outcome, communication, stage)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/app/customer/${encodeURIComponent(session.id)}`)}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
                >
                  继续推进
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

function deriveOpportunityStage(
  outcome: LeadOutcome | null,
  communication: CommunicationSummary,
): OpportunityStage | null {
  if (outcome?.status === 'WON') return 'WON'
  if (outcome?.status === 'LOST') return 'LOST'
  if (outcome?.status === 'PROPOSAL') return 'PROPOSAL'
  if (outcome?.status === 'QUALIFIED') return 'QUALIFIED'
  if (communication.state === 'MEETING') return 'MEETING'
  if (communication.state === 'REPLIED') return 'REPLIED'
  return null
}

function opportunityEvidenceCopy(
  outcome: LeadOutcome | null,
  communication: CommunicationSummary,
  stage: OpportunityStage,
) {
  if (stage === 'REPLIED' || stage === 'MEETING') {
    const event = communication.lastEvent
    if (!event) return '沟通状态来自后端可归因事实。'
    const source =
      event.verificationSource === 'PROVIDER_VERIFIED'
        ? '平台/API 回执'
        : '人工提交可归因凭证'
    return `${source} · ${event.channel}${event.externalEventId ? ` · ID ${event.externalEventId}` : ''}`
  }
  return outcome?.note?.trim() || `该阶段来自独立业务结果 ${STAGE_LABELS[stage]}。`
}

function StageBadge({ stage }: { stage: OpportunityStage }) {
  const icon =
    stage === 'WON' ? (
      <Trophy className="h-3 w-3" />
    ) : stage === 'MEETING' ? (
      <CalendarCheck2 className="h-3 w-3" />
    ) : stage === 'REPLIED' ? (
      <MessageCircleReply className="h-3 w-3" />
    ) : (
      <BadgeCheck className="h-3 w-3" />
    )

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
      {icon}
      {STAGE_LABELS[stage]}
    </span>
  )
}

function EmptyOpportunityState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 text-center">
      <BadgeCheck className="h-9 w-9 text-ink-300" />
      <h2 className="mt-3 text-sm font-semibold text-ink-900">暂无可推进机会</h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-ink-500">
        预测购买概率不会出现在这里。先完成真实搜索和沟通，出现可归因回复、会议或明确业务结果后才进入机会工作区。
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
          去发现
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
