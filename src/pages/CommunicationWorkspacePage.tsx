import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ContactRound,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { ChatSession } from '@/types'
import { getChatSessions } from '@/services/api'
import {
  getCommunicationSummary,
  type CommunicationSummary,
} from '@/services/communication-evidence'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'

const STATE_LABEL: Record<CommunicationSummary['state'], string> = {
  RESEARCH: '待补联系人',
  READY: '可联系',
  SENT: '已发送',
  REPLIED: '已回复',
  MEETING: '已约会议',
}

const POSITIVE_STATES = new Set<CommunicationSummary['state']>([
  'SENT',
  'REPLIED',
  'MEETING',
])

export function CommunicationWorkspacePage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [summaries, setSummaries] = useState<Record<string, CommunicationSummary>>({})
  const [summaryFailures, setSummaryFailures] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await getChatSessions()
        if (cancelled) return
        setSessions(items)

        const settled = await Promise.allSettled(
          items.map(async (item) => ({
            id: item.id,
            summary: await getCommunicationSummary(item.id),
          })),
        )
        if (cancelled) return

        const nextSummaries: Record<string, CommunicationSummary> = {}
        const failed = new Set<string>()
        settled.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            nextSummaries[result.value.id] = result.value.summary
          } else {
            failed.add(items[index]?.id ?? '')
          }
        })
        failed.delete('')
        setSummaries(nextSummaries)
        setSummaryFailures(failed)
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '暂时无法读取沟通对象')
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

  const metrics = useMemo(() => {
    let positive = 0
    let ready = 0
    let research = 0

    for (const session of sessions) {
      const summary = summaries[session.id]
      if (summary && POSITIVE_STATES.has(summary.state)) {
        positive += 1
      } else if (summary?.state === 'READY' || (!summary && session.contacts.length > 0)) {
        ready += 1
      } else {
        research += 1
      }
    }

    return { positive, ready, research }
  }, [sessions, summaries])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="沟通"
        description="按真实联系人和可归因沟通回执推进；生成话术本身不会改变状态。"
        actions={
          <div className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm">
            已推进 {metrics.positive} · 可联系 {metrics.ready} · 待补证 {metrics.research}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-xs text-brand-800">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          “已发送 / 已回复 / 已约会议”只来自后端沟通事实；读取失败时不会回退成正向状态。
        </span>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-ink-200 bg-white">
          <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyCommunicationState />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          {sessions.map((session, index) => {
            const summary = summaries[session.id]
            const summaryFailed = summaryFailures.has(session.id)
            const fallbackState: CommunicationSummary['state'] =
              session.contacts.length > 0 ? 'READY' : 'RESEARCH'
            const state = summary?.state ?? fallbackState
            const lastEvent = summary?.lastEvent ?? null
            const contactLabel =
              session.contacts.length > 0
                ? `${session.contacts.length} 个公开联系人`
                : '尚未发现可归因公开联系人'

            return (
              <article
                key={session.id}
                className={
                  index === 0
                    ? 'p-5 sm:p-6'
                    : 'border-t border-ink-100 p-5 sm:p-6'
                }
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
                        {session.platform}
                      </span>
                      <StateBadge state={state} verified={Boolean(summary)} />
                      {summaryFailed ? (
                        <span className="text-[10px] font-medium text-amber-700">
                          状态同步失败，仅显示联系人准备度
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-start gap-3">
                      <ContactRound className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-ink-950">
                          {session.customerName}
                        </h2>
                        <p className="mt-1 text-xs text-ink-500">
                          {session.displayName}
                          {session.jobTitle ? ` · ${session.jobTitle}` : ''}
                        </p>
                        <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-ink-600">
                          {session.communicationProfile.evidenceExcerpt || session.postContent}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-2 md:w-[390px]">
                    <Meta label="联系人" value={contactLabel} />
                    <Meta
                      label={lastEvent ? '最近沟通事实' : '建议渠道'}
                      value={
                        lastEvent
                          ? `${lastEvent.channel} · ${formatRelativeTime(lastEvent.occurredAt)}`
                          : session.communicationProfile.preferredPlatform || '待判断'
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                  <div className="min-w-0 text-[10px] text-ink-400">
                    {lastEvent ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span>
                          {lastEvent.verificationSource === 'PROVIDER_VERIFIED'
                            ? '平台/API 回执'
                            : '人工提交可归因凭证'}
                        </span>
                        {lastEvent.externalEventId ? (
                          <span className="max-w-xs truncate font-mono">
                            ID {lastEvent.externalEventId}
                          </span>
                        ) : null}
                        {lastEvent.evidenceUrl ? (
                          <a
                            href={lastEvent.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                          >
                            查看凭证
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </span>
                    ) : (
                      session.communicationProfile.basis ||
                      '当前只有公开来源与联系人证据，尚无真实沟通回执'
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/app/customer/${encodeURIComponent(session.id)}`)
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
                  >
                    {POSITIVE_STATES.has(state) ? '查看沟通事实' : '准备并记录沟通'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StateBadge({
  state,
  verified,
}: {
  state: CommunicationSummary['state']
  verified: boolean
}) {
  const positive = POSITIVE_STATES.has(state)
  const classes = positive
    ? 'bg-emerald-50 text-emerald-700'
    : state === 'READY'
      ? 'bg-brand-50 text-brand-700'
      : 'bg-amber-50 text-amber-700'
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${classes}`}>
      {STATE_LABEL[state]}
      {positive && verified ? ' · 已验证' : ''}
    </span>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="text-[9px] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="mt-1 truncate text-[11px] font-medium text-ink-700">
        {value}
      </div>
    </div>
  )
}

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return '时间未知'
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function EmptyCommunicationState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 text-center">
      <MessageSquareText className="h-9 w-9 text-ink-300" />
      <h2 className="mt-3 text-sm font-semibold text-ink-900">
        还没有可进入沟通流程的对象
      </h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-ink-500">
        先从推荐或主动搜索获得真实来源与对象记录，再核对公开联系人并准备沟通。
      </p>
      <Link
        to="/app/discover"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
      >
        <Search className="h-3.5 w-3.5" />
        去搜索
      </Link>
    </div>
  )
}
