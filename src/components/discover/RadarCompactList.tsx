import type { RadarResultCluster } from '@/features/radar/radar-types'
import { RadarResultRow } from './RadarResultRow'

export function RadarCompactList({
  clusters,
  selectedIds,
  onSelect,
  onOpen,
  selectionEnabled = true,
}: {
  clusters: RadarResultCluster[]
  selectedIds: Set<string>
  onSelect: (id: string, selected: boolean) => void
  onOpen: (cluster: RadarResultCluster) => void
  selectionEnabled?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
      {clusters.map((cluster) => (
        <RadarResultRow
          key={cluster.id}
          cluster={cluster}
          selected={selectedIds.has(cluster.id)}
          onSelect={(selected) => onSelect(cluster.id, selected)}
          onOpen={() => onOpen(cluster)}
          selectionEnabled={selectionEnabled}
        />
      ))}
    </div>
  )
}
