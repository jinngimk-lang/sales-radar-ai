import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Check,
  CircleDot,
  Compass,
  Factory,
  FileSearch,
  Globe2,
  Newspaper,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { QUICK_INDUSTRY_TAGS } from '@/data/meta'

const PLACEHOLDERS = [
  '工业机器人，欧洲汽车制造企业',
  '包装自动化，东南亚食品工厂',
  'CRM SaaS，欧洲中小企业',
  '新能源设备，寻找渠道合作伙伴',
]

const TYPEWRITER_SIGNALS = [
  '企业扩张',
  '投资动态',
  '数字化升级',
  '招聘变化',
]

const ORBIT_SIGNALS = [
  {
    icon: Factory,
    title: '工厂扩张',
    meta: '企业变化',
    className: 'signal-node signal-node-one',
  },
  {
    icon: TrendingUp,
    title: '投资动态',
    meta: '市场变化',
    className: 'signal-node signal-node-two',
  },
  {
    icon: Building2,
    title: '数字化升级',
    meta: '升级方向',
    className: 'signal-node signal-node-three',
  },
  {
    icon: Newspaper,
    title: '公开信息',
    meta: '真实来源',
    className: 'signal-node signal-node-four',
  },
]

const WORKFLOW = [
  {
    number: '01',
    title: '定义销售方向',
    description: '输入产品、目标市场和希望寻找的企业角色。',
  },
  {
    number: '02',
    title: '读取市场变化',
    description: '从企业官网、新闻、招聘与公开页面获取真实信息。',
  },
  {
    number: '03',
    title: '评估销售关系',
    description: '分别标注匹配度、可信度、风险和需要确认的内容。',
  },
  {
    number: '04',
    title: '进入销售行动',
    description: '研究企业、理解切入点，再决定是否值得跟进。',
  },
]

