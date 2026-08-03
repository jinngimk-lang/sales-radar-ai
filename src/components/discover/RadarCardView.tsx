import { ArrowRight, Link2 } from 'lucide-react'
import type { RadarResultCluster } from '@/features/radar/radar-types'
import { isInteractiveResultTarget } from '@/features/radar/radar-interactions'
import { DecisionBadge, RiskBadge, RoleBadge, ScorePair } from './RadarResultMeta'

export function RadarCardView({
  clusters,
  selectedIds,
  onSelect,
  onOpen,
}: {
  clusters: RadarResultCluster[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onOpen: (cluster: RadarResultCluster) => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {clusters.map((cluster) => (
        <article
          key={cluster.id}
          className="flex min-h-[238px] cursor-pointer flex-col rounded-2xl border border-ink-200 bg-white p-4 shadow-card transition hover:border-ink-300 hover:shadow-card-hover"
          onClick={(event) => {
            if (!isInteractiveResultTarget(event.target)) onOpen(cluster)
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <DecisionBadge decision={cluster.decision} />
              <RoleBadge role={cluster.entityRole} />
            </div>
            <input
              type="checkbox"
              checked={selectedIds.has(cluster.id)}
              onChange={(event) => onSelect(cluster.id, event.target.checked)}
              aria-label={`选择 ${cluster.entityName}`}
              className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600"
            />
          </div>
          <h3 className="mt-4 truncate text-base font-semibold text-ink-900">{cluster.entityName}</h3>
          <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-ink-600">{cluster.eventSummary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ScorePair match={cluster.matchScore} confidence={cluster.confidenceScore} compact />
            <RiskBadge risk={cluster.riskLevel} />
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-ink-100 pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-ink-500"><Link2 className="h-3.5 w-3.5" />{cluster.sourceCount} 个来源</span>
            <button type="button" onClick={() => onOpen(cluster)} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-900">
              查看证据 <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
