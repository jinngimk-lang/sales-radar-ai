from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Expected snippet not found in {path}: {old[:120]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/pages/AICommandCenterPage.tsx',
    "import { IntelligenceResultGrid } from '@/features/command-center/IntelligenceResultGrid'\n",
    "import { IntelligenceResultGrid } from '@/features/command-center/IntelligenceResultGrid'\nimport { customersToCommandSessions } from '@/features/command-center/customersToCommandSessions'\n",
)

start = """      const taskResults = execution.customers
      const selected = taskResults.map((lead) => ({
        id: lead.id,
        customerName: lead.company ?? lead.displayName,
        displayName: lead.displayName,
        company: lead.company ?? null,
        avatarUrl: lead.avatarUrl ?? null,
        initials: lead.initials,
        platform: lead.platform,
        jobTitle: lead.jobTitle ?? null,
        sourceUrl: lead.sourceUrl,
        profileUrl: lead.profileUrl,
        postContent: lead.postContent,
        contacts: lead.contacts ?? [],
        audienceType: lead.audienceType ??
          (lead.customerType === 'Individual'
            ? 'person'
            : lead.customerType === 'Agent'
              ? 'intermediary'
              : 'company'),
        contactReadiness: (lead.contacts ?? []).length > 0 ? 'ready' : 'research',
        assistantScores: {
          overall: lead.signalScores?.overall ?? lead.analysis.intentScore,
          intent: lead.signalScores?.intent ?? lead.analysis.intentScore,
          identity: lead.signalScores?.identity ?? 55,
          evidence: lead.signalScores?.evidence ?? 55,
          contact: Math.min(100, (lead.contacts ?? []).length * 25),
        },
        communicationProfile: {
          language: 'unknown',
          tone: 'conversational',
          preferredPlatform: lead.platform,
          observedTopics: lead.analysis.tags,
          evidenceExcerpt: lead.postContent.slice(0, 360),
        },
        lastMessage: lead.postContent,
        lastMessageAt: lead.postedAt,
        unreadCount: 0,
        intentScore: lead.analysis.intentScore,
        tags: lead.analysis.tags,
      }) as unknown as ChatSession)
"""
replace_once(
    'src/pages/AICommandCenterPage.tsx',
    start,
    "      const selected = customersToCommandSessions(execution.customers)\n",
)

replace_once(
    'src/features/market-intelligence/MarketBrowserWorkspace.tsx',
    "                  aria-pressed={activeSourceType === sourceType}\n                  className={cn(\n",
    "                  aria-pressed={activeSourceType === sourceType}\n                  title={count === 0 ? '本次扫描没有该类来源' : `筛选 ${meta.label}`}\n                  className={cn(\n",
)
replace_once(
    'src/features/market-intelligence/MarketBrowserWorkspace.tsx',
    "historical snapshot · 静态网页快照，仅用于实时会话不可用时核对来源",
    "网页快照（不可交互）· 仅用于交互式云浏览器不可用时核对来源",
)

print('Finalized PR 22 frontend contracts.')
