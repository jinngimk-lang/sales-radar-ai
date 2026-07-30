import { ArrowRight, CheckCircle2, Lightbulb, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MarketSignal } from '@/types'
import { Surface } from '@/components/ui/Surface'
import { WorkspaceEmpty } from '@/components/ui/WorkspaceState'
import { SIGNAL_META } from './market-intelligence.meta'

export function SignalAssessmentPanel({
  signal,
}: {
  signal: MarketSignal | null
}) {
  if (!signal) {
    return (
      <Surface>
        <WorkspaceEmpty
          icon={Lightbulb}
          title="选择一个市场信号"
          description="这里会把来源事实、商业判断和销售建议分开呈现。"
        />
      </Surface>
    )
  }

  const meta = SIGNAL_META[signal.signalType]

  return (
    <Surface className="overflow-hidden">
      <div className="grid lg:grid-cols-3">
        <AssessmentBlock
          icon={CheckCircle2}
          eyebrow="FACT"
          title="来源事实"
          content={signal.summary}
          hint="内容来自已保存的真实来源。"
        />
        <AssessmentBlock
          icon={Lightbulb}
          eyebrow="ASSESSMENT"
          title="为什么值得关注"
          content={meta.whyItMatters}
          hint="这是商业判断，不代表企业已经采购。"
        />
        <AssessmentBlock
          icon={Route}
          eyebrow="RECOMMENDATION"
          title="建议下一步"
          content={meta.recommendedNextStep}
          hint="这是销售研究建议，需要进一步验证。"
          last
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-500">
          Market Signal 是市场变化，不等于销售机会或已确认客户。
        </p>
        <Link
          to="/app/discover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          进入销售机会判断
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Surface>
  )
}

function AssessmentBlock({
  icon: Icon,
  eyebrow,
  title,
  content,
  hint,
  last = false,
}: {
  icon: typeof CheckCircle2
  eyebrow: string
  title: string
  content: string
  hint: string
  last?: boolean
}) {
  return (
    <section
      className={`p-5 sm:p-6 ${last ? '' : 'border-b border-ink-100 lg:border-b-0 lg:border-r'}`}
    >
      <span className="flex items-center gap-2 text-[9px] font-semibold tracking-[0.14em] text-brand-700">
        <Icon className="h-3.5 w-3.5" />
        {eyebrow}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-ink-600">{content}</p>
      <p className="mt-3 text-[10px] leading-4 text-ink-400">{hint}</p>
    </section>
  )
}
