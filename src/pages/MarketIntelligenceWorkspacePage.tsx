import { useEffect, useMemo, useState } from 'react'
import { Radar } from 'lucide-react'
import type { MarketResearchSession, MarketSignal } from '@/types'
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
  message: '设置监控目标后开始联网研究。',
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
      console.error('[MarketRadar] Hosted research failed', error)
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

  const visualStatus =
    loadingSignals && agentState.status === 'idle'
      ? 'reviewing'
      : agentState.status
  const showTimeline = signals.length > 0

  return (
    <div className="workspace-page pb-12">
      <PageHeader
        eyebrow="SOURCE-BACKED MARKET MONITORING"
        title="市场雷达"
        description="持续搜索企业官网、新闻、招聘、投资和行业网页，把公开来源整理成可追溯的市场信号、风险和下一步动作。"
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
            'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs',
            agentState.status === 'failed'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-brand-100 bg-brand-50/60 text-ink-700',
          )}
        >
          <Radar
            className={cn(
              'h-4 w-4 shrink-0',
              agentState.status === 'running' && 'animate-spin',
            )}
          />
          <span>{agentState.message}</span>
        </div>
      ) : null}

      <div
        className={cn(
          'mt-5 grid gap-5',
          showTimeline &&
            'xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]',
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
        <div className="mt-5">
          <SignalAssessmentPanel signal={selectedSignal} />
        </div>
      ) : null}
    </div>
  )
}
