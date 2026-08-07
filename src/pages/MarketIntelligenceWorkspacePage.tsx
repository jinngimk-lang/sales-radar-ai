import { useEffect, useMemo, useRef, useState } from 'react'
import { Radar } from 'lucide-react'
import type { MarketResearchSession, MarketSignal } from '@/types'
import {
  ApiRequestError,
  getMarketSignals,
  runMarketResearch,
} from '@/services/api'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'
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
  message: '设置目标后开始研究。',
  startedAt: null,
  completedAt: null,
  errorCode: null,
}

export function MarketIntelligenceWorkspacePage() {
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [session, setSession] = useState<MarketResearchSession | null>(null)
  const [target, setTarget] = useState<MarketScanTargetValue>(EMPTY_TARGET)
  const [agentState, setAgentState] =
    useState<MarketAgentWorkspaceState>(INITIAL_AGENT_STATE)
  const [loadingSignals, setLoadingSignals] = useState(true)
  const assessmentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    getMarketSignals()
      .then((items) => {
        if (cancelled) return
        setSignals(items)
        setSelectedId(items[0]?.id ?? null)
      })
      .catch((error) => {
        console.error('[MarketRadar] Unable to load saved signals', error)
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
      message: '正在搜索公开来源…',
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
            ? `${result.sources.length} 个来源 · ${result.signals.length} 条信号`
            : '没有找到可验证的相关来源',
        startedAt,
        completedAt: result.completedAt,
        errorCode: null,
      })
    } catch (error) {
      console.error('[MarketRadar] Hosted research failed', error)
      const code = error instanceof ApiRequestError ? error.code : undefined
      setAgentState({
        status: 'failed',
        message:
          code === 'MARKET_RESEARCH_PROVIDER_UNAVAILABLE'
            ? '联网研究服务未配置'
            : error instanceof Error
              ? error.message
              : '本次研究失败',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: code ?? 'MARKET_SCAN_UNAVAILABLE',
      })
    }
  }

  const focusAssessment = () => {
    window.requestAnimationFrame(() => {
      assessmentRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const visualStatus =
    loadingSignals && agentState.status === 'idle'
      ? 'reviewing'
      : agentState.status
  const showTimeline = signals.length > 0

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="市场雷达"
        description="从公开来源发现变化。"
        actions={<AgentStatusBadge status={visualStatus} />}
      />

      <MarketScanTarget
        value={target}
        running={visualStatus === 'running' || visualStatus === 'reviewing'}
        onChange={setTarget}
        onStart={() => void runMarketScan()}
      />

      {agentState.status !== 'idle' ? (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs',
            agentState.status === 'failed'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-ink-100/70 text-ink-600',
          )}
        >
          <Radar
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              agentState.status === 'running' && 'animate-spin',
            )}
          />
          <span>{agentState.message}</span>
        </div>
      ) : null}

      <div
        className={cn(
          'mt-4 grid gap-4',
          showTimeline &&
            'xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.7fr)]',
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
        {showTimeline ? (
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
        ) : null}
      </div>

      {selectedSignal ? (
        <div
          id="sales-opportunity-assessment"
          ref={assessmentRef}
          className="mt-4 scroll-mt-20"
        >
          <SignalAssessmentPanel
            signal={selectedSignal}
            onFocusAssessment={focusAssessment}
          />
        </div>
      ) : null}
    </div>
  )
}
