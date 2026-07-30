import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  CircleDot,
  Radar,
} from 'lucide-react'
import type {
  MarketSignal,
  SearchFilters,
  SearchProductContextDraft,
} from '@/types'
import { getMarketSignals, searchCustomers } from '@/services/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { AgentStatusBadge } from '@/components/ui/WorkspaceState'
import { MarketScanTarget } from '@/features/market-intelligence/MarketScanTarget'
import { MarketBrowserWorkspace } from '@/features/market-intelligence/MarketBrowserWorkspace'
import { SignalTimeline } from '@/features/market-intelligence/SignalTimeline'
import { SignalAssessmentPanel } from '@/features/market-intelligence/SignalAssessmentPanel'
import type {
  MarketAgentWorkspaceState,
  MarketScanTarget as MarketScanTargetValue,
} from '@/features/market-intelligence/market-intelligence.contract'
import { SIGNAL_META } from '@/features/market-intelligence/market-intelligence.meta'
import {
  CUSTOMER_TYPE_META,
  REGION_META,
} from '@/data/meta'
import { cn } from '@/lib/utils'

const EMPTY_TARGET: MarketScanTargetValue = {
  product: '',
  industry: '',
  region: '',
  customerType: '',
  signalFocus: 'ALL',
}

const INITIAL_AGENT_STATE: MarketAgentWorkspaceState = {
  status: 'idle',
  message: '设置产品和目标市场后开始扫描。',
  startedAt: null,
  completedAt: null,
  errorCode: null,
}

const WORKFLOW = [
  { label: '设置目标', description: '产品与市场范围' },
  { label: '来源研究', description: '浏览真实网页' },
  { label: '信号识别', description: '区分企业变化' },
  { label: '销售判断', description: '形成下一步建议' },
]