const CAPABILITIES = [
  {
    icon: Globe2,
    eyebrow: 'DISCOVER',
    title: '看见正在发生的变化',
    description:
      '把分散在企业官网、行业新闻、招聘与公开页面中的变化，整理成可以浏览的市场信息。',
    detail: '来源被保留，原始页面可以随时打开核对。',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'ASSESS',
    title: '让不确定性清楚可见',
    description:
      '机会、潜在机会、市场信号和待确认信息分层展示，不用一个结论覆盖所有真实信息。',
    detail: '分数帮助排序，不代表企业已经成为客户。',
  },
  {
    icon: FileSearch,
    eyebrow: 'RESEARCH',
    title: '从发现走到企业研究',
    description:
      '围绕机会背景、企业身份、产品关联和真实来源，形成下一步研究与销售行动建议。',
    detail: '建议始终和事实分开，不虚构采购行为。',
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
    }, 3600)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <main className="landing-shell overflow-hidden">
      <section className="landing-hero-wrap">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-aurora landing-aurora-one" aria-hidden="true" />
        <div className="landing-aurora landing-aurora-two" aria-hidden="true" />

        <div className="relative mx-auto grid min-h-[760px] max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="landing-reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-[11px] font-semibold tracking-[0.16em] text-white/75 backdrop-blur">
              <span className="landing-status-dot" />
              SALES OPPORTUNITY RADAR
            </div>

            <h1 className="landing-reveal landing-delay-1 mt-8 text-[3.45rem] font-semibold leading-[0.98] tracking-[-0.065em] text-white sm:text-[4.75rem] lg:text-[5.25rem]">
              让市场变化
              <span className="mt-2 block text-sky-300">成为销售方向</span>
            </h1>

            <div className="landing-reveal landing-delay-2 mt-7 flex min-h-8 items-center gap-2 text-sm font-medium text-white/70 sm:text-base">
              <span>雷达可以发现</span>
              <TypewriterSignal />
            </div>

            <p className="landing-reveal landing-delay-2 mt-4 max-w-xl text-base leading-8 text-white/65 sm:text-lg">
              输入你的产品和目标市场，从真实网页中发现企业变化、市场机会和潜在销售目标，再用清晰评分决定下一步。
            </p>

            <div className="landing-reveal landing-delay-3 mt-9 max-w-2xl">
              <div className="landing-search landing-search-dark group">
                <Search className="ml-2 h-5 w-5 shrink-0 text-white/45 transition-colors group-focus-within:text-sky-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  placeholder={`试试：${PLACEHOLDERS[placeholderIndex]}`}
                  aria-label="输入产品和目标市场"
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-white/35 sm:text-base"
                />
                <button
                  onClick={() => handleSearch()}
                  className="landing-search-button landing-search-button-light"
                >
                  开始发现
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-white/35">快速开始</span>
                {QUICK_INDUSTRY_TAGS.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/65 transition-all hover:-translate-y-0.5 hover:border-sky-300/50 hover:bg-white/10 hover:text-white"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="landing-reveal landing-delay-3 mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
              {['真实来源', '中英文理解', '全部结果分层展示'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-sky-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-reveal landing-delay-2 relative mx-auto hidden h-[620px] w-full max-w-[650px] lg:block">
            <div className="signal-universe">
              <div className="signal-orbit signal-orbit-one">
                <span />
              </div>
              <div className="signal-orbit signal-orbit-two">
                <span />
              </div>
              <div className="signal-orbit signal-orbit-three">
                <span />
              </div>
              <div className="signal-axis signal-axis-horizontal" />
              <div className="signal-axis signal-axis-vertical" />
              <div className="signal-sweep" />

              <div className="signal-core">
                <span className="signal-core-pulse" />
                <Radar className="h-7 w-7" />
                <strong>市场雷达</strong>
                <small>等待你的销售方向</small>
              </div>

              {ORBIT_SIGNALS.map((signal) => (
                <div key={signal.title} className={signal.className}>
                  <span className="signal-node-icon">
                    <signal.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <strong>{signal.title}</strong>
                    <small>{signal.meta}</small>
                  </span>
                </div>
              ))}

              <div className="signal-activity">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-semibold text-white/75">
                    <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                    开始搜索后
                  </span>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] tracking-[0.14em] text-white/35">
                    EVIDENCE FIRST
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    '读取企业官网与公开页面',
                    '核对事件、时间和企业主体',
                    '评估与当前销售目标的关系',
                  ].map((item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[9px] text-sky-300">
                        0{index + 1}
                      </span>
                      <span className="text-[11px] text-white/55">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-[1440px] px-5 pb-8 sm:px-8 lg:px-12">
          <div className="landing-source-strip">
            <span>企业官网</span>
            <span>公开新闻</span>
            <span>招聘变化</span>
            <span>投资公告</span>
            <span>社交平台</span>
            <span>行业媒体</span>
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="landing-kicker">ONE CONTINUOUS WORKFLOW</p>
            <h2 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em] text-ink-900 sm:text-5xl">
              从一个市场方向，
              <br />
              走到一次销售行动。
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-ink-500">
              不是把网页堆成列表，而是保留真实来源，再说明它和你当前销售目标有什么关系。
            </p>
          </div>

          <div className="landing-workflow">
            {WORKFLOW.map((step, index) => (
              <article key={step.number} className="landing-workflow-step">
                <span className="landing-workflow-number">{step.number}</span>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-brand-600">
                    {index === 0
                      ? 'INPUT'
                      : index === 1
                        ? 'SOURCE'
                        : index === 2
                          ? 'ASSESSMENT'
                          : 'ACTION'}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-ink-500">
                    {step.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-300" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="landing-kicker">MARKET TO ACTION</p>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-ink-900 sm:text-5xl">
                更多真实信息，
                <br />
                更清楚的销售判断。
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-ink-500">
              系统展示找到的信息，也展示风险和待确认项。销售人员保留最终判断权。
            </p>
          </div>

          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            {CAPABILITIES.map((capability, index) => (
              <article
                key={capability.title}
                className="landing-capability-card group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-brand-600">
                    {capability.eyebrow}
                  </span>
                  <span className="font-mono text-[10px] text-ink-300">
                    0{index + 1}
                  </span>
                </div>
                <span className="mt-14 flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200 bg-white text-brand-700 shadow-sm">
                  <capability.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-7 text-2xl font-semibold tracking-tight text-ink-900">
                  {capability.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-ink-500">
                  {capability.description}
                </p>
                <div className="mt-8 border-t border-ink-200 pt-5 text-xs leading-6 text-ink-400">
                  {capability.detail}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="landing-assessment-preview">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-white/40">
                    RADAR ASSESSMENT
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    每条真实信息，都有自己的判断状态
                  </h3>
                </div>
                <CircleDot className="h-5 w-5 text-sky-300" />
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  ['🔥', '机会', '商业变化与当前目标高度相关'],
                  ['🟡', '潜在机会', '可能相关，仍有信息需要验证'],
                  ['🔵', '市场信号', '值得观察的行业或企业变化'],
                  ['⚪', '待确认', '主体、角色或事件关系尚不充分'],
                ].map(([icon, title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span>{icon}</span>
                      {title}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-ink-200 bg-white p-7 shadow-card sm:p-9">
              <Compass className="h-6 w-6 text-brand-700" />
              <p className="mt-10 text-[10px] font-semibold tracking-[0.18em] text-ink-400">
                USER CONTROL
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">
                分数负责解释，
                <br />
                你负责决定。
              </h3>
              <p className="mt-5 text-sm leading-7 text-ink-500">
                匹配度、可信度和风险分开显示。低分结果不会伪装成客户，也不会因为不确定就消失。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="industries" className="mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="landing-kicker">EXPLORE A DIRECTION</p>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-ink-900 sm:text-5xl">
              从你的产品与市场开始。
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-ink-500">
              选择一个方向，进入真实搜索与 Radar 判断工作区。
            </p>
          </div>

          <div className="grid overflow-hidden rounded-[1.75rem] border border-ink-200 bg-white sm:grid-cols-2">
            {INDUSTRIES.map(([name, description], index) => (
              <button
                key={name}
                onClick={() => handleSearch(name)}
                className={`group flex min-h-40 items-end justify-between p-6 text-left transition-all hover:bg-ink-50 sm:p-7 ${
                  index % 2 === 1 ? 'sm:border-l sm:border-ink-200' : ''
                } ${index >= 2 ? 'border-t border-ink-200' : ''}`}
              >
                <div>
                  <p className="text-lg font-semibold text-ink-900">{name}</p>
                  <p className="mt-2 text-xs leading-5 text-ink-400">
                    {description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 transition-all group-hover:translate-x-1 group-hover:text-brand-600" />
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
              START WITH A SALES DIRECTION
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
              下一条值得关注的变化，
              <br />
              也许正在发生。
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/60">
              输入产品和目标市场，让真实网页信息进入雷达，再由清晰评分帮助你判断。
            </p>
            <button
              onClick={() => handleSearch()}
              className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-950 transition-all hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-2xl active:translate-y-0"
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

function TypewriterSignal() {
  const [signalIndex, setSignalIndex] = useState(0)
  const [visibleCharacters, setVisibleCharacters] = useState(0)
  const signal = TYPEWRITER_SIGNALS[signalIndex]

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (reducedMotion) {
      setVisibleCharacters(signal.length)
      return
    }

    if (visibleCharacters < signal.length) {
      const timer = window.setTimeout(
        () => setVisibleCharacters((current) => current + 1),
        90,
      )
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setVisibleCharacters(0)
      setSignalIndex((current) => (current + 1) % TYPEWRITER_SIGNALS.length)
    }, 1650)

    return () => window.clearTimeout(timer)
  }, [signal, visibleCharacters])

  return (
    <span className="inline-flex items-center rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-sky-200">
      {signal.slice(0, visibleCharacters)}
      <span className="typewriter-cursor" aria-hidden="true" />
    </span>
  )
}
