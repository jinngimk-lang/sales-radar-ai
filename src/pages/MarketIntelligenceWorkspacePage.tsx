import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Radar } from 'lucide-react'
import type {
  MarketResearchSession,
  MarketSignal,
} from '@/types'
import {
  ApiRequestError,
  getMarketSignals,
  runMarketResearch,
} from '@/services/api'
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
  message: '设置产品和目标市场后开始联网研究。',
  startedAt: null,
  completedAt: null,
  errorCode: null,
}

const WORKFLOW = [
  { label: '设置目标', description: '产品与市场范围' },
  { label: '联网研究', description: '搜索并打开网页' },
  { label: '信号识别', description: '保存来源证据' },
  { label: '销售判断', description: '形成下一步建议' },
]

export function MarketIntelligenceWorkspacePage() {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [session, setSession] = useState<MarketResearchSession | null>(null)
  const [target, setTarget] = useState<MarketScanTargetValue>(EMPTY_TARGET)
  const [agentState, setAgentState] =
    useState<MarketAgentWorkspaceState>(INITIAL_AGENT_STATE)
  const [loadingSignals, setLoadingSignals] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMarketSignals()
      .then((items) => {
        if (cancelled) return
        setSignals(items)
        setSelectedId(items[0]?.id ?? null)
      })
      .catch((error) => {
        console.error('[MarketWorkspace] Unable to load saved signals', error)
      })
      .finally(() => {
        if (!cancelled) setLoadingSignals(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedSignal = useMemo(
    () => signals.find((signal) => signal.id === selectedId) ?? null,
    [selectedId, signals],
  )

  const runMarketScan = async () => {
    if (!target.product.trim()) return
    const startedAt = new Date().toISOString()
    setSession(null)
    setSelectedSourceId(null)
    setAgentState({
      status: 'running',
      message: '云端研究正在搜索并打开公开网页。',
      startedAt,
      completedAt: null,
      errorCode: null,
    })

    try {
      const result = await runMarketResearch({
        product: target.product.trim(),
        industry: target.industry || undefined,
        region: target.region || undefined,
        customerType: target.customerType || undefined,
        signalFocus: target.signalFocus,
      })
      setSession(result)
      setSelectedSourceId(result.sources[0]?.id ?? null)
      const updatedSignals = await getMarketSignals()
      setSignals(updatedSignals)
      setSelectedId(result.signals[0]?.id ?? updatedSignals[0]?.id ?? null)
      setAgentState({
        status: 'completed',
        message:
          result.sources.length > 0
            ? `研究完成：访问 ${result.sources.length} 个真实来源，保存 ${result.signals.length} 条市场信号。`
            : '研究完成，但没有找到可验证的相关来源。',
        startedAt,
        completedAt: result.completedAt,
        errorCode: null,
      })
    } catch (error) {
      console.error('[MarketWorkspace] Hosted research failed', error)
      const code = error instanceof ApiRequestError ? error.code : undefined
      setAgentState({
        status: 'failed',
        message:
          code === 'MARKET_RESEARCH_PROVIDER_UNAVAILABLE'
            ? '联网研究服务尚未配置，请在服务端配置 OpenAI 或千问 API。'
            : error instanceof Error
              ? error.message
              : '系统暂时无法完成本次市场研究。',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: code ?? 'MARKET_SCAN_UNAVAILABLE',
      })
    }
  }

  const visualStatus = loadingSignals && agentState.status === 'idle'
    ? 'reviewing'
    : agentState.status
  const activeWorkflowStep =
    visualStatus === 'running' || visualStatus === 'reviewing'
      ? 1
      : visualStatus === 'completed'
        ? 3
        : 0
  const showTimeline = signals.length > 0

  return (
    <div className="workspace-page pb-12">
      <PageHeader
        eyebrow="HOSTED MARKET RESEARCH"
        title="市场机会中心"
        description="让 AI 主动搜索并打开企业官网、新闻、招聘、投资和行业网页，把真实来源整理成可行动的市场信号。"
        actions={<AgentStatusBadge status={visualStatus} />}
      />

      <MarketScanTarget
        value={target}
        running={visualStatus === 'running' || visualStatus === 'reviewing'}
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
                {index < activeWorkflowStep ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}
              </span>
              <span>
                <span className="block text-xs font-semibold text-ink-800">{step.label}</span>
                <span className="mt-0.5 block text-[10px] text-ink-400">{step.description}</span>
              </span>
              {index < WORKFLOW.length - 1 && (
                <ArrowRight className="absolute right-3 h-3.5 w-3.5 text-ink-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {agentState.status !== 'idle' && (
        <div
          className={cn(
            'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs',
            agentState.status === 'failed'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-brand-100 bg-brand-50/60 text-ink-700',
          )}
        >
          <Radar className={cn('h-4 w-4 shrink-0', agentState.status === 'running' && 'animate-spin')} />
          <span>{agentState.message}</span>
        </div>
      )}

      <div
        className={cn(
          'mt-5 grid gap-5',
          showTimeline && 'xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]',
        )}
      >
        <MarketBrowserWorkspace
          session={session}
          signal={selectedSignal}
          selectedSourceId={selectedSourceId}
          status={visualStatus}
          onSelectSource={(sourceId) => {
            setSelectedSourceId(sourceId)
            const source = session?.sources.find((item) => item.id === sourceId)
            const matchingSignal = source
              ? signals.find((item) => item.sourceUrl === source.url)
              : null
            if (matchingSignal) setSelectedId(matchingSignal.id)
          }}
        />
        {showTimeline && (
          <SignalTimeline
            signals={signals}
            selectedId={selectedSignal?.id ?? null}
            onSelect={(id) => {
              setSelectedId(id)
              const signal = signals.find((item) => item.id === id)
              const source = signal
                ? session?.sources.find((item) => item.url === signal.sourceUrl)
                : null
              if (source) setSelectedSourceId(source.id)
            }}
          />
        )}
      </div>

      {selectedSignal && (
        <div className="mt-5">
          <SignalAssessmentPanel signal={selectedSignal} />
        </div>
      )}
    </div>
  )
}
