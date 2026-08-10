import type {
  SourceProvenance,
  SourceProvenanceInput,
} from '../../contracts/source-provenance.contract.js'

const SOCIAL_SOURCES: Array<[string, string]> = [
  ['linkedin.com', 'LINKEDIN'],
  ['reddit.com', 'REDDIT'],
  ['twitter.com', 'X'],
  ['x.com', 'X'],
  ['instagram.com', 'INSTAGRAM'],
  ['xiaohongshu.com', 'XIAOHONGSHU'],
  ['douyin.com', 'DOUYIN'],
  ['kuaishou.com', 'KUAISHOU'],
  ['weixin.qq.com', 'WECHAT_OFFICIAL_ACCOUNT'],
  ['channels.weixin.qq.com', 'WECHAT_CHANNELS'],
  ['facebook.com', 'FACEBOOK'],
]
const VIDEO_SOURCES: Array<[string, string]> = [
  ['youtube.com', 'YOUTUBE'],
  ['youtu.be', 'YOUTUBE'],
  ['bilibili.com', 'BILIBILI'],
  ['vimeo.com', 'VIMEO'],
]
const JOB_SOURCES: Array<[string, string]> = [
  ['zhipin.com', 'BOSS_ZHIPIN'],
  ['58.com', '58'],
  ['indeed.com', 'INDEED'],
  ['glassdoor.com', 'GLASSDOOR'],
]

export class SourceProvenanceProvider {
  describe(input: SourceProvenanceInput): SourceProvenance {
    const hostname = safeHostname(input.sourceUrl)
    const explicitPlatform = normalizePlatform(input.platform)
    const social = findSource(hostname, SOCIAL_SOURCES) ?? socialPlatform(explicitPlatform)
    const video = findSource(hostname, VIDEO_SOURCES) ?? videoPlatform(explicitPlatform)
    const job = findSource(hostname, JOB_SOURCES)
    const explicitVerified =
      input.metadata?.publisherVerification === 'VERIFIED' ||
      input.metadata?.officialAccountVerified === true

    if (social) return provenance('SOCIAL', social, explicitVerified, true)
    if (video) return provenance('VIDEO', video, explicitVerified, true)
    if (job) return provenance('JOB', job, explicitVerified, true)

    const explicitSourceType = String(input.metadata?.sourceType ?? '').toLowerCase()
    if (['company_website', 'company_news', 'official', 'government'].includes(explicitSourceType)) {
      return {
        sourceCategory: 'WEB',
        sourcePlatform: explicitPlatform || 'WEBSITE',
        sourceTier: 'TIER_1',
        publisherVerification: explicitVerified ? 'VERIFIED' : 'UNVERIFIED',
        corroborationRequired: false,
        reasonCodes: [
          'EXPLICIT_FIRST_PARTY_SOURCE_TYPE',
          ...(explicitVerified ? ['EXPLICIT_PUBLISHER_VERIFICATION'] : []),
        ],
      }
    }
    if (['news', 'industry_media', 'industry_association'].includes(explicitSourceType)) {
      return {
        sourceCategory: 'NEWS',
        sourcePlatform: explicitPlatform || 'NEWS',
        sourceTier: 'TIER_2',
        publisherVerification: explicitVerified ? 'VERIFIED' : 'UNVERIFIED',
        corroborationRequired: false,
        reasonCodes: ['EXPLICIT_EDITORIAL_SOURCE_TYPE'],
      }
    }

    return {
      sourceCategory: hostname ? 'WEB' : 'UNKNOWN',
      sourcePlatform: explicitPlatform || 'WEBSITE',
      sourceTier: 'UNKNOWN',
      publisherVerification: 'UNVERIFIED',
      corroborationRequired: false,
      reasonCodes: ['SOURCE_CLASSIFICATION_NEEDS_REVIEW'],
    }
  }
}

function provenance(
  category: 'SOCIAL' | 'VIDEO' | 'JOB',
  platform: string,
  explicitVerified: boolean,
  corroborationRequired: boolean,
): SourceProvenance {
  return {
    sourceCategory: category,
    sourcePlatform: platform,
    sourceTier: 'TIER_3',
    publisherVerification: explicitVerified ? 'VERIFIED' : 'UNVERIFIED',
    corroborationRequired,
    reasonCodes: [
      `${category}_SOURCE_REQUIRES_CORROBORATION`,
      ...(explicitVerified ? ['EXPLICIT_PUBLISHER_VERIFICATION'] : []),
    ],
  }
}

function findSource(hostname: string, sources: Array<[string, string]>) {
  return sources.find(([domain]) => hostname === domain || hostname.endsWith(`.${domain}`))?.[1] ?? null
}

function normalizePlatform(value: string | null | undefined) {
  return value?.trim().replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toUpperCase() ?? ''
}

function socialPlatform(value: string) {
  return ['LINKEDIN', 'REDDIT', 'X', 'INSTAGRAM', 'XIAOHONGSHU', 'DOUYIN', 'KUAISHOU', 'FACEBOOK'].includes(value)
    ? value
    : null
}

function videoPlatform(value: string) {
  return ['YOUTUBE', 'BILIBILI', 'VIMEO'].includes(value) ? value : null
}

function safeHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

export const sourceProvenanceProvider = new SourceProvenanceProvider()
