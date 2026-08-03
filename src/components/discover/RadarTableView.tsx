import type { RadarResultCluster } from '@/features/radar/radar-types'
import { formatRadarDate, RiskBadge } from './RadarResultMeta'
import { DECISION_LABELS, ROLE_LABELS } from '@/features/radar/radar-presentation'
import { isInteractiveResultTarget } from '@/features/radar/radar-interactions'

export function RadarTableView({
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
    <div className="max-w-full overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
      <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-ink-50 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          <tr>
            <th className="w-12 px-4 py-3">选择</th>
            <th className="w-[18%] px-3 py-3">企业 / 主体</th>
            <th className="w-[25%] px-3 py-3">事件</th>
            <th className="w-[13%] px-3 py-3">判断</th>
            <th className="w-[11%] px-3 py-3">角色</th>
            <th className="w-20 px-3 py-3 text-right">匹配</th>
            <th className="w-20 px-3 py-3 text-right">可信</th>
            <th className="w-24 px-3 py-3">风险</th>
            <th className="w-20 px-3 py-3 text-right">来源</th>
            <th className="w-28 px-3 py-3">最新</th>
            <th className="w-24 px-3 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr
              key={cluster.id}
              className="cursor-pointer border-t border-ink-100 transition hover:bg-ink-50/80"
              onClick={(event) => {
                if (!isInteractiveResultTarget(event.target)) onOpen(cluster)
              }}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(cluster.id)}
                  onChange={(event) => onSelect(cluster.id, event.target.checked)}
                  aria-label={`选择 ${cluster.entityName}`}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600"
                />
              </td>
              <td className="px-3 py-3 font-semibold text-ink-900"><span className="block truncate" title={cluster.entityName}>{cluster.entityName}</span></td>
              <td className="px-3 py-3 text-ink-600"><span className="block truncate" title={cluster.eventSummary}>{cluster.eventSummary}</span></td>
              <td className="px-3 py-3 font-medium text-ink-700"><span className="block truncate" title={DECISION_LABELS[cluster.decision]}>{DECISION_LABELS[cluster.decision]}</span></td>
              <td className="px-3 py-3 text-ink-600"><span className="block truncate">{ROLE_LABELS[cluster.entityRole]}</span></td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink-900">{cluster.matchScore}</td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-ink-900">{cluster.confidenceScore}</td>
              <td className="px-3 py-3"><RiskBadge risk={cluster.riskLevel} /></td>
              <td className="px-3 py-3 text-right tabular-nums text-ink-700">{cluster.sourceCount}</td>
              <td className="px-3 py-3 text-ink-500">{formatRadarDate(cluster.latestPublishedAt)}</td>
              <td className="px-3 py-3">
                <button type="button" onClick={() => onOpen(cluster)} className="font-semibold text-brand-700 hover:text-brand-900">查看证据</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
