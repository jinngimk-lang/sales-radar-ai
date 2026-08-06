import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  CheckCircle2,
  CircleUserRound,
  Database,
  ExternalLink,
  Globe2,
  Loader2,
  Radar,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react'
import type { RuntimeCapabilities, RuntimeCapability } from '@/types'
import { getRuntimeCapabilities } from '@/services/api'

export function AccountPage() {
  const [capabilities, setCapabilities] = useState<RuntimeCapabilities | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getRuntimeCapabilities()
      .then(setCapabilities)
      .catch(() => setFailed(true))
  }, [])

  return (
    <div className="workspace-page max-w-6xl pb-12">
      <div className="workspace-heading">
        <div>
          <p className="workspace-kicker">SETTINGS & RUNTIME</p>
          <h1>设置</h1>
          <p>查看工作区、模型、数据来源和字段可见性是否已经真实接通。</p>
        </div>
      </div>

      <section className="workspace-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white">
            <CircleUserRound className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Sales Radar 工作区</h2>
            <p className="mt-1 text-sm text-ink-500">当前为单工作区模式，研究结果和联系人字段按工作区隔离保存。</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> 工作区已连接
            </span>
          </div>
        </div>
        <Settings2 className="h-5 w-5 text-ink-300" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="workspace-panel p-6">
          <div>
            <h2 className="text-base font-semibold text-ink-900">运行能力</h2>
            <p className="mt-1 text-sm text-ink-500">只展示服务端实际配置状态，不读取或显示密钥内容。</p>
          </div>
          {failed ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">暂时无法读取运行配置。</div>
          ) : !capabilities ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> 正在读取服务状态…</div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CapabilityCard icon={Globe2} title="市场联网研究" capability={capabilities.marketResearch} />
              <CapabilityCard icon={Bot} title="AI 个性化话术" capability={capabilities.salesAI} />
              {capabilities.salesAgent ? (
                <CapabilityCard icon={Bot} title="GPT 销售执行器" capability={capabilities.salesAgent} />
              ) : null}
              <CapabilityCard icon={Users} title="公开联系人抓取" capability={capabilities.publicContactDiscovery} />
              <CapabilityCard icon={Search} title="销售机会搜索" capability={capabilities.salesDiscovery} />
            </div>
          )}
        </section>

        <section className="workspace-panel p-6">
          <h2 className="text-base font-semibold text-ink-900">工作区入口</h2>
          <p className="mt-1 text-sm text-ink-500">一级页面只保留真正承担任务的四个工作区。</p>
          <div className="mt-5 space-y-2">
            <WorkflowLink to="/app/home" icon={Bot} title="AI 首页" description="对话、工具轨迹和结构化结果" />
            <WorkflowLink to="/app/market" icon={Radar} title="市场雷达" description="联网研究与市场信号" />
            <WorkflowLink to="/app/revenue" icon={WalletCards} title="收益中心" description="实时执行、机会与结算" />
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
        <div className="flex items-start gap-3 border-b border-ink-100 bg-ink-50/70 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Database className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink-900">数据可见性</h2>
            <p className="mt-1 text-sm leading-6 text-ink-500">
              AI 首页展示的是公开来源或已连接数据源中实际观察到的业务信息，而不是完整私人档案。
            </p>
          </div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <VisibilityRule
            icon={Globe2}
            title="可以展示"
            text="公开姓名、职位、公司、邮箱、电话、社交主页、公开内容和商业信号。"
          />
          <VisibilityRule
            icon={ShieldCheck}
            title="视为已验证"
            text="字段必须保留来源 URL、提取方式、观察时间和 OBSERVED 验证状态。"
          />
          <VisibilityRule
            icon={XCircle}
            title="不会推断"
            text="不会根据姓名、域名或相似对象猜测邮箱、电话、身份、关系或私人资料。"
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/80 p-5">
        <p className="text-xs leading-6 text-ink-500">
          API 密钥只在 Railway 等服务端环境配置。前端不会读取或展示密钥；修改模型、搜索供应商或云浏览器配置时，应在部署平台更新对应环境变量。
        </p>
      </section>
    </div>
  )
}

function CapabilityCard({ icon: Icon, title, capability }: { icon: typeof Bot; title: string; capability: RuntimeCapability }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-ink-100"><Icon className="h-4 w-4" /></span>
        <span className={capability.enabled ? 'text-emerald-600' : 'text-amber-600'}>
          {capability.enabled ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-xs text-ink-500">
        {capability.enabled ? `${capability.provider}${capability.model ? ` · ${capability.model}` : ''}` : '尚未配置服务端凭据'}
      </p>
    </div>
  )
}

function WorkflowLink({ to, icon: Icon, title, description }: { to: string; icon: typeof Bot; title: string; description: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink-900">{title}</span><span className="mt-0.5 block text-xs text-ink-500">{description}</span></span>
      <ExternalLink className="h-3.5 w-3.5 text-ink-300" />
    </Link>
  )
}

function VisibilityRule({ icon: Icon, title, text }: { icon: typeof Bot; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/55 p-4">
      <Icon className="h-4 w-4 text-brand-700" />
      <h3 className="mt-3 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-ink-500">{text}</p>
    </div>
  )
}
