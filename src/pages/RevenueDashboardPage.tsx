import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Target,
  WalletCards,
} from 'lucide-react'
import {
  getRevenueDashboard,
  type RevenueDashboard,
  type RevenueLedgerStatus,
  type RevenueOpportunityCategory,
  type RevenueOpportunityStatus,
} from '@/features/revenue/revenue-api'

const CATEGORY_LABELS: Record<RevenueOpportunityCategory, string> = {
  OPEN_SOURCE_BOUNTY: '开源赏金',
  SECURITY_BOUNTY: '授权安全赏金',
  AI_TASK: 'AI 任务',
  USER_RESEARCH: '用户研究',
  AFFILIATE: '联盟与成交',
  QUANT_RESEARCH: '量化研究',
  OTHER: '其他',
}

const OPPORTUNITY_STATUS_LABELS: Record<RevenueOpportunityStatus, string> = {
  DISCOVERED: '待核验',
  QUALIFIED: '已核验',
  ACTIVE: '执行中',
  WAITING: '等待结算',
  WON: '已成功',
  LOST: '未成功',
  REJECTED: '已排除',
}

const LEDGER_STATUS_LABELS: Record<RevenueLedgerStatus, string> = {
  POTENTIAL: '潜在收益',
  CONFIRMED: '已确认收益',
  PENDING_PAYOUT: '待结算',
  PAID: '已到账',
}

export function RevenueDashboardPage() {
  const [dashboard, setDashboard] = useState<RevenueDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDashboard(await getRevenueDashboard('USD'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '收益控制台暂时不可用')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  return (
    <div className="min-h-full bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-brand-950 text-white shadow-[0_28px_70px_-42px_rgba(15,23,42,0.75)]">
          <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1fr_auto] lg:px-9 lg:py-9">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                <Activity className="h-4 w-4" />
                Revenue Operations
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                收益控制台
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                按风险调整后的净收益安排工作。潜在奖金只作为机会值，未获得平台确认、合并记录或付款证据时，不计入已确认收益。
              </p>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <UnavailableState message={error} onRetry={loadDashboard} />
        ) : loading && !dashboard ? (
          <LoadingState />
        ) : dashboard ? (
          <DashboardContent dashboard={dashboard} />
        ) : null}
      </div>
    </div>
  )
}

