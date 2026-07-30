import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CircleDot,
  Compass,
  Factory,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { QUICK_INDUSTRY_TAGS } from '@/data/meta'

const PLACEHOLDERS = [
  '欧洲工业机器人市场',
  '日本包装设备经销商',
  '东南亚制造业数字化升级',
  '德国工厂扩张',
]

const SIGNALS = [
  {
    icon: Factory,
    title: '企业扩张',
    description: '工厂、产线与产能变化',
    position: 'radar-signal radar-signal-one',
  },
  {
    icon: TrendingUp,
    title: '投资动态',
    description: '资本投入与业务增长方向',
    position: 'radar-signal radar-signal-two',
  },
  {
    icon: Building2,
    title: '数字化升级',
    description: '自动化与软件改造机会',
    position: 'radar-signal radar-signal-three',
  },
]

const STEPS = [
  {
    number: '一',
    title: '说清你卖什么',
    description: '输入产品、目标行业和市场方向。',
  },
  {
    number: '二',
    title: '发现正在发生的变化',
    description: '从真实来源中寻找企业投资、扩张与升级动态。',
  },
  {
    number: '三',
    title: '判断是否值得跟进',
    description: '核验公司与来源，理解它与你的产品为什么相关。',
  },
  {
    number: '四',
    title: '进入销售行动',
    description: '研究公司与联系人方向，准备有依据的触达策略。',
  },
]

const FEATURES = [
  {
    icon: Compass,
    eyebrow: 'DISCOVER',
    title: '看见变化',
    description:
      '把分散的企业投资、工厂扩张和数字化升级信息，整理成销售人员容易理解的机会。',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'VERIFY',
    title: '保留依据',
    description:
      '每个事实回到真实来源。信息不足时明确标记待确认，不把市场动向写成采购事实。',
  },
  {
    icon: CircleDot,
    eyebrow: 'ACT',
    title: '找到切入点',
    description:
      '围绕企业变化与产品方向，给出研究建议和下一步行动，让发现真正进入销售工作。',
  },
]

const INDUSTRIES = [
  ['包装自动化', '包装设备 · 产线升级 · 食品医药'],
  ['工业制造', '机器人 · 自动化 · CNC'],
  ['新能源设备', '电池 · 储能 · 生产设备'],
  ['智能工厂', '数字化 · MES · 工业软件'],
  ['供应链', '物流 · 仓储 · 采购协同'],
  ['企业软件', 'CRM · 数据 · 运营效率'],
]

