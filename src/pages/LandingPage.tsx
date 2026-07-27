import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Radar, ArrowRight, Sparkles, Target, MessageSquareText } from 'lucide-react'
import { QUICK_INDUSTRY_TAGS } from '@/data/meta'

const PLACEHOLDERS = ['工业机器人', '美容仪', 'AI 软件', '机械设备', 'TWS 耳机', 'CNC 加工中心']

const FEATURES = [
  {
    icon: Radar,
    title: '客户发现',
    desc: '从全球公开信息中发现潜在买家。覆盖 Reddit、LinkedIn、X、Instagram 等 8 大平台，实时捕捉采购意向。',
    color: 'bg-brand-50 text-brand-600',
  },
  {
    icon: Target,
    title: '需求分析',
    desc: 'AI 判断客户购买意向与采购预算，自动评分排序，帮你把精力聚焦在最高价值的线索上。',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: MessageSquareText,
    title: '销售辅助',
    desc: '一键生成英文邮件、WhatsApp 消息、LinkedIn 私信，附带跟进计划与阶梯报价，开发效率提升 10 倍。',
    color: 'bg-amber-50 text-amber-600',
  },
]

const STATS = [
  { value: '8+', label: '数据平台' },
  { value: '190+', label: '覆盖国家' },
  { value: '10x', label: '开发效率' },
  { value: '24/7', label: '实时监控' },
]

const FLOW_STEPS = [
  {
    num: '01',
    title: '输入产品',
    desc: '输入「工业机器人」「美容仪」等关键词',
    icon: Search,
  },
  {
    num: '02',
    title: 'AI 发现客户',
    desc: '雷达扫描 8 大平台，捕捉采购意向帖子',
    icon: Radar,
  },
  {
    num: '03',
    title: '分析意向',
    desc: 'AI 评分排序，识别高概率采购客户',
    icon: Target,
  },
  {
    num: '04',
    title: '联系成交',
    desc: '一键生成邮件 / WhatsApp / LinkedIn 话术',
    icon: MessageSquareText,
  },
]

const DEMO_EXAMPLE = {
  product: '工业机器人',
  customer: 'Marcus Reyes',
  platform: 'Reddit',
  country: '美国',
  industry: '工业制造',
  post: "Looking for automation solutions for factory — we're scaling production and need reliable industrial robots. Budget approved for Q3 procurement.",
  needKeywords: ['工业机器人', '装配线', 'Q3 采购'],
  score: 92,
  action: '立即联系',
  reason: '客户已批准 Q3 采购预算，决策窗口紧迫',
}

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
            AI 驱动 · 全球客户雷达已上线
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl animate-fade-in-up">
            AI 驱动的
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              {' '}
             全球客户发现{' '}
            </span>
            平台
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-ink-500 animate-fade-in-up">
            输入你的产品，AI 自动发现全球潜在客户、需求和销售机会。
            <br className="hidden sm:block" />
            从 8 大平台实时捕捉采购意向，让获客像雷达一样精准。
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
                开始寻找客户
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

          {/* 统计 */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-ink-900">{s.value}</div>
                <div className="mt-1 text-sm text-ink-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用流程：4 步 */}
      <section className="border-y border-ink-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              四步完成全球获客
            </h2>
            <p className="mt-4 text-ink-500">
              从输入产品到联系客户，全流程 AI 自动化，销售新人也能立刻上手
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

      {/* 真实演示：输入「工业机器人」会看到什么 */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            真实案例演示
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            输入「{DEMO_EXAMPLE.product}」，立刻发现采购客户
          </h2>
          <p className="mt-4 text-ink-500">
            下面是 AI 在 Reddit 上实时捕捉到的一条高意向线索
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="card overflow-hidden p-6 shadow-card">
            {/* 客户头 */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
                  MR
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900">{DEMO_EXAMPLE.customer}</h3>
                    <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                      {DEMO_EXAMPLE.platform}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    @{DEMO_EXAMPLE.customer.toLowerCase().replace(' ', '_')} · {DEMO_EXAMPLE.country} · {DEMO_EXAMPLE.industry}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {DEMO_EXAMPLE.score}
              </span>
            </div>

            {/* 原始内容 */}
            <div className="mt-4 rounded-xl bg-ink-50 px-4 py-3">
              <p className="text-sm italic leading-relaxed text-ink-700">"{DEMO_EXAMPLE.post}"</p>
            </div>

            {/* AI 分析 */}
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                AI 分析结果
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DEMO_EXAMPLE.needKeywords.map((k) => (
                  <span key={k} className="chip bg-white text-brand-600 ring-1 ring-brand-100">
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-600">
                <span className="font-semibold text-ink-800">判断原因：</span>
                {DEMO_EXAMPLE.reason}
              </p>
            </div>

            {/* 推荐行动 */}
            <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 ring-1 ring-rose-200">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">推荐行动 · {DEMO_EXAMPLE.action}</span>
              </span>
              <button
                onClick={() => navigate(`/app/discover?q=${encodeURIComponent(DEMO_EXAMPLE.product)}`)}
                className="btn-primary ml-auto px-3 py-1.5 text-xs"
              >
                查看完整客户列表
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 产品能力 */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            从发现到成交，一站式 AI 获客
          </h2>
          <p className="mt-4 text-ink-500">
            三个核心能力，覆盖客户发现、意向判断与销售跟进全流程
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
              覆盖六大核心行业
            </h2>
            <p className="mt-4 text-ink-500">
              无论你卖什么产品，AI 都能帮你找到正在采购的全球客户
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
              现在就开始发现你的全球客户
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-brand-100">
              无需信用卡，输入产品即可体验 AI 客户发现。立即获取你的第一批高意向线索。
            </p>
            <button
              onClick={() => handleSearch()}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              <Radar className="h-4 w-4" />
              免费开始寻找客户
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
