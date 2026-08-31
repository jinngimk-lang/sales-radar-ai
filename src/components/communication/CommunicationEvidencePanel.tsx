import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  MessageCircleReply,
  Send,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import {
  getCommunicationEvents,
  getCommunicationSummary,
  recordCommunicationEvidence,
  type CommunicationChannel,
  type CommunicationEvent,
  type CommunicationSummary,
  type CommunicationEventType,
} from '@/services/communication-evidence'

type UserEventType = Exclude<CommunicationEventType, 'DELIVERED'>

const STATE_LABEL: Record<CommunicationSummary['state'], string> = {
  RESEARCH: '待补联系人',
  READY: '可联系',
  SENT: '已发送',
  REPLIED: '已回复',
  MEETING: '已约会议',
}

const EVENT_LABEL: Record<CommunicationEventType, string> = {
  SENT: '已发送',
  DELIVERED: '已送达',
  REPLIED: '已回复',
  MEETING: '已约会议',
  FAILED: '发送失败',
}

const CHANNEL_LABEL: Record<CommunicationChannel, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  call: '电话',
  other: '其他',
}

const ACTIONS: Array<{
  eventType: UserEventType
  label: string
  icon: typeof Send
}> = [
  { eventType: 'SENT', label: '记录已发送', icon: Send },
  { eventType: 'REPLIED', label: '记录已回复', icon: MessageCircleReply },
  { eventType: 'MEETING', label: '记录会议', icon: CalendarCheck },
]

export function CommunicationEvidencePanel({ leadId }: { leadId: string }) {
  const [events, setEvents] = useState<CommunicationEvent[]>([])
  const [summary, setSummary] = useState<CommunicationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventType, setEventType] = useState<UserEventType>('SENT')
  const [channel, setChannel] = useState<CommunicationChannel>('email')
  const [externalEventId, setExternalEventId] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceNote, setEvidenceNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextEvents, nextSummary] = await Promise.all([
        getCommunicationEvents(leadId),
        getCommunicationSummary(leadId),
      ])
      setEvents(nextEvents)
      setSummary(nextSummary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '暂时无法读取沟通事实')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  const hasAttributableEvidence = useMemo(
    () => Boolean(externalEventId.trim() || evidenceUrl.trim()),
    [externalEventId, evidenceUrl],
  )

  const submit = async () => {
    if (saving || !hasAttributableEvidence) return
    setSaving(true)
    setError(null)
    try {
      await recordCommunicationEvidence(leadId, {
        eventType,
        channel,
        externalEventId: externalEventId.trim() || undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
        evidenceNote: evidenceNote.trim() || undefined,
      })
      setExternalEventId('')
      setEvidenceUrl('')
      setEvidenceNote('')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '沟通事实保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card overflow-hidden" aria-label="沟通事实">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-ink-900">沟通事实</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-500">
            生成话术、复制内容或打开渠道都不算已发送。只有可归因的平台事件 ID 或证据链接才推进沟通状态。
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700">
          {summary ? STATE_LABEL[summary.state] : loading ? '同步中' : '状态不可用'}
        </span>
      </div>

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-5 py-2.5 text-xs text-rose-700 sm:px-6">
          {error}
        </div>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="border-b border-ink-100 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold text-ink-800">新增事实</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.eventType}
                  type="button"
                  onClick={() => setEventType(action.eventType)}
                  aria-pressed={eventType === action.eventType}
                  className={
                    eventType === action.eventType
                      ? 'inline-flex items-center gap-1.5 rounded-lg bg-ink-950 px-3 py-2 text-xs font-semibold text-white'
                      : 'inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 hover:border-ink-300'
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              )
            })}
          </div>

          <label className="mt-4 block text-xs font-semibold text-ink-600">
            渠道
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as CommunicationChannel)
              }
              className="mt-1.5 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 focus:border-brand-400 focus:outline-none"
            >
              {(Object.keys(CHANNEL_LABEL) as CommunicationChannel[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {CHANNEL_LABEL[value]}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink-600">
              消息/事件 ID
              <input
                value={externalEventId}
                onChange={(event) => setExternalEventId(event.target.value)}
                maxLength={500}
                placeholder="例如 provider message id"
                className="mt-1.5 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-normal text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-ink-600">
              证据链接
              <input
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                maxLength={2000}
                inputMode="url"
                placeholder="https://…"
                className="mt-1.5 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-normal text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs font-semibold text-ink-600">
            补充说明（不能单独作为凭证）
            <textarea
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="可选：记录上下文，不保存完整消息正文"
              className="mt-1.5 w-full resize-none rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-normal text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
            />
          </label>

          {!hasAttributableEvidence ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5" />
              至少填写消息/事件 ID 或证据链接之一。
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || !hasAttributableEvidence}
            className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-ink-950 px-3.5 text-xs font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            保存沟通事实
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink-800">事实时间线</p>
            <span className="text-[10px] text-ink-400">
              {events.length} 条可追溯事件
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LoaderCircle className="h-5 w-5 animate-spin text-ink-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-4 py-8 text-center text-xs leading-5 text-ink-500">
              还没有真实发送、回复或会议凭证。当前不会显示这些正向状态。
            </div>
          ) : (
            <ol className="mt-3 space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-ink-100 bg-ink-50/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink-900">
                        {EVENT_LABEL[event.eventType]}
                      </span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-ink-500 ring-1 ring-ink-200">
                        {CHANNEL_LABEL[event.channel as CommunicationChannel] ?? event.channel}
                      </span>
                      <VerificationBadge source={event.verificationSource} />
                    </div>
                    <time className="text-[10px] text-ink-400">
                      {formatTime(event.occurredAt)}
                    </time>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                    {event.externalEventId ? (
                      <span className="max-w-full break-all font-mono">
                        ID: {event.externalEventId}
                      </span>
                    ) : null}
                    {event.evidenceUrl ? (
                      <a
                        href={event.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                      >
                        打开证据
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                  {event.evidenceNote ? (
                    <p className="mt-2 text-[11px] leading-5 text-ink-500">
                      {event.evidenceNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

function VerificationBadge({
  source,
}: {
  source: CommunicationEvent['verificationSource']
}) {
  const providerVerified = source === 'PROVIDER_VERIFIED'
  // Both enum literals stay visible in this component so UI/source contracts are auditable.
  const userEvidenceSource: CommunicationEvent['verificationSource'] =
    'USER_EVIDENCE_VERIFIED'
  return (
    <span
      title={providerVerified ? '平台/API 回执' : userEvidenceSource}
      className={
        providerVerified
          ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'
          : 'rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700'
      }
    >
      {providerVerified ? '平台回执' : '人工提交凭证'}
    </span>
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
