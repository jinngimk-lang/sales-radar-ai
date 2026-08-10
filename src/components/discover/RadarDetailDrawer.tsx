import { createPortal } from 'react-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  X,
} from 'lucide-react'
import type {
  RadarClusterSource,
  RadarResultCluster,
} from '@/features/radar/radar-types'
import {
  ACTION_LABELS,
  reasonCodeLabel,
  sourceHostname,
} from '@/features/radar/radar-presentation'
import {
  DecisionBadge,
  formatRadarDate,
  RiskBadge,
  RoleBadge,
  ScorePair,
} from './RadarResultMeta'
import { useDrawerA11y } from './useDrawerA11y'

export function RadarDetailDrawer({
  cluster,
  onClose,
}: {
  cluster: RadarResultCluster | null
  onClose: () => void
}) {
  const drawerRef = useDrawerA11y<HTMLElement>(Boolean(cluster), onClose)

  if (!cluster) return null

  const assessment = cluster.primaryAssessment
  const reasonLabels = assessment.reasonCodes.map(reasonCodeLabel)
  const pendingItems = pendingVerifications(cluster)

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-ink-900/35" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl animate-fade-in sm:max-w-[560px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="radar-detail-title"
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700">结果证据与判断</p>
            <h2 id="radar-detail-title" className="mt-1 truncate text-lg font-semibold text-ink-900">{cluster.entityName}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-200 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" aria-label="关闭结果详情">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">发生了什么</p>
            <p className="mt-2 text-base font-semibold leading-7 text-ink-900">{cluster.eventSummary}</p>
            <p className="mt-2 text-xs leading-5 text-ink-500">该描述来自当前真实来源标题；不代表企业已经采购或成为客户。</p>
          </section>

          <section className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <DecisionBadge decision={cluster.decision} />
              <RoleBadge role={cluster.entityRole} />
              <RiskBadge risk={cluster.riskLevel} />
            </div>
            <div className="mt-4"><ScorePair match={cluster.matchScore} confidence={cluster.confidenceScore} /></div>
            <div className="mt-4 border-t border-ink-200 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">推荐下一步</p>
              <p className="mt-1 text-sm font-medium leading-6 text-ink-800">{ACTION_LABELS[assessment.recommendedAction]}</p>
              <p className="mt-1 text-xs text-ink-500">这是销售研究建议，不是企业行为事实。</p>
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle title="为什么值得关注" />
            <ul className="mt-3 space-y-2">
              {reasonLabels.slice(0, 5).map((label, index) => (
                <li key={`${label}-${index}`} className="flex gap-2 text-sm leading-6 text-ink-700">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <SectionTitle title="仍需确认" />
            <ul className="mt-3 space-y-2">
              {pendingItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-amber-950">
                  <CircleHelp className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <details className="group mt-6 rounded-2xl border border-ink-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink-900">
              评分依据与判断代码
              <ChevronDown className="h-4 w-4 text-ink-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-ink-100 px-4 py-4">
              <ScoreBreakdown cluster={cluster} />
              <div className="mt-4 border-t border-ink-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Reason Codes</p>
                <div className="mt-2 space-y-2">
                  {assessment.reasonCodes.map((code) => (
                    <div key={code} className="rounded-xl bg-ink-50 px-3 py-2">
                      <p className="text-xs font-medium text-ink-800">{reasonCodeLabel(code)}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-400">{code}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <section className="mt-6">
            <SectionTitle title={`真实来源 · ${cluster.sourceCount}`} />
            <div className="mt-3 space-y-3">
              {cluster.sources.map((source, index) => (
                <article key={source.canonicalUrl} className="rounded-2xl border border-ink-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-6 text-ink-900">{source.title || '来源标题待确认'}</p>
                      <p className="mt-1 text-xs text-ink-500">{sourceHostname(source.url)} · {source.sourceType} · {formatRadarDate(source.publishedAt || source.createdAt)}</p>
                    </div>
                    {index === 0 && <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">主要来源</span>}
                  </div>
                  {source.excerpt && (
                    <p className="mt-3 line-clamp-4 text-xs leading-5 text-ink-600">
                      {source.excerpt}
                    </p>
                  )}
                  {(source.identityStatus ||
                    source.evidenceStatus ||
                    source.sourceTier ||
                    source.freshnessStatus ||
                    source.qualityScore !== null ||
                    source.corroborationRequired) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-ink-500">
                      {source.evidenceStatus && <span className="rounded-full bg-ink-50 px-2 py-1">证据状态：{source.evidenceStatus}</span>}
                      {source.identityStatus && <span className="rounded-full bg-ink-50 px-2 py-1">主体状态：{source.identityStatus}</span>}
                      {source.sourceTier && <span className="rounded-full bg-ink-50 px-2 py-1">来源等级：{source.sourceTier.replace('_', ' ')}</span>}
                      {source.freshnessStatus && <span className="rounded-full bg-ink-50 px-2 py-1">时效：{sourceFreshnessLabel(source.freshnessStatus)}</span>}
                      {source.qualityScore !== null && <span className="rounded-full bg-ink-50 px-2 py-1">证据质量：{source.qualityScore}/100</span>}
                      {source.corroborationRequired && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">需要独立来源佐证</span>}
                    </div>
                  )}
                  {isHttpUrl(source.url) ? (
                    <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900">
                      查看原文 <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="mt-3 text-xs text-amber-700">来源地址需要人工核对</p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 p-4">
            <SectionTitle title="结果簇信息" />
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Info label="判断快照" value={`${cluster.assessments.length} 条`} />
              <Info label="独立来源" value={`${cluster.sourceCount} 个`} />
              <Info label="多个不同判断" value={cluster.hasMultipleDecisions ? '存在，需查看历史' : '未发现'} />
              <Info label="最新来源" value={formatRadarDate(cluster.latestPublishedAt)} />
            </dl>
          </section>

          <details className="group mt-6 rounded-2xl border border-ink-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink-900">
              簇内全部判断（{cluster.assessments.length}）
              <ChevronDown className="h-4 w-4 text-ink-400 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-ink-100 p-4">
              {cluster.assessments.map((item) => (
                <article key={item.id} className="rounded-xl bg-ink-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <DecisionBadge decision={item.decision} />
                    <RiskBadge risk={item.riskLevel} />
                    <span className="ml-auto text-[10px] text-ink-400">
                      {formatRadarDate(item.createdAt)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ScorePair
                      match={item.matchScore}
                      confidence={item.confidenceScore}
                      compact
                    />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {item.reasonCodes.map((code) => (
                      <li key={code} className="text-xs leading-5 text-ink-600">
                        {reasonCodeLabel(code)}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </details>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

function sourceFreshnessLabel(value: NonNullable<RadarClusterSource['freshnessStatus']>) {
  return {
    FRESH: '近期',
    RECENT: '较新',
    STALE: '历史',
    UNKNOWN: '待确认',
  }[value]
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-400">{label}</dt>
      <dd className="mt-1 font-medium text-ink-800">{value}</dd>
    </div>
  )
}

function ScoreBreakdown({ cluster }: { cluster: RadarResultCluster }) {
  const breakdown = cluster.primaryAssessment.scoreBreakdown
  const items = [
    ['Evidence Quality', breakdown.confidence.evidenceQuality],
    ['Event Signal', breakdown.confidence.eventSignal],
    ['Identity Confidence', breakdown.confidence.identityConfidence],
    ['Product Relevance', breakdown.match.productRelevance],
    ['Entity Role Fit', breakdown.match.entityRoleFit],
    ['User Intent Fit', breakdown.match.userIntentFit],
    ['Event Relevance', breakdown.match.eventRelevance],
  ] as const

  return (
    <div className="space-y-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 text-xs">
          <span className="text-ink-500">{label}</span>
          <span className="font-semibold tabular-nums text-ink-900">{value}</span>
        </div>
      ))}
    </div>
  )
}

function pendingVerifications(cluster: RadarResultCluster): string[] {
  const reasons = new Set(cluster.primaryAssessment.reasonCodes)
  const pending = new Set<string>()
  if (!cluster.hasExplicitEntity || reasons.has('IDENTITY_NEEDS_REVIEW') || reasons.has('ENTITY_VERIFICATION_REQUIRED')) pending.add('企业主体与来源关系需要确认')
  if (cluster.entityRole === 'UNKNOWN' || reasons.has('ROLE_VERIFICATION_REQUIRED')) pending.add('企业在本次销售目标中的角色需要确认')
  if (!cluster.sources.some((source) => source.publishedAt)) pending.add('来源发布时间不完整')
  if (cluster.sourceCount === 1) pending.add('当前只有一个独立来源，建议交叉验证')
  if (reasons.has('TITLE_ONLY_EVENT_BLOCKED') || reasons.has('BODY_EVENT_MISSING')) pending.add('正文尚未充分支持事件描述')
  if (reasons.has('PRODUCT_RELEVANCE_INSUFFICIENT')) pending.add('与当前产品方向的关系需要验证')
  pending.add('未发现明确采购事实，不能视为采购确认')
  return [...pending]
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
