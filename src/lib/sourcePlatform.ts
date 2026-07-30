import type { Platform } from '@/types'

export interface SourcePlatformInfo {
  label: string
  host: string
  category: 'website' | 'news' | 'social' | 'video' | 'jobs' | 'community' | 'code'
}

interface SourcePlatformRule {
  domains: string[]
  label: string
  category: SourcePlatformInfo['category']
}

const SOURCE_PLATFORM_RULES: SourcePlatformRule[] = [
  { domains: ['channels.weixin.qq.com'], label: '微信视频号', category: 'video' },
  { domains: ['mp.weixin.qq.com'], label: '微信公众号', category: 'social' },
  { domains: ['xiaohongshu.com', 'xhslink.com'], label: '小红书', category: 'social' },
  { domains: ['x.com', 'twitter.com'], label: 'X', category: 'social' },
  { domains: ['instagram.com'], label: 'Instagram', category: 'social' },
  { domains: ['douyin.com', 'iesdouyin.com'], label: '抖音', category: 'video' },
  { domains: ['58.com'], label: '58同城', category: 'jobs' },
  { domains: ['zhipin.com', 'bosszhipin.com'], label: 'BOSS直聘', category: 'jobs' },
  { domains: ['linkedin.com'], label: 'LinkedIn', category: 'social' },
  { domains: ['kuaishou.com', 'kwai.com'], label: '快手', category: 'video' },
  { domains: ['weixin.qq.com'], label: '微信', category: 'social' },
  { domains: ['youtube.com', 'youtu.be'], label: 'YouTube', category: 'video' },
  { domains: ['bilibili.com', 'b23.tv'], label: '哔哩哔哩', category: 'video' },
  { domains: ['tiktok.com'], label: 'TikTok', category: 'video' },
  { domains: ['reddit.com'], label: 'Reddit', category: 'community' },
  { domains: ['facebook.com'], label: 'Facebook', category: 'social' },
  { domains: ['weibo.com', 'weibo.cn'], label: '微博', category: 'social' },
  { domains: ['zhihu.com'], label: '知乎', category: 'community' },
  { domains: ['github.com'], label: 'GitHub', category: 'code' },
  { domains: ['news.qq.com'], label: '腾讯新闻', category: 'news' },
  { domains: ['toutiao.com'], label: '今日头条', category: 'news' },
  { domains: ['36kr.com'], label: '36氪', category: 'news' },
  { domains: ['baidu.com'], label: '百度', category: 'website' },
  { domains: ['google.com'], label: 'Google', category: 'website' },
]

const FALLBACK_PLATFORM_LABELS: Record<Platform, string> = {
  Website: '网站来源',
  Reddit: 'Reddit',
  X: 'X',
  Instagram: 'Instagram',
  Facebook: 'Facebook',
  TikTok: 'TikTok',
  LinkedIn: 'LinkedIn',
  Xiaohongshu: '小红书',
  YouTube: 'YouTube',
}

export function resolveSourcePlatform(
  sourceUrl: string,
  fallbackPlatform: Platform = 'Website',
): SourcePlatformInfo {
  const host = sourceHostname(sourceUrl)
  const matchedRule = SOURCE_PLATFORM_RULES.find((rule) =>
    rule.domains.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    ),
  )

  return {
    label: matchedRule?.label ?? FALLBACK_PLATFORM_LABELS[fallbackPlatform],
    host,
    category: matchedRule?.category ?? 'website',
  }
}

function sourceHostname(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}
