import { memo } from 'react'
import { ArrowRight, Link2 } from 'lucide-react'
import type { RadarResultCluster } from '@/features/radar/radar-types'
import { sourceHostname } from '@/features/radar/radar-presentation'
import { isInteractiveResultTarget } from '@/features/radar/radar-interactions'
import {
  DecisionBadge,
  formatRadarDate,
  RiskBadge,
  RoleBadge,
  ScorePair,
} from './RadarResultMeta'

interface RadarResultRowProps {
  cluster: RadarResultCluster
  selected: boolean
  onSelect: (selected: boolean) => void
  onOpen: () => void
  selectionEnabled?: boolean
}

export const RadarResultRow = memo(function RadarResultRow({
  cluster,
  selected,
  onSelect,
  onOpen,
  selectionEnabled = true,
}: RadarResultRowProps) {
  const primarySource = cluster.sources[0]

  return (
    <article
      className="group grid min-h-[92px] cursor-pointer grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-ink-100 px-4 py-3 transition last:border-b-0 hover:bg-ink-50/80 lg:grid-cols-[28px_minmax(240px,1.55fr)_minmax(145px,.8fr)_minmax(190px,1fr)_minmax(128px,.65fr)_112px] lg:items-center lg:gap-4"
      onClick={(event) => {
        if (!isInteractiveResultTarget(event.target)) onOpen()
      }}
    >
      {selectionEnabled ? (
        <label className="flex h-8 items-center justify-center" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(event.target.checked)}
            aria-label={`选择 ${cluster.entityName}`}
            className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
        </label>
      ) : (
        <span className="flex h-8 items-center justify-center text-[10px] font-semibold text-ink-400">—</span>
      )}

      <button type="button" onClick={onOpen} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30">
        <span className="block truncate text-sm font-semibold text-ink-900">{cluster.entityName}</span>
        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-ink-600">{cluster.eventSummary}</span>
      </button>

      <div className="col-start-2 flex flex-wrap items-center gap-1.5 lg:col-start-auto lg:block lg:space-y-1.5">
        <DecisionBadge decision={cluster.decision} />
        <span className="lg:block"><RoleBadge role={cluster.entityRole} /></span>
      </div>

      <div className="col-start-2 flex items-center gap-2 lg:col-start-auto">
        <ScorePair match={cluster.matchScore} confidence={cluster.confidenceScore} compact />
        <RiskBadge risk={cluster.riskLevel} />
      </div>

      <div className="col-start-2 min-w-0 text-xs text-ink-500 lg:col-start-auto">
        <span className="flex items-center gap-1.5 font-medium text-ink-700">
          <Link2 className="h-3.5 w-3.5 text-brand-600" />
          {cluster.sourceCount} 个独立来源
        </span>
        <span className="mt-1 block truncate" title={primarySource?.canonicalUrl}>
          {primarySource ? sourceHostname(primarySource.url) : '来源待确认'}
        </span>
        <span className="mt-1 hidden text-[11px] text-ink-400 xl:block">{formatRadarDate(cluster.latestPublishedAt)}</span>
      </div>

      <div className="col-start-2 flex items-center justify-end lg:col-start-auto">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
        >
          查看证据
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
})
