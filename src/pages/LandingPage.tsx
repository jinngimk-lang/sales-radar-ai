import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Radar, ArrowRight, Sparkles, Target, MessageSquareText } from 'lucide-react'
import { QUICK_INDUSTRY_TAGS } from '@/data/meta'

const PLACEHOLDERS = ['工业机器人', '美容仪', 'AI 软件', '机械设备', 'TWS 耳机', 'CNC 加工中心']

const FEATURES = [
  {
    icon: Radar,
    title: '发现销售机会',
    desc: '从真实公开来源中识别企业扩张、投资与数字化升级信号，并保留可核验的来源证据。',
    color: 'bg-brand-50 text-brand-600',
  },
  {
    icon: Target,
    title: '分析公司与证据',
    desc: '区分市场机会与已确认客户，解释机会为何相关；没有充分证据时保持待验证，而不是补造信息。',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: MessageSquareText,
    title: '转化为销售行动',
    desc: '围绕真实公司信息和事件证据，研究联系人、推荐切入角度，并为后续触达准备销售策略。',
    color: 'bg-amber-50 text-amber-600',
  },
]

const FLOW_STEPS = [
  {
    num: '01',
    title: '描述销售目标',
    desc: '说明你销售的产品、目标行业和地区',
    icon: Search,
  },
  {
    num: '02',
    title: '发现真实机会',
    desc: '从公开信息中识别投资、扩张与数字化升级事件',
    icon: Radar,
  },
  {
    num: '03',
    title: '分析公司',
    desc: '核验公司、来源证据与产品相关性',
    icon: Target,
  },
  {
    num: '04',
    title: '形成销售行动',
    desc: '确认客户后研究联系人并准备触达策略',
    icon: MessageSquareText,
  },
]

const INDUSTRIES = [
  { name: '工业制造', desc: '机器人、自动化设备、CNC 加工' },
  { name: '消费电子', desc: '智能硬件、音频、可穿戴设备' },
  { name: '医疗健康', desc: '医用设备、医美仪器、居家养老' },
  { name: 'SaaS 软件', desc: 'CRM、数据分析、营销自动化' },
  { name: '贸易出口', desc: '包装、家纺、餐厨用品' },
  { name: '美容行业', desc: '护肤代工、美发沙龙、美容仪' },
]

/** 首页 Landing Page */
export function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)

  const handleSearch = (keyword?: string) => {
    const q = (keyword ?? query).trim()
    navigate(`/app/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  }

  // placeholder 轮播
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50/60 via-white to-white" />
          <div className="absolute left-1/2 top-0 h-[480px] w-[840px] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(15,30,77,0.06) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 animate-fade-in-up">
            <Sparkles className="h-3.5 w-3.5" />
            AI 驱动的 B2B 销售机会情报
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl animate-fade-in-up">
            发现值得行动的
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              {' '}
              B2B 销售机会
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-ink-500 animate-fade-in-up">
            描述你销售的产品与目标市场，系统从真实公开信息中发现企业投资、
            扩张和数字化升级信号。
            <br className="hidden sm:block" />
            查看来源证据，分析相关公司，再把机会转化为可靠的销售行动。
          </p>

          {/* 中央搜索框 */}
          <div className="mx-auto mt-10 max-w-2xl animate-fade-in-up">
            <div className="group flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-card transition-all focus-within:border-brand-400 focus-within:shadow-glow">
              <div className="flex flex-1 items-center gap-3 pl-3">
                <Search className="h-5 w-5 shrink-0 text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={`例如：${PLACEHOLDERS[placeholderIdx]}`}
                  className="w-full bg-transparent py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
                />
              </div>
              <button onClick={() => handleSearch()} className="btn-primary shrink-0 px-5 py-3">
                <Radar className="h-4 w-4" />
                开始发现机会
              </button>
            </div>

            {/* 快速行业标签 */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-ink-400">热门：</span>
              {QUICK_INDUSTRY_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  className="chip border border-ink-200 bg-white text-ink-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-16 flex max-w-3xl flex-wrap justify-center gap-3 text-sm text-ink-600">
            {['真实来源证据', '机会与客户分层', '不确定信息保持待验证'].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full border border-ink-200 bg-white px-4 py-2"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* 使用流程：4 步 */}
      <section className="border-y border-ink-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              从市场变化到销售行动
            </h2>
            <p className="mt-4 text-ink-500">
              先发现真实机会，再核验公司和客户资格；机会不会被自动冒充为客户
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {FLOW_STEPS.map((step, idx) => (
              <div key={step.num} className="relative">
                <div className="card h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-brand-200">{step.num}</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <step.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.desc}</p>
                </div>
                {/* 连接箭头 */}
                {idx < FLOW_STEPS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-ink-300 md:block">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 数据真实性说明 */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            可信机会原则
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            少一些结果，多一些可信证据
          </h2>
          <p className="mt-4 text-ink-500">
            市场事件可以成为销售机会，但不会因此自动成为已确认客户。
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {[
            ['销售机会', '企业事件与产品方向相关，并保留真实来源。'],
            ['待验证公司', '公司身份或域名不足时继续保留证据，不生成客户。'],
            ['已确认客户', '仅在身份、域名、证据与产品相关性全部通过后进入。'],
          ].map(([title, description]) => (
            <div key={title} className="card p-6">
              <h3 className="font-semibold text-ink-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 产品能力 */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            从机会发现到销售准备
          </h2>
          <p className="mt-4 text-ink-500">
            三个核心能力，帮助销售更快找到值得研究和行动的商业信号
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f, idx) => (
            <div
              key={f.title}
              className="card group p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${f.color}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 行业覆盖 */}
      <section id="industries" className="border-y border-ink-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              适用于多类 B2B 销售场景
            </h2>
            <p className="mt-4 text-ink-500">
              从产品与目标市场出发，寻找相关企业变化与可验证客户
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.name}
                onClick={() => handleSearch(ind.name)}
                className="card group flex items-start gap-4 p-5 text-left transition-all hover:border-brand-300 hover:shadow-card-hover"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink-900">{ind.name}</h3>
                  <p className="mt-1 text-sm text-ink-500">{ind.desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-ink-300 transition-all group-hover:translate-x-1 group-hover:text-brand-500" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-14 text-center shadow-xl sm:px-16">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              从一个真实销售目标开始
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-100">
              输入产品、行业和目标地区，发现有证据的市场机会，并逐步核验为可行动客户。
            </p>
            <button
              onClick={() => handleSearch()}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              <Radar className="h-4 w-4" />
              开始发现销售机会
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
