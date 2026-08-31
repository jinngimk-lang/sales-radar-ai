import { useEffect, useMemo, useRef, useState } from 'react'
import { Radar, Search, Target } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { MarketResearchSession, MarketSignal } from '@/types'
import {
  ApiRequestError,
  getMarketSignals,
  runMarketResearch,
} from '@/services/api'
import {
  commercialTargetToMarketTarget,
  getCommercialTarget,
} from '@/services/commercial-targets'
import { Button } from '@/components/ui/Button'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'
import { AgentStatusBadge } from '@/components/ui/WorkspaceState'
import { DiscoveryModeSwitch } from '@/components/discovery/DiscoveryModeSwitch'
import { MarketScanTarget } from '@/features/market-intelligence/MarketScanTarget'
import { MarketBrowserWorkspace } from '@/features/market-intelligence/MarketBrowserWorkspace'
import { SignalTimeline } from '@/features/market-intelligence/SignalTimeline'
import { SignalAssessmentPanel } from '@/features/market-intelligence/SignalAssessmentPanel'
import { canRecordCommercialTargetRun } from '@/features/market-intelligence/commercial-target-context'
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
  goal: 'FIND_BUYERS',
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const commercialTargetId = searchParams.get('targetId')
  const [signals, setSignals] = useState<MarketSignal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [session, setSession] = useState<MarketResearchSession | null>(null)
  const [target, setTarget] = useState<MarketScanTargetValue>(EMPTY_TARGET)
  const [persistedTargetSnapshot, setPersistedTargetSnapshot] =
    useState<MarketScanTargetValue | null>(null)
  const [commercialTargetName, setCommercialTargetName] = useState<string | null>(
    null,
  )
  const [targetContextError, setTargetContextError] = useState<string | null>(null)
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

  useEffect(() => {
    setPersistedTargetSnapshot(null)

    if (!commercialTargetId) {
      setCommercialTargetName(null)
      setTargetContextError(null)
      return
    }

    let cancelled = false
    setTargetContextError(null)
    getCommercialTarget(commercialTargetId)
      .then((persistedTarget) => {
        if (cancelled) return
        if (persistedTarget.status !== 'ACTIVE') {
          setPersistedTargetSnapshot(null)
          setCommercialTargetName(null)
          setTargetContextError('目标已暂停或关闭，请先在目标页启用后再使用。')
          return
        }
        const restoredTarget = commercialTargetToMarketTarget(persistedTarget)
        setTarget(restoredTarget)
        setPersistedTargetSnapshot(restoredTarget)
        setCommercialTargetName(persistedTarget.name)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('[MarketRadar] Unable to restore commercial target', error)
        setPersistedTargetSnapshot(null)
        setCommercialTargetName(null)
        setTargetContextError(
          error instanceof Error ? error.message : '无法恢复这个商业目标',
        )
      })

    return () => {
      cancelled = true
    }
  }, [commercialTargetId])

  const selectedSignal = useMemo(
    () => signals.find((signal) => signal.id === selectedId) ?? null,
    [selectedId, signals],
  )
  const targetMatchesPersisted = canRecordCommercialTargetRun(
    target,
    persistedTargetSnapshot,
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
      const researchInput = {
        product: target.product.trim(),
        industry: target.industry || undefined,
        region: target.region || undefined,
        customerType: target.customerType || undefined,
        goal: target.goal,
        signalFocus: target.signalFocus,
        targetId:
          commercialTargetId && targetMatchesPersisted
            ? commercialTargetId
            : undefined,
      }
      const result = await runMarketResearch(researchInput)
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

  const openProactiveSearch = () => {
    const params = new URLSearchParams()
    const query = target.product.trim()
    if (query) params.set('q', query)
    if (commercialTargetId && targetMatchesPersisted) {
      params.set('targetId', commercialTargetId)
    }
    const suffix = params.toString()
    navigate(`/app/discover${suffix ? `?${suffix}` : ''}`)
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
  const exactTargetId = commercialTargetId && targetMatchesPersisted ? commercialTargetId : undefined

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="发现"
        description="先看推荐信号，再切到主动搜索；两个模式共享同一商业目标。"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {commercialTargetName ? (
              <button
                type="button"
                onClick={() => navigate('/app/targets')}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50 px-3 text-[10px] font-semibold text-brand-700 transition hover:bg-brand-100"
                title="切换商业目标"
              >
                <Target className="h-3.5 w-3.5" />
                <span className="max-w-40 truncate">{commercialTargetName}</span>
                {!targetMatchesPersisted ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-800">
                    临时修改
                  </span>
                ) : null}
              </button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={openProactiveSearch}>
              <Search className="h-3.5 w-3.5" />
              主动搜索
            </Button>
            <AgentStatusBadge status={visualStatus} />
          </div>
        }
      />

      <DiscoveryModeSwitch mode="recommend" targetId={exactTargetId} />

      {targetContextError ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          目标上下文未恢复：{targetContextError}。你仍然可以使用临时条件继续研究。
        </div>
      ) : null}

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
