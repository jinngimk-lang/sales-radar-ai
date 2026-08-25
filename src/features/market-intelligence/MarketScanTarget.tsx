import {
  Building2,
  Factory,
  MapPin,
  Radar,
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
  CommercialGoal,
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

const COMMERCIAL_GOAL_OPTIONS: Array<{
  value: CommercialGoal
  label: string
}> = [
  { value: 'FIND_BUYERS', label: '找买家' },
  { value: 'FIND_SUPPLIERS', label: '找供应商' },
  { value: 'FIND_PARTNERS', label: '找合作伙伴' },
  { value: 'FIND_DISTRIBUTORS', label: '找渠道' },
  { value: 'RESEARCH_COMPETITORS', label: '研究竞品' },
  { value: 'EXPLORE_MARKET', label: '探索市场' },
]

const SIGNAL_OPTIONS: Array<{ value: SignalFocus; label: string }> = [
  { value: 'ALL', label: '全部变化' },
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
    <Surface className="p-3 sm:p-4">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.35fr_repeat(5,minmax(0,0.78fr))_auto]">
        <TargetField icon={Radar} label="产品 / 服务">
          <input
            value={value.product}
            onChange={(event) => update('product', event.target.value)}
            placeholder="输入研究目标"
            className="market-target-control"
          />
        </TargetField>

        <TargetField icon={Target} label="商业目标">
          <select
            value={value.goal}
            onChange={(event) =>
              update('goal', event.target.value as CommercialGoal)
            }
            className="market-target-control"
          >
            {COMMERCIAL_GOAL_OPTIONS.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>
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

        <TargetField icon={Users} label="对象类型">
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
          className="min-h-[50px] self-stretch px-4 md:col-span-2 xl:col-span-1 xl:self-end"
        >
          <Radar className={running ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {running ? '扫描中' : '扫描'}
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
    <label className="flex min-h-[50px] min-w-0 items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 transition focus-within:border-ink-300 focus-within:ring-2 focus-within:ring-black/[0.04]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-medium text-ink-400">
          {label}
        </span>
        {children}
      </span>
    </label>
  )
}
