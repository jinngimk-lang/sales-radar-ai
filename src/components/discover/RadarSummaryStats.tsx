import { Building2, Files, Layers3 } from 'lucide-react'

export function RadarSummaryStats({
  evidenceCount,
  entityCount,
  clusterCount,
}: {
  evidenceCount: number
  entityCount: number
  clusterCount: number
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-card sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-ink-900">本次真实信息概览</p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            多来源按明确企业、事件类型和时间窗口聚合，不重新计算后端评分。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-600">
          <Stat icon={Files} value={evidenceCount} label="条真实信息" />
          <Stat icon={Building2} value={entityCount} label="家明确企业" />
          <Stat icon={Layers3} value={clusterCount} label="个结果簇" />
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Files
  value: number
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className="h-3.5 w-3.5 text-brand-600" />
      <strong className="text-sm tabular-nums text-ink-900">{value}</strong>
      {label}
    </span>
  )
}
