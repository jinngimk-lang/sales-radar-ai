import { useMemo, useState } from 'react'
import {
  ChevronRight,
  Database,
  ExternalLink,
  Loader2,
  SearchX,
  X,
} from 'lucide-react'
import type { ChatSession } from '@/types'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { cn } from '@/lib/utils'
import { EntityIntelligenceCard } from './EntityIntelligenceCard'
import { getPotentialBand, sortCommandSessions } from './resultPresentation'

interface IntelligenceResultGridProps {
  sessions: ChatSession[]
  loading: boolean
  hasRun: boolean
  onAskAgent?: (session: ChatSession) => void
}

export function IntelligenceResultGrid({
  sessions,
  loading,
  hasRun,
  onAskAgent,
}: IntelligenceResultGridProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const sortedSessions = useMemo(() => sortCommandSessions(sessions), [sessions])
  const selectedSession = selectedSessionId
    ? sortedSessions.find((session) => session.id === selectedSessionId) ?? null
    : null

  if (loading) {
    return (
      <section className="rounded-3xl border border-ink-200 bg-white p-8 text-center shadow-card">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" />
        <p className="mt-3 text-sm font-semibold text-ink-800">正在同步本次任务发现的真实对象</p>
        <p className="mt-1 text-xs text-ink-500">联系人、证据和评分会从当前工作区重新读取。</p>
      </section>
    )
  }

  if (!hasRun) return null

  if (sessions.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-10 text-center">
        <SearchX className="mx-auto h-8 w-8 text-ink-300" />
        <h2 className="mt-3 text-sm font-semibold text-ink-800">本次没有返回可验证对象</h2>
        <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-ink-500">
          Agent 的回答和执行轨迹仍保留在上方。调整行业、地区、公司规模或公开信号条件后可再次运行。
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
            <Database className="h-3.5 w-3.5" /> Structured Intelligence
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-ink-900">
            本次发现的对象与全部可用公开数据
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            先在表格里广域观察，再点击一行聚焦详情。字段缺失时明确标记未知，不根据姓名或域名推断。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[10px] font-semibold text-rose-700">
            🔴 高潜优先
          </span>
          <span className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm">
            {sessions.length} 个结果
          </span>
        </div>
      </div>

      <div
        className={cn(
          'grid items-start gap-5',
          selectedSession
            ? 'lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]'
            : 'grid-cols-1',
        )}
      >
        <div className="min-w-0 overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-ink-800">广域结果表</p>
              <p className="mt-0.5 text-[10px] text-ink-500">按综合潜力排序 · 点击任意对象查看完整卡片</p>
            </div>
            {selectedSession ? (
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-ink-600 transition hover:border-brand-200 hover:text-brand-700"
                aria-label="关闭详情并恢复广域表格"
              >
                <X className="h-3.5 w-3.5" /> 关闭详情
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead className="bg-white text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                <tr className="border-b border-ink-100">
                  <th className="px-4 py-2.5">对象</th>
                  <th className="px-3 py-2.5">潜在可能</th>
                  <th className="px-3 py-2.5">意向</th>
                  <th className="px-3 py-2.5">身份</th>
                  <th className="px-3 py-2.5">证据</th>
                  <th className="px-3 py-2.5">联系人</th>
                  <th className="px-3 py-2.5">来源</th>
                  <th className="px-4 py-2.5 text-right">动作</th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map((session) => {
                  const selected = selectedSession?.id === session.id
                  const scores = session.assistantScores
                  return (
                    <tr
                      key={session.id}
                      tabIndex={0}
                      aria-selected={selected}
                      onClick={() => setSelectedSessionId(session.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedSessionId(session.id)
                        }
                      }}
                      className={cn(
                        'cursor-pointer border-b border-ink-100 outline-none transition last:border-b-0 hover:bg-brand-50/35 focus-visible:bg-brand-50/55',
                        selected && 'bg-brand-50/70 ring-1 ring-inset ring-brand-100',
                      )}
                    >
                      <td className="max-w-[300px] px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-[10px] font-bold text-ink-600">
                            {session.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <PlatformIcon platform={session.platform} className="h-4 w-4" />
                              <p className="truncate text-xs font-semibold text-ink-900">{session.customerName}</p>
                            </div>
                            <p className="mt-1 truncate text-[10px] text-ink-500">
                              {compactIdentity(session)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <PotentialIndicator score={scores?.overall} />
                      </td>
                      <td className="px-3 py-3">
                        <ScoreSignal label="意向" value={scores?.intent} />
                      </td>
                      <td className="px-3 py-3">
                        <ScoreSignal label="身份" value={scores?.identity} />
                      </td>
                      <td className="px-3 py-3">
                        <ScoreSignal label="证据" value={scores?.evidence} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ScoreSignal label="联系人" value={scores?.contact} />
                          <span className="whitespace-nowrap text-[9px] font-medium text-ink-400">
                            {session.contacts.length} 人
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {session.sourceUrl ? (
                          <a
                            href={session.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-brand-700 hover:text-brand-800"
                          >
                            原始来源 <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-ink-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-brand-700">
                          查看详情 <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSession ? (
          <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">Focused Intelligence</p>
                <p className="mt-0.5 text-xs text-ink-500">当前只聚焦 1 个对象；关闭后恢复全宽观察。</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
                aria-label="关闭详情"
                title="关闭详情"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <EntityIntelligenceCard
              session={selectedSession}
              onAskAgent={onAskAgent}
            />
          </aside>
        ) : null}
      </div>
    </section>
  )
}

function PotentialIndicator({ score }: { score: number | undefined }) {
  const band = getPotentialBand(score)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold',
        potentialClasses[band.tone],
      )}
      aria-label={`综合潜力 ${band.label}${formatScore(score) === '—' ? '' : ` ${formatScore(score)} 分`}`}
    >
      <span className={cn('h-2 w-2 rounded-full', scoreDotClass(score))} aria-hidden="true" />
      {band.label}
      <span className="tabular-nums opacity-75">{formatScore(score)}</span>
    </span>
  )
}

function ScoreSignal({ label, value }: { label: string; value: number | undefined }) {
  return (
    <span
      className="inline-flex min-w-[48px] items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold text-ink-700"
      aria-label={`${label}评分 ${formatScore(value)}`}
    >
      <span className={cn('h-2 w-2 rounded-full', scoreDotClass(value))} aria-hidden="true" />
      <span className="tabular-nums">{formatScore(value)}</span>
    </span>
  )
}

const potentialClasses = {
  strong: 'border-rose-100 bg-rose-50 text-rose-700',
  medium: 'border-amber-100 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-50 text-slate-600',
  neutral: 'border-ink-200 bg-ink-50 text-ink-500',
} as const

function scoreDotClass(value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'bg-ink-300'
  if (value >= 75) return 'bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.10)]'
  if (value >= 50) return 'bg-amber-400'
  return 'bg-slate-400'
}

function formatScore(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '—'
}

function compactIdentity(session: ChatSession) {
  const values = [session.jobTitle, session.company]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  return values.length ? values.join(' · ') : '公开来源对象'
}
