import {
  ArrowUpRight,
  AtSign,
  Building2,
  ExternalLink,
  Globe2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ChatSession, ContactProfile } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { SourceEvidenceList } from './SourceEvidenceList'

interface EntityIntelligenceCardProps {
  session: ChatSession
}

export function EntityIntelligenceCard({ session }: EntityIntelligenceCardProps) {
  const scores = session.assistantScores
  const contacts = session.contacts

  return (
    <article className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-card">
      <div className="border-b border-ink-100 bg-gradient-to-br from-white via-white to-brand-50/45 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <Avatar
            initials={session.initials}
            src={session.avatarUrl ?? undefined}
            alt={session.customerName}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold tracking-[-0.025em] text-ink-900">
                {session.customerName}
              </h3>
              <PlatformIcon platform={session.platform} className="h-4 w-4" />
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3 w-3" /> 公开来源对象
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
              {session.company ? <Building2 className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
              <span>{known(session.jobTitle)}</span>
              {session.company ? <span>· {session.company}</span> : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={session.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                原始来源 <ExternalLink className="h-3 w-3" />
              </a>
              {session.profileUrl ? (
                <a href={session.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                  公开主页 <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {scores ? (
          <div className="mt-5 grid grid-cols-5 gap-2">
            <Score label="综合" value={scores.overall} />
            <Score label="意向" value={scores.intent} />
            <Score label="身份" value={scores.identity} />
            <Score label="证据" value={scores.evidence} />
            <Score label="联系人" value={scores.contact} />
          </div>
        ) : null}
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">公开内容与商业信号</p>
          <p className="mt-2 line-clamp-5 text-sm leading-7 text-ink-700">
            {known(session.postContent)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {session.communicationProfile.observedTopics.map((topic) => (
              <span key={topic} className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-600">
                {topic}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ink-100 bg-ink-50/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">公开联系方式</p>
              <p className="mt-1 text-[10px] leading-4 text-ink-500">
                仅展示网页或已连接数据源中实际观察到的字段。
              </p>
            </div>
            <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-500">
              {contacts.length} 个联系人
            </span>
          </div>

          {contacts.length ? (
            <div className="mt-4 space-y-3">
              {contacts.map((contact) => (
                <ContactBlock key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-ink-200 bg-white px-3 py-4 text-xs leading-5 text-ink-500">
              未在公开来源中观察到可验证的邮箱、电话或社交主页。
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-900">来源证据</p>
            <span className="text-[10px] text-ink-400">字段级记录 · 可追溯</span>
          </div>
          <div className="mt-3 space-y-3">
            {contacts.length ? (
              contacts.map((contact) => (
                <div key={`${contact.id}-evidence`}>
                  <p className="mb-2 text-[10px] font-semibold text-ink-500">
                    {knownName(contact.name)} · {known(contact.jobTitle)}
                  </p>
                  <SourceEvidenceList evidence={contact.evidence} />
                </div>
              ))
            ) : (
              <SourceEvidenceList evidence={[]} />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-brand-100 bg-brand-50/45 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">建议动作</p>
          <p className="mt-2 text-sm leading-6 text-ink-700">{known(session.lastMessage)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/app/customer/${session.id}`} className="workspace-primary-action px-3 py-2 text-xs">
              查看完整情报 <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link to={`/app/discover?leadId=${encodeURIComponent(session.id)}`} className="workspace-secondary-action px-3 py-2 text-xs">
              进入高级结果
            </Link>
          </div>
        </section>
      </div>
    </article>
  )
}

function ContactBlock({ contact }: { contact: ContactProfile }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{knownName(contact.name)}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {known(contact.jobTitle)}{knownValue(contact.company) ? ` · ${contact.company}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-ink-50 px-2 py-1 text-[10px] font-semibold text-ink-500">
          可信度 {Math.round(contact.confidence)}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ContactValue icon={Mail} label="邮箱" value={contact.email} href={knownValue(contact.email) ? `mailto:${contact.email}` : undefined} />
        <ContactValue icon={Phone} label="电话" value={contact.phone} href={knownValue(contact.phone) ? `tel:${contact.phone}` : undefined} />
        <ContactValue icon={AtSign} label="社交主页" value={contact.profileUrl} href={knownValue(contact.profileUrl) ? contact.profileUrl : undefined} />
        <ContactValue icon={Globe2} label="来源" value={contact.source} />
      </div>
    </div>
  )
}

function ContactValue({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value: string
  href?: string
}) {
  const content = known(value)
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg bg-ink-50/80 px-2.5 py-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</p>
        {href && knownValue(value) ? (
          <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="mt-0.5 block truncate text-[11px] font-medium text-brand-700">
            {content}
          </a>
        ) : (
          <p className="mt-0.5 truncate text-[11px] text-ink-600">{content}</p>
        )}
      </div>
    </div>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white bg-white/85 px-2 py-2 text-center shadow-sm">
      <p className="text-base font-semibold text-ink-900">{Math.round(value)}</p>
      <p className="mt-0.5 text-[9px] font-semibold text-ink-400">{label}</p>
    </div>
  )
}

function known(value: string | null | undefined) {
  return knownValue(value) ? value!.trim() : '未在公开来源中观察到'
}

function knownName(value: string | null | undefined) {
  return knownValue(value) && value!.trim().toLowerCase() !== 'unknown'
    ? value!.trim()
    : '未确认联系人姓名'
}

function knownValue(value: string | null | undefined) {
  if (!value?.trim()) return false
  return !['unknown', 'n/a', 'not available', 'null'].includes(value.trim().toLowerCase())
}
