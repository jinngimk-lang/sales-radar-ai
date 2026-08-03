import { ClipboardCopy, Download, X } from 'lucide-react'

export function RadarBulkActions({
  selectedCount,
  totalOnPage,
  status,
  onSelectPage,
  onClear,
  onExport,
  onCopySources,
}: {
  selectedCount: number
  totalOnPage: number
  status: string | null
  onSelectPage: () => void
  onClear: () => void
  onExport: () => void
  onCopySources: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <strong className="text-brand-900">
          {selectedCount > 0 ? `已选择 ${selectedCount} 项` : '批量选择'}
        </strong>
        <button
          type="button"
          onClick={onSelectPage}
          className="font-semibold text-brand-700 hover:text-brand-900"
        >
          选择当前页 {totalOnPage} 项
        </button>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 font-medium text-ink-500 hover:text-ink-800"
          >
            <X className="h-3.5 w-3.5" />
            清除选择
          </button>
        )}
        {status && <span className="text-ink-600" role="status">{status}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopySources}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-800 transition hover:border-brand-300"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          {selectedCount > 0 ? '复制所选来源' : '复制当前页来源'}
        </button>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-semibold text-white transition hover:bg-brand-800"
        >
          <Download className="h-3.5 w-3.5" />
          {selectedCount > 0 ? '导出所选 CSV' : '导出当前页 CSV'}
        </button>
      </div>
    </div>
  )
}
