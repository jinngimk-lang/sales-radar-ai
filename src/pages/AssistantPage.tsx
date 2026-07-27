import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Send,
  Bot,
  Sparkles,
  Plus,
  MessageSquare,
  Search,
  Loader2,
  Copy,
  Check,
  Target,
  Mail,
  MessageCircle,
  Linkedin,
  Calendar,
  ShieldCheck,
} from 'lucide-react'
import type { ChatMessage, ChatSession } from '@/types'
import { getChatSessions, sendChatMessage } from '@/services/api'
import { Avatar } from '@/components/ui/Avatar'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { uid } from '@/lib/utils'

const QUICK_PROMPTS = [
  { icon: Target, text: '帮我分析这个客户的购买意向' },
  { icon: Mail, text: '生成一封英文开发信' },
  { icon: MessageCircle, text: '写一条 WhatsApp 跟进话术' },
  { icon: Linkedin, text: '写一条 LinkedIn 私信' },
  { icon: Calendar, text: '帮我制定一个 7 天跟进计划' },
]

/** AI 销售助手页面 */
export function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getChatSessions()
      .then(setSessions)
      .catch(() => setSessionsError(true))
      .finally(() => setSessionsLoading(false))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading || !activeSession) return

    const userMsg: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await sendChatMessage(content, activeSession)
      setMessages((prev) => [...prev, reply])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* 左侧：历史客户 */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <div className="p-3">
          <Link to="/app/discover" className="btn-primary w-full justify-start">
            <Plus className="h-4 w-4" />
            选择销售机会
          </Link>
        </div>

        <div className="px-3">
          <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2">
            <Search className="h-4 w-4 text-ink-400" />
            <input
              placeholder="搜索已验证机会"
              className="w-full bg-transparent text-sm placeholder:text-ink-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-2 flex-1 space-y-1 overflow-y-auto scrollbar-thin px-2 pb-3">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            已验证销售机会
          </p>
          {sessionsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                <div className="h-9 w-9 animate-pulse rounded-full bg-ink-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
                  <div className="h-2.5 w-40 animate-pulse rounded bg-ink-50" />
                </div>
              </div>
            ))
          ) : sessionsError ? (
            <p className="px-3 py-4 text-xs leading-relaxed text-rose-600">
              暂时无法加载销售机会，请稍后重试。
            </p>
          ) : sessions.length === 0 ? (
            <p className="px-3 py-4 text-xs leading-relaxed text-ink-500">
              暂无通过公司、域名、证据与产品相关性验证的销售机会。
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSession(s.id)
                  setMessages([])
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                  activeSession === s.id ? 'bg-brand-50' : 'hover:bg-ink-50'
                }`}
              >
                <Avatar initials={s.initials} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-ink-900">{s.customerName}</p>
                    <PlatformIcon platform={s.platform} className="h-3 w-3" />
                  </div>
                  <p className="truncate text-xs text-ink-500">{s.lastMessage}</p>
                </div>
                <span className="shrink-0 text-[10px] text-ink-400">{s.updatedAt}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* 右侧：聊天窗口 */}
      <div className="flex flex-1 flex-col bg-ink-50/30">
        {/* 头部 */}
        <header className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-ink-900">AI Sales Copilot</h1>
              <p className="flex items-center gap-1 text-xs text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                分析销售机会 · 总结证据 · 制定触达与跟进策略
              </p>
            </div>
          </div>
          <Link to="/app/discover" className="btn-ghost text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            去发现客户
          </Link>
        </header>

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
            {!activeSession && messages.length === 0 && (
              <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-ink-200 bg-white px-8 py-10 text-center shadow-sm">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-ink-900">
                  选择一个已验证的销售机会
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  Copilot 只分析具备已验证公司、域名、来源证据和产品相关性的客户，不会用历史或测试数据冒充新机会。
                </p>
                {sessions.length === 0 && !sessionsLoading && !sessionsError && (
                  <Link to="/app/discover" className="btn-primary mt-5 inline-flex">
                    前往客户发现
                  </Link>
                )}
              </div>
            )}
            {activeSession && messages.length === 0 && (
              <div className="mx-auto mt-12 max-w-lg text-center">
                <Sparkles className="mx-auto h-6 w-6 text-brand-600" />
                <h2 className="mt-3 text-base font-semibold text-ink-900">
                  销售机会已选择
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  可以要求 Copilot 解释匹配原因、总结证据、生成触达内容或建议跟进策略。
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI 正在思考...</span>
              </div>
            )}
          </div>
        </div>

        {/* 快捷提示 */}
        {activeSession && messages.length <= 1 && (
          <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.text}
                    onClick={() => handleSend(p.text)}
                    className="chip flex items-center gap-1.5 border border-ink-200 bg-white text-ink-600 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {p.text}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 输入框 */}
        <div className="border-t border-ink-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-ink-200 bg-white p-2 shadow-sm transition-all focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10">
              <textarea
                value={input}
                disabled={!activeSession}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={
                  activeSession
                    ? '分析这个销售机会，或生成触达与跟进建议...'
                    : '请先选择一个已验证的销售机会'
                }
                rows={1}
                className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!activeSession || !input.trim() || loading}
                className="btn-primary shrink-0 p-2.5"
                aria-label="发送"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-ink-400">
              Copilot 建议基于现有证据生成，重要信息仍需核实。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? 'bg-ink-200 text-ink-700'
            : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white'
        }`}
      >
        {isUser ? <span className="text-xs font-bold">我</span> : <Sparkles className="h-4 w-4" />}
      </div>
      <div className={`group max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white'
              : 'border border-ink-200 bg-white text-ink-800 shadow-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