export function MarketIntelligenceWorkspacePage() {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [target, setTarget] = useState<MarketScanTargetValue>(EMPTY_TARGET)
  const [agentState, setAgentState] =
    useState<MarketAgentWorkspaceState>(INITIAL_AGENT_STATE)
  const [loadingSignals, setLoadingSignals] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    getMarketSignals()
      .then((items) => {
        if (cancelled) return
        setSignals(items)
        setSelectedId(items[0]?.id ?? null)
        setLoadError(false)
      })
      .catch((error) => {
        console.error('[MarketWorkspace] Unable to load market signals', error)
        if (!cancelled) {
          setSignals([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSignals(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedSignal = useMemo(
    () =>
      signals.find((signal) => signal.id === selectedId) ??
      signals[0] ??
      null,
    [selectedId, signals],
  )

  const uniqueSignalTypes = useMemo(
    () => new Set(signals.map((signal) => signal.signalType)).size,
    [signals],
  )

  const runMarketScan = async () => {
    if (!target.product.trim()) return

    const startedAt = new Date().toISOString()
    setAgentState({
      status: 'running',
      message: '正在获取与销售目标相关的真实市场来源。',
      startedAt,
      completedAt: null,
      errorCode: null,
    })

    try {
      const filters = buildSearchFilters(target)
      const productContext = buildProductContext(target)

      await searchCustomers(filters, productContext)

      setAgentState((current) => ({
        ...current,
        status: 'reviewing',
        message: '搜索任务已完成，正在整理真实市场信号。',
      }))

      const updatedSignals = await getMarketSignals()
      setSignals(updatedSignals)
      setSelectedId(updatedSignals[0]?.id ?? null)
      setLoadError(false)
      setAgentState({
        status: 'completed',
        message:
          updatedSignals.length > 0
            ? '真实市场信号已进入研究工作区。'
            : '本次扫描没有发现可展示的真实市场信号。',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: null,
      })
    } catch (error) {
      console.error('[MarketWorkspace] Market scan failed', error)
      setAgentState({
        status: 'failed',
        message: '系统暂时无法完成本次市场扫描，请稍后重试。',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'MARKET_SCAN_UNAVAILABLE',
      })
    }
  }

  const visualStatus = loadError
    ? 'failed'
    : loadingSignals
      ? 'reviewing'
      : agentState.status
  const activeWorkflowStep =
    visualStatus === 'running'
      ? 1
      : visualStatus === 'reviewing'
        ? 2
        : visualStatus === 'completed'
          ? 3
          : 0

  return (
    <div className="workspace-page pb-12">
      <PageHeader
        eyebrow="MARKET INTELLIGENCE WORKSPACE"
        title="市场机会中心"
        description="让市场侦察持续关注企业官网、新闻、招聘与投资变化，把真实来源整理成可研究的销售信号。"
        actions={<AgentStatusBadge status={visualStatus} />}
      />

      <MarketScanTarget
        value={target}
        running={
          agentState.status === 'running' ||
          agentState.status === 'reviewing'
        }
        onChange={setTarget}
        onStart={() => void runMarketScan()}
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="grid min-w-[700px] grid-cols-4 overflow-x-auto">
          {WORKFLOW.map((step, index) => (
            <div
              key={step.label}
              className="relative flex items-center gap-3 border-r border-ink-100 px-5 py-4 last:border-r-0"
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                  index < activeWorkflowStep
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : index === activeWorkflowStep
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-white text-ink-400',
                )}
              >
                {index < activeWorkflowStep ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  `0${index + 1}`
                )}
              </span>
              <span>
                <span className="block text-xs font-semibold text-ink-800">
                  {step.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-ink-400">
                  {step.description}
                </span>
              </span>
              {index < WORKFLOW.length - 1 && (
                <ArrowRight className="absolute right-3 h-3.5 w-3.5 text-ink-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            {agentState.status === 'failed' ? (
              <CircleDot className="h-4 w-4" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-xs font-semibold text-ink-800">
              {loadError
                ? '系统暂时无法读取市场信号，请稍后重试。'
                : loadingSignals
                  ? '正在读取已有市场信号'
                  : agentState.message}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-ink-400">
              扫描状态来自当前真实请求生命周期，不展示无法验证的页面访问记录。
            </p>
          </div>
        </div>
        {signals.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-ink-500">
            <span>
              真实信号{' '}
              <strong className="font-semibold text-ink-900">
                {signals.length}
              </strong>
            </span>
            <span>
              变化类型{' '}
              <strong className="font-semibold text-ink-900">
                {uniqueSignalTypes}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <MarketBrowserWorkspace
          signal={selectedSignal}
          status={visualStatus}
        />
        <SignalTimeline
          signals={signals}
          selectedId={selectedSignal?.id ?? null}
          onSelect={setSelectedId}
          unavailable={loadError}
        />
      </div>

      <div className="mt-5">
        <SignalAssessmentPanel signal={selectedSignal} />
      </div>
    </div>
  )
}

function buildSearchFilters(target: MarketScanTargetValue): SearchFilters {
  const query = [
    target.product.trim(),
    target.industry,
    target.region ? REGION_META[target.region].label : '',
    target.customerType
      ? CUSTOMER_TYPE_META[target.customerType].label
      : '',
    target.signalFocus === 'ALL'
      ? ''
      : SIGNAL_META[target.signalFocus].searchPhrase,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    query,
    platforms: [],
    regions: target.region ? [target.region] : [],
    customerTypes: target.customerType ? [target.customerType] : [],
    intentLevels: [],
    followUpStatuses: [],
    favoritesOnly: false,
  }
}

function buildProductContext(
  target: MarketScanTargetValue,
): SearchProductContextDraft {
  return {
    product: target.product.trim(),
    industry: target.industry || undefined,
    region: target.region || undefined,
    customerType: target.customerType || undefined,
    buyingSignals:
      target.signalFocus === 'ALL'
        ? undefined
        : [SIGNAL_META[target.signalFocus].label],
  }
}