function DashboardContent({ dashboard }: { dashboard: RevenueDashboard }) {
  const { summary } = dashboard
  const cards = [
    {
      label: '已到账',
      value: formatMoney(summary.paidMinor, summary.currency),
      detail: '已有付款凭证',
      icon: Banknote,
    },
    {
      label: '已确认收益',
      value: formatMoney(summary.confirmedMinor, summary.currency),
      detail: '平台已接受或已授予',
      icon: BadgeCheck,
    },
    {
      label: '待结算',
      value: formatMoney(summary.pendingPayoutMinor, summary.currency),
      detail: '等待平台付款',
      icon: Clock3,
    },
    {
      label: '潜在收益',
      value: formatMoney(summary.potentialMinor, summary.currency),
      detail: '不计入已确认收益',
      icon: CircleDollarSign,
    },
  ]

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.5)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <card.icon className="h-5 w-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.7fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Priority Queue
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">机会优先队列</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-4 w-4 text-sky-600" />
                活跃 {summary.activeOpportunityCount}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <WalletCards className="h-4 w-4 text-sky-600" />
                风险调整值 {formatMoney(summary.totalRiskAdjustedValueMinor, summary.currency)}
              </span>
            </div>
          </div>

          {dashboard.opportunities.length ? (
            <div className="divide-y divide-slate-100">
              {dashboard.opportunities.map((opportunity) => (
                <article key={opportunity.id} className="px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                          {CATEGORY_LABELS[opportunity.category]}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
                        </span>
                        <span className="text-xs text-slate-400">{opportunity.platform}</span>
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-950">
                        {opportunity.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {opportunity.evidenceSummary || '已进入监控池，等待补充可验证证据。'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>成功概率 {opportunity.successProbabilityPct}%</span>
                        <span>预计 {formatHours(opportunity.estimatedHours)}</span>
                        <span>风险 {opportunity.riskScore}/100</span>
                        <span>本金 {formatMoney(opportunity.capitalRequiredMinor, opportunity.currency)}</span>
                      </div>
                      {opportunity.nextAction ? (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                          下一步：{opportunity.nextAction}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-5 lg:block lg:min-w-[190px] lg:text-right">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          风险调整净值
                        </p>
                        <p className={`mt-1 text-lg font-bold ${opportunity.riskAdjustedValueMinor >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatMoney(opportunity.riskAdjustedValueMinor, opportunity.currency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          名义区间 {formatMoney(opportunity.payoutMinMinor, opportunity.currency)} – {formatMoney(opportunity.payoutMaxMinor, opportunity.currency)}
                        </p>
                      </div>
                      <a
                        href={opportunity.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900"
                      >
                        查看来源 <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyOpportunityState />
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Guardrails</p>
                <h2 className="text-base font-bold text-slate-950">执行边界</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <PolicyLine ok={dashboard.policy.zeroCapitalDefault} label="默认零本金" />
              <PolicyLine ok={!dashboard.policy.leverageAllowed} label="禁止杠杆与借贷" />
              <PolicyLine ok={!dashboard.policy.potentialCountsAsConfirmed} label="潜在奖金不计确认收入" />
              <PolicyLine ok={dashboard.policy.evidenceRequiredForRecognizedRevenue} label="确认收益必须有证据" />
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="text-sm font-bold text-amber-950">人工操作门槛</h2>
                <p className="mt-2 text-xs leading-6 text-amber-900/70">
                  KYC、签约、绑定收款账户、充值、提现、验证码和法律条款必须由账户所有者本人完成。
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <LedgerSection dashboard={dashboard} />
    </>
  )
}

function LedgerSection({ dashboard }: { dashboard: RevenueDashboard }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Settlement Ledger</p>
        <h2 className="mt-1 text-lg font-bold text-slate-950">收益流水与证据</h2>
      </div>
      {dashboard.ledger.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-400">
              <tr>
                <th className="px-6 py-3 font-semibold">状态</th>
                <th className="px-6 py-3 font-semibold">金额</th>
                <th className="px-6 py-3 font-semibold">确认时间</th>
                <th className="px-6 py-3 font-semibold">证据</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.ledger.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {LEDGER_STATUS_LABELS[entry.status]}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-950">
                    {formatMoney(entry.amountMinor, entry.currency)}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(entry.recognizedAt)}
                  </td>
                  <td className="max-w-md px-6 py-4 text-slate-500">
                    {entry.evidenceUrl ? (
                      <a
                        href={entry.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-sky-700"
                      >
                        打开凭证 <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      entry.evidenceNote || '尚无证据'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          暂无收益流水。只有获得平台确认、奖励通知、合并记录或付款凭证后才会进入已确认收益。
        </div>
      )}
    </section>
  )
}

function PolicyLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
      <span>{label}</span>
      <span className={`text-xs font-bold ${ok ? 'text-emerald-700' : 'text-rose-600'}`}>
        {ok ? '启用' : '未启用'}
      </span>
    </div>
  )
}

function EmptyOpportunityState() {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <Target className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-950">监控运行中，暂无通过核验的机会</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        只有付款条款、授权范围、竞争状态和下一步都足够明确的任务才会进入执行队列。
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <RefreshCw className="h-6 w-6 animate-spin text-sky-700" />
    </div>
  )
}

function UnavailableState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => Promise<void>
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
      <h2 className="mt-4 text-lg font-bold text-slate-950">收益数据暂时不可用</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-950 px-4 py-2.5 text-sm font-semibold text-white"
      >
        <RefreshCw className="h-4 w-4" />
        重新连接
      </button>
    </div>
  )
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours} 小时` : `${hours.toFixed(1)} 小时`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}