export function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  const handleSearch = (keyword?: string) => {
    const value = (keyword ?? query).trim()
    navigate(`/app/discover${value ? `?q=${encodeURIComponent(value)}` : ''}`)
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % PLACEHOLDERS.length)
    }, 3200)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="landing-shell overflow-hidden">
      <section className="relative">
        <div className="landing-grid pointer-events-none absolute inset-0" />
        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-16">
          <div className="relative z-10 max-w-2xl">
            <div className="landing-reveal flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-ink-500">
              <span className="h-px w-9 bg-vermilion" />
              SALES OPPORTUNITY RADAR
            </div>

            <h1 className="landing-reveal landing-delay-1 mt-7 text-[3.7rem] font-medium leading-[1.03] tracking-[-0.06em] text-ink-900 sm:text-[4.9rem] lg:text-[5.15rem]">
              发现市场变化
              <span className="mt-2 block font-normal text-brand-700">
                看见销售机会
              </span>
            </h1>

            <p className="landing-reveal landing-delay-2 mt-6 max-w-2xl text-lg leading-8 text-ink-600 sm:text-xl sm:leading-9">
              输入你的产品和目标市场，发现正在发生变化的企业、行业机会和潜在客户。
              从真实来源出发，更安静、更准确地找到值得跟进的方向。
            </p>

            <div className="landing-reveal landing-delay-3 mt-8 max-w-2xl">
              <div className="landing-search group">
                <Search className="ml-1 h-5 w-5 shrink-0 text-ink-400 transition-colors group-focus-within:text-brand-600" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  placeholder={`试试：${PLACEHOLDERS[placeholderIndex]}`}
                  aria-label="输入产品和目标市场"
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 sm:text-base"
                />
                <button
                  onClick={() => handleSearch()}
                  className="landing-search-button"
                >
                  开始发现
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-ink-400">快速开始</span>
                {QUICK_INDUSTRY_TAGS.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="rounded-full border border-ink-300 bg-white px-3 py-1.5 text-xs text-ink-700 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-700"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-reveal landing-delay-2 relative mx-auto hidden h-[540px] w-full max-w-[540px] lg:block">
            <div className="radar-stage">
              <div className="radar-circle radar-circle-one" />
              <div className="radar-circle radar-circle-two" />
              <div className="radar-circle radar-circle-three" />
              <div className="radar-axis radar-axis-horizontal" />
              <div className="radar-axis radar-axis-vertical" />
              <div className="radar-sweep" />
              <div className="radar-core">
                <Radar className="h-5 w-5" />
              </div>

              {SIGNALS.map((signal) => (
                <div key={signal.title} className={signal.position}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <signal.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-800">
                      {signal.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {signal.description}
                    </p>
                  </div>
                </div>
              ))}

              <div className="radar-note">
                <span className="radar-live-dot" />
                正在关注企业与市场变化
              </div>
            </div>

            <span className="absolute right-1 top-10 text-[10px] tracking-[0.22em] text-ink-300 [writing-mode:vertical-rl]">
              MARKET MOVEMENT · SALES DIRECTION
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid border-y border-ink-900/10 py-7 sm:grid-cols-3">
            {[
              ['01', '快速发现销售目标'],
              ['02', '捕捉企业变化机会'],
              ['03', '基于真实来源判断'],
            ].map(([number, label], index) => (
              <div
                key={number}
                className={`flex items-center gap-4 py-3 sm:px-7 ${
                  index > 0 ? 'sm:border-l sm:border-ink-900/10' : ''
                }`}
              >
                <span className="font-mono text-[11px] text-vermilion">
                  {number}
                </span>
                <span className="text-sm tracking-wide text-ink-700">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="landing-kicker">HOW IT WORKS</p>
            <h2 className="mt-5 max-w-sm text-3xl font-medium leading-tight tracking-[-0.035em] text-ink-900 sm:text-5xl">
              从一个方向，
              <br />
              走到一次行动。
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-ink-500">
              不追求堆满结果。先看见变化，再理解公司，最后决定是否值得投入销售时间。
            </p>
          </div>

          <div className="border-t border-ink-900/10">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="group grid gap-3 border-b border-ink-200 py-7 transition-colors hover:bg-ink-50 sm:grid-cols-[52px_190px_1fr] sm:items-center sm:px-4"
              >
                <span className="text-xs text-vermilion">{step.number}</span>
                <h3 className="text-base font-semibold text-ink-900">
                  {step.title}
                </h3>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm leading-6 text-ink-500">
                    {step.description}
                  </p>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="landing-kicker">QUIET INTELLIGENCE</p>
              <h2 className="mt-5 text-3xl font-medium tracking-[-0.035em] text-ink-900 sm:text-5xl">
                少一点噪音，
                <br />
                多一点判断。
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-ink-500">
              销售机会、市场变化和已确认客户始终保持清晰边界。系统帮助研究，不替你编造事实。
            </p>
          </div>

          <div className="mt-16 grid gap-px overflow-hidden border border-ink-900/10 bg-ink-900/10 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <article
                key={feature.title}
                className="group relative min-h-[320px] bg-white p-8 transition-colors duration-500 hover:bg-ink-50 sm:p-10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-ink-400">
                    {feature.eyebrow}
                  </span>
                  <span className="font-mono text-[10px] text-ink-300">
                    0{index + 1}
                  </span>
                </div>
                <feature.icon className="mt-14 h-7 w-7 text-brand-700 transition-transform duration-500 group-hover:-translate-y-1" />
                <h3 className="mt-7 text-2xl font-medium text-ink-900">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-ink-500">
                  {feature.description}
                </p>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-vermilion transition-all duration-500 group-hover:w-full" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="industries" className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="landing-kicker">EXPLORE BY INDUSTRY</p>
            <h2 className="mt-5 text-3xl font-medium tracking-[-0.035em] text-ink-900 sm:text-5xl">
              从你的行业开始。
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-ink-500">
              选择一个方向，查看相关企业变化与可验证的销售目标。
            </p>
          </div>

          <div className="grid sm:grid-cols-2">
            {INDUSTRIES.map(([name, description], index) => (
              <button
                key={name}
                onClick={() => handleSearch(name)}
                className={`group flex min-h-36 items-end justify-between border-ink-900/10 p-6 text-left transition-all hover:bg-white ${
                  index % 2 === 1 ? 'sm:border-l' : ''
                } ${index >= 2 ? 'border-t' : ''}`}
              >
                <div>
                  <p className="text-lg font-medium text-ink-900">{name}</p>
                  <p className="mt-2 text-xs tracking-wide text-ink-400">
                    {description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 transition-all group-hover:translate-x-1 group-hover:text-vermilion" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <div className="landing-cta relative overflow-hidden px-7 py-14 sm:px-14 sm:py-20">
          <div className="landing-cta-orbit landing-cta-orbit-one" />
          <div className="landing-cta-orbit landing-cta-orbit-two" />
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 text-xs tracking-[0.18em] text-white/55">
              <Sparkles className="h-3.5 w-3.5" />
              START WITH A DIRECTION
            </div>
            <h2 className="mt-6 text-3xl font-medium tracking-[-0.04em] text-white sm:text-5xl">
              下一个销售机会，
              <br />
              也许正在发生。
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/65">
              从你的产品和目标市场开始，让分散的企业变化成为清晰、可研究的销售方向。
            </p>
            <button
              onClick={() => handleSearch()}
              className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition-all hover:-translate-y-0.5 hover:bg-paper hover:shadow-2xl active:translate-y-0"
            >
              开始发现销售机会
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
