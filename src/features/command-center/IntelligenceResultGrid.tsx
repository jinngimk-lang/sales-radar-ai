import { Database, Loader2, SearchX } from 'lucide-react'
import type { ChatSession } from '@/types'
import { EntityIntelligenceCard } from './EntityIntelligenceCard'

interface IntelligenceResultGridProps {
  sessions: ChatSession[]
  loading: boolean
  hasRun: boolean
}

export function IntelligenceResultGrid({
  sessions,
  loading,
  hasRun,
}: IntelligenceResultGridProps) {
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
            展示 {sessions.length} 个工作区对象；字段缺失时明确标记未知，不根据姓名或域名推断。
          </p>
        </div>
        <span className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm">
          {sessions.length} 个结果
        </span>
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        {sessions.map((session) => (
          <EntityIntelligenceCard key={session.id} session={session} />
        ))}
      </div>
    </section>
  )
}
