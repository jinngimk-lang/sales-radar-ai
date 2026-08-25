import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ContactRound,
  LoaderCircle,
  MessageSquareText,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { ChatSession } from '@/types'
import { getChatSessions } from '@/services/api'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'

export function CommunicationWorkspacePage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getChatSessions()
      .then((items) => {
        if (!cancelled) setSessions(items)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '暂时无法读取沟通对象')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const readyCount = useMemo(
    () => sessions.filter((item) => item.contacts.length > 0).length,
    [sessions],
  )
  const researchCount = sessions.length - readyCount

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="沟通"
        description="把已发现的真实对象带入沟通准备；没有发送回执就不显示“已发送”或“已回复”。"
        actions={
          <div className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm">
            可联系 {readyCount} · 待补证 {researchCount}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-xs text-brand-800">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          这里展示的是搜索/研究得到的对象与公开联系人证据，不把生成话术、打开外部渠道或预测意向冒充成真实沟通结果。
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
        <div className="grid gap-3 lg:grid-cols-2">
          {sessions.map((session) => {
            const hasPublicContact = session.contacts.length > 0
            const contactLabel = hasPublicContact
              ? `${session.contacts.length} 个公开联系人`
              : '尚未发现可归因公开联系人'

            return (
              <article
                key={session.id}
                className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
                        {session.platform}
                      </span>
                      <span
                        className={
                          hasPublicContact
                            ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700'
                            : 'rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700'
                        }
                      >
                        {hasPublicContact ? '可准备沟通' : '先补联系人证据'}
                      </span>
                    </div>
                    <h2 className="mt-3 truncate text-base font-semibold text-ink-950">
                      {session.customerName}
                    </h2>
                    <p className="mt-1 text-xs text-ink-500">
                      {session.displayName}
                      {session.jobTitle ? ` · ${session.jobTitle}` : ''}
                    </p>
                  </div>
                  <ContactRound className="h-5 w-5 shrink-0 text-ink-300" />
                </div>

                <p className="mt-4 line-clamp-3 text-xs leading-5 text-ink-600">
                  {session.communicationProfile.evidenceExcerpt || session.postContent}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Meta label="联系人" value={contactLabel} />
                  <Meta
                    label="建议渠道"
                    value={session.communicationProfile.preferredPlatform || '待判断'}
                  />
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4">
                  <div className="text-[10px] text-ink-400">
                    {session.communicationProfile.basis || '基于当前来源与联系人证据生成沟通建议'}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/customer/${encodeURIComponent(session.id)}`)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800"
                  >
                    准备沟通
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <div className="text-[9px] font-medium uppercase tracking-wide text-ink-400">
        {label}
      </div>
      <div className="mt-1 truncate text-[11px] font-medium text-ink-700">{value}</div>
    </div>
  )
}

function EmptyCommunicationState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 text-center">
      <MessageSquareText className="h-9 w-9 text-ink-300" />
      <h2 className="mt-3 text-sm font-semibold text-ink-900">还没有可进入沟通准备的对象</h2>
      <p className="mt-2 max-w-md text-xs leading-5 text-ink-500">
        先从推荐或主动搜索获得真实来源与对象记录，再进入客户详情核对公开联系人并准备沟通。
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
