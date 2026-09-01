import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import type { RuntimeCapabilities, RuntimeCapability } from '@/types'
import { getRuntimeCapabilities } from '@/services/api'
import { WorkspaceHeader } from '@/components/ui/WorkspaceHeader'

const UNAVAILABLE_CAPABILITY: RuntimeCapability = {
  enabled: false,
  provider: null,
  model: null,
  reason: 'missing_api_key',
}

export function AccountPage() {
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCapabilities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getRuntimeCapabilities()
      setCapabilities(normalizeRuntimeCapabilities(result))
    } catch (requestError) {
      setCapabilities(null)
      setError(
        requestError instanceof Error
          ? requestError.message
          : '暂时无法读取运行配置。',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCapabilities()
  }, [loadCapabilities])

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
      <WorkspaceHeader
        title="设置"
        description="连接、模型与运行状态。"
        actions={
          !loading ? (
            <button
              type="button"
              onClick={() => void loadCapabilities()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 text-xs font-medium text-ink-600 transition hover:bg-ink-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新读取服务状态
            </button>
          ) : null
        }
      />

      <section className="overflow-hidden rounded-[20px] border border-black/[0.08] bg-white">
        <div className="border-b border-black/[0.06] px-4 py-3 sm:px-5">
          <h2 className="text-sm font-medium text-ink-900">运行能力</h2>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:m-5">
            <p className="text-sm font-medium text-rose-800">暂时无法读取运行配置</p>
            <p className="mt-1 text-xs leading-5 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadCapabilities()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新读取服务状态
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" /> 正在读取服务状态…
          </div>
        ) : capabilities ? (
          <div className="divide-y divide-black/[0.06]">
            <CapabilityRow title="市场联网研究" capability={capabilities.marketResearch} />
            <CapabilityRow title="AI 个性化话术" capability={capabilities.salesAI} />
            <CapabilityRow title="GPT 销售执行器" capability={capabilities.salesAgent} />
            <CapabilityRow title="公开联系人抓取" capability={capabilities.publicContactDiscovery} />
            <CapabilityRow title="销售机会搜索" capability={capabilities.salesDiscovery} />
          </div>
        ) : null}
      </section>

      <p className="mt-4 px-1 text-xs leading-5 text-ink-400">
        数据原则：只展示公开来源或已连接数据源中实际观察到的信息，并保留观察时间；未知字段不会推断。密钥只在服务端配置。
      </p>
    </div>
  )
}

export function normalizeRuntimeCapabilities(
  value: Partial<RuntimeCapabilities> | null | undefined,
): RuntimeCapabilities {
  return {
    marketResearch: value?.marketResearch ?? UNAVAILABLE_CAPABILITY,
    salesAI: value?.salesAI ?? UNAVAILABLE_CAPABILITY,
    salesAgent: value?.salesAgent ?? UNAVAILABLE_CAPABILITY,
    publicContactDiscovery:
      value?.publicContactDiscovery ?? UNAVAILABLE_CAPABILITY,
    salesDiscovery: value?.salesDiscovery ?? UNAVAILABLE_CAPABILITY,
  }
}

function capabilityDescription(
  capability: RuntimeCapability | undefined,
  reported: RuntimeCapability,
) {
  if (!capability) return '尚未报告运行状态'
  if (reported.enabled) {
    return `${reported.provider ?? '已连接'}${reported.model ? ` · ${reported.model}` : ''}`
  }
  if (String(reported.reason) === 'full_backend_required') {
    return '完整后端未连接'
  }
  return '尚未配置服务端凭据'
}

function CapabilityRow({
  title,
  capability,
}: {
  title: string
  capability?: RuntimeCapability
}) {
  const reported = capability ?? UNAVAILABLE_CAPABILITY
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="mt-0.5 truncate text-xs text-ink-400">
          {capabilityDescription(capability, reported)}
        </p>
      </div>
      <span className={reported.enabled ? 'text-emerald-600' : 'text-amber-500'}>
        {reported.enabled ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </span>
    </div>
  )
}
