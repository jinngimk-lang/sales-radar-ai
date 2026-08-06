import { ExternalLink, FileCheck2 } from 'lucide-react'
import type { ContactFieldEvidence } from '@/types'

interface SourceEvidenceListProps {
  evidence: Array<string | ContactFieldEvidence>
}

export function SourceEvidenceList({ evidence }: SourceEvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <p className="text-xs leading-5 text-ink-400">
        暂无字段级来源证据；该信息不会被标记为已验证。
      </p>
    )
  }

  return (
    <ul className="space-y-2.5">
      {evidence.map((item, index) =>
        isFieldEvidence(item) ? (
          <li
            key={`${item.field}-${item.sourceUrl}-${item.observedAt}-${index}`}
            className="rounded-xl border border-ink-100 bg-ink-50/70 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                <FileCheck2 className="h-3.5 w-3.5" />
                {item.verificationStatus === 'OBSERVED' ? '已在公开来源观察到' : item.verificationStatus}
              </span>
              <time className="text-[10px] text-ink-400" dateTime={item.observedAt}>
                {formatObservedAt(item.observedAt)}
              </time>
            </div>
            <p className="mt-2 break-words text-xs font-medium text-ink-800">
              {fieldLabel(item.field)}：{item.value}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-500">
              <span>提取方式：{extractionLabel(item.extractionMethod)}</span>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
              >
                来源证据 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </li>
        ) : (
          <li
            key={`${item}-${index}`}
            className="rounded-xl border border-ink-100 bg-ink-50/70 px-3 py-2.5 text-xs leading-5 text-ink-600"
          >
            {item}
          </li>
        ),
      )}
    </ul>
  )
}

function isFieldEvidence(
  item: string | ContactFieldEvidence,
): item is ContactFieldEvidence {
  return typeof item !== 'string' && Boolean(item.sourceUrl && item.observedAt)
}

function fieldLabel(field: ContactFieldEvidence['field']) {
  const labels: Record<ContactFieldEvidence['field'], string> = {
    name: '姓名',
    jobTitle: '职位',
    company: '公司',
    email: '邮箱',
    phone: '电话',
    socialProfile: '社交主页',
    website: '网站',
    relationship: '关系类型',
  }
  return labels[field]
}

function extractionLabel(method: ContactFieldEvidence['extractionMethod']) {
  const labels: Record<ContactFieldEvidence['extractionMethod'], string> = {
    mailto: '网页邮箱链接',
    tel: '网页电话链接',
    labeled_text: '带标签的公开文本',
    link: '公开链接',
    json_ld: '网页结构化数据',
    provider_metadata: '数据源元信息',
  }
  return labels[method]
}

function formatObservedAt(observedAt: string) {
  const date = new Date(observedAt)
  if (Number.isNaN(date.getTime())) return observedAt
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
