import { readFileSync, writeFileSync } from 'node:fs'

function replaceExact(path, before, after) {
  const source = readFileSync(path, 'utf8')
  if (!source.includes(before)) {
    throw new Error(`Expected source block not found in ${path}: ${before.slice(0, 120)}`)
  }
  writeFileSync(path, source.replace(before, after))
}

function replaceRegex(path, pattern, after) {
  const source = readFileSync(path, 'utf8')
  if (!pattern.test(source)) {
    throw new Error(`Expected pattern not found in ${path}: ${pattern}`)
  }
  pattern.lastIndex = 0
  writeFileSync(path, source.replace(pattern, after))
}

const revenue = 'src/features/revenue/RevenueLiveOpsPanel.tsx'
replaceExact(
  revenue,
  '与市场雷达一致：左侧监督真实网页，右侧显示动作与证据。自动任务保持只读，人工接管画面可以点击、输入和滚动。',
  '真实浏览器与动作时间线保持同步。',
)
replaceExact(
  revenue,
  'Agent 正在只读研究；你可以直接点击画面监督或接管，动作会继续写入右侧时间线。',
  '运行中，可直接查看或接管 Live。',
)
replaceExact(
  revenue,
  '启动后仅访问收益队列中的公开来源；人工接管也不会自动提交、付款或交易。',
  '准备就绪，可运行当前最高优先机会。',
)
replaceExact(
  revenue,
  '令牌只保护直播地址、操作事件和启停控制',
  '输入运营令牌以查看实时执行',
)
replaceRegex(
  revenue,
  /\n\s*<div className="mt-5 space-y-2 text-\[11px\] leading-5 text-white\/45">[\s\S]*?<\/div>\n\s*<p className="mt-4 text-\[10px\] leading-5 text-white\/30">[\s\S]*?<\/p>/,
  '',
)

const css = 'src/index.css'
replaceRegex(
  css,
  /\.app-sidebar \{[\s\S]*?\n  \}/,
  `.app-sidebar {\n    position: relative;\n    border-right: 1px solid rgba(255, 255, 255, 0.07);\n    background: #0b1220;\n    color: white;\n  }`,
)
replaceRegex(
  css,
  /\.app-sidebar::after \{[\s\S]*?\n  \}/,
  `.app-sidebar::after {\n    content: none;\n  }`,
)
replaceRegex(
  css,
  /\.app-workspace-canvas \{[\s\S]*?\n  \}/,
  `.app-workspace-canvas {\n    background: #f7f7f8;\n  }`,
)

console.log('Applied GPT-style minimal workspace patches.')
