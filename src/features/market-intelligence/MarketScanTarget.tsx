import {
  Building2,
  Factory,
  MapPin,
  Radar,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Surface } from '@/components/ui/Surface'
import {
  ALL_CUSTOMER_TYPES,
  ALL_INDUSTRIES,
  ALL_REGIONS,
} from '@/data/meta'
import type {
  MarketScanTarget as MarketScanTargetValue,
  SignalFocus,
} from './market-intelligence.contract'
import { SIGNAL_META } from './market-intelligence.meta'

interface MarketScanTargetProps {
  value: MarketScanTargetValue
  running: boolean
  onChange: (value: MarketScanTargetValue) => void
  onStart: () => void
}

const SIGNAL_OPTIONS: Array<{ value: SignalFocus; label: string }> = [
  { value: 'ALL', label: '全部企业变化' },
  ...Object.entries(SIGNAL_META).map(([value, meta]) => ({
    value: value as SignalFocus,
    label: meta.label,
  })),
]

export function MarketScanTarget({
  value,
  running,
  onChange,
  onStart,
}: MarketScanTargetProps) {
  const update = <K extends keyof MarketScanTargetValue>(
    key: K,
    nextValue: MarketScanTargetValue[K],
  ) => onChange({ ...value, [key]: nextValue })

  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink-900">
              设置市场侦察目标
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              产品和市场范围越明确，返回的信息越聚焦
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          只保存可追溯的真实来源
        </span>
      </div>

      <div className="grid gap-3 p-5 lg:grid-cols-[1.35fr_repeat(4,minmax(0,0.8fr))_auto]">
        <TargetField icon={Radar} label="产品 / 服务">
          <input
            value={value.product}
            onChange={(event) => update('product', event.target.value)}
            placeholder="例如：工业自动化 SaaS"
            className="market-target-control"
          />
        </TargetField>

        <TargetField icon={Factory} label="行业">
          <select
            value={value.industry}
            onChange={(event) => update('industry', event.target.value)}
            className="market-target-control"
          >
            <option value="">不限行业</option>
            {ALL_INDUSTRIES.map((industry) => (
              <option key={industry.key} value={industry.label}>
                {industry.label}
              </option>
            ))}
          </select>
        </TargetField>

        <TargetField icon={Users} label="客户类型">
          <select
            value={value.customerType}
            onChange={(event) =>
              update(
                'customerType',
                event.target.value as MarketScanTargetValue['customerType'],
              )
            }
            className="market-target-control"
          >
            <option value="">不限类型</option>
            {ALL_CUSTOMER_TYPES.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>
        </TargetField>

        <TargetField icon={MapPin} label="地区">
          <select
            value={value.region}
            onChange={(event) =>
              update(
                'region',
                event.target.value as MarketScanTargetValue['region'],
              )
            }
            className="market-target-control"
          >
            <option value="">不限地区</option>
            {ALL_REGIONS.map((region) => (
              <option key={region.key} value={region.key}>
                {region.label}
              </option>
            ))}
          </select>
        </TargetField>

        <TargetField icon={Building2} label="关注信号">
          <select
            value={value.signalFocus}
            onChange={(event) =>
              update('signalFocus', event.target.value as SignalFocus)
            }
            className="market-target-control"
          >
            {SIGNAL_OPTIONS.map((signal) => (
              <option key={signal.value} value={signal.value}>
                {signal.label}
              </option>
            ))}
          </select>
        </TargetField>

        <Button
          onClick={onStart}
          disabled={!value.product.trim() || running}
          className="min-h-[58px] self-stretch px-5 lg:self-end"
        >
          <Radar className={running ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {running ? '扫描中' : '开始市场扫描'}
        </Button>
      </div>
    </Surface>
  )
}

function TargetField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Radar
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex min-h-[58px] min-w-0 items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/65 px-3 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10">
      <Icon className="h-4 w-4 shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-ink-400">
          {label}
        </span>
        {children}
      </span>
    </label>
  )
}
