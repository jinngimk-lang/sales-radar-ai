import type {
  AIProvider,
  OutreachContent,
  OutreachContext,
} from './ai-provider.interface.js'

const UNKNOWN = 'Unknown'

export class RuleBasedOutreachProvider implements AIProvider {
  readonly name = 'rule-based-v2-human'

  async generateOutreach(
    context: OutreachContext,
  ): Promise<OutreachContent> {
    if (this.prefersChinese(context)) {
      return this.generateChineseOutreach(context)
    }

    if (context.outreachType === 'channel') {
      return this.generateChannelOutreach(context)
    }

    if (context.priority === 'C') {
      const advice =
        'Direct outreach is not recommended yet. Wait for a verified company, responsible role, project, or buying requirement before contacting this account.'
      return {
        email: {
          subjectOptions: [],
          opening: UNKNOWN,
          body: advice,
          cta: 'Reassess when new commercial evidence appears.',
        },
        linkedin: {
          connectionMessage: UNKNOWN,
          firstMessage: advice,
        },
        whatsapp: { message: advice },
        callScript: {
          opening: UNKNOWN,
          questions: [],
        },
        observationAdvice: advice,
      }
    }

    const company =
      context.company === UNKNOWN ? 'your organization' : context.company
    const observation = this.observation(context)
    const opening = observation
      ? this.sentence(observation)
      : `${company}'s work in ${context.industry} raises one practical question.`
    const roleFocus =
      context.role === 'procurement'
        ? 'cost, delivery reliability, and supply stability'
        : context.role === 'engineering'
          ? 'technical fit, efficiency, and system compatibility'
          : context.role === 'owner'
            ? 'return on investment and execution risk'
            : 'the current operational priority and the right owner'
    const angleValue = {
      reduce_cost: 'reduce avoidable cost',
      improve_efficiency: 'improve throughput and operating efficiency',
      technical_upgrade: 'de-risk the next technical upgrade',
      case_reference: 'compare the situation with one relevant industry example',
      reduce_risk: 'reduce delivery, compliance, and implementation risk',
    }[context.angle]
    const value = this.known(context.valueProposition)
      ? this.lowerSentence(context.valueProposition)
      : angleValue
    const body = `That could put ${roleFocus} under pressure. The only reason I am reaching out is to see whether ${value} is useful for the current priority.`
    const cta = 'Is this something you are actively evaluating, or should I leave it for later?'

    return {
      email: {
        subjectOptions: [
          `${company} — ${this.subjectFragment(context.painPoint, 'current priority')}`,
          `A quick question about ${company}`,
          `${company}: ${angleValue}`,
        ],
        opening,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${opening} I work on ${angleValue}. Happy to connect if that is relevant.`,
        firstMessage: `${body} Would a short example be useful?`,
      },
      whatsapp: {
        message: `${opening} ${body} Worth sending one short example?`,
      },
      callScript: {
        opening: `${opening} I wanted to check whether this is actually a priority before taking more of your time.`,
        questions: [
          'What outcome matters most if this moves forward?',
          `Which part of ${roleFocus} is hardest right now?`,
          'What would make this not worth pursuing?',
        ],
      },
    }
  }

  private prefersChinese(context: OutreachContext) {
    if (context.preferences?.language === 'zh') return true
    if (context.preferences?.language === 'en') return false
    return (
      context.communicationStyle?.language === 'zh' ||
      context.communicationStyle?.language === 'mixed'
    )
  }

  private generateChineseOutreach(context: OutreachContext): OutreachContent {
    if (context.outreachType === 'channel') {
      return this.generateChineseChannelOutreach(context)
    }
    if (context.priority === 'C') {
      const advice =
        '目前不建议直接联络。先等到可验证的企业主体、负责人、项目或采购需求出现，再决定是否触达。'
      return {
        email: {
          subjectOptions: [],
          opening: UNKNOWN,
          body: advice,
          cta: '出现新的商业证据后再重新评估。',
        },
        linkedin: { connectionMessage: UNKNOWN, firstMessage: advice },
        whatsapp: { message: advice },
        callScript: { opening: UNKNOWN, questions: [] },
        observationAdvice: advice,
      }
    }

    const company = context.company === UNKNOWN ? '贵司' : context.company
    const observation = this.observation(context)
    const topics = context.communicationStyle?.observedTopics
      .filter(Boolean)
      .slice(0, 2)
      .join('、')
    const opening = observation
      ? this.chineseSentence(observation)
      : topics
        ? `想确认一下${company}在${topics}这块目前是不是有实际项目。`
        : `想确认一个和${company}当前${context.industry}业务有关的问题。`
    const roleFocus = {
      procurement: '成本、交付可靠性和供应稳定性',
      engineering: '技术适配、效率和系统兼容性',
      owner: '投入产出和执行风险',
      content_user: '当前关注方向和真实业务负责人',
      contact: '当前业务重点和合适的内部负责人',
    }[context.role]
    const angleValue = {
      reduce_cost: '降本是否还有实际空间',
      improve_efficiency: '效率提升是否值得现在推进',
      technical_upgrade: '下一次技术升级怎样少走弯路',
      case_reference: '一个同类案例是否有参考价值',
      reduce_risk: '交付、合规和实施风险能否再降一些',
    }[context.angle]
    const objective = context.preferences?.objective?.trim()
    const body = objective
      ? `这件事通常会直接影响${roleFocus}。我这次只想先${objective.replace(/[。.!！]+$/, '')}，看看是否值得继续。`
      : `这件事通常会直接影响${roleFocus}。我想先确认${angleValue}，再判断有没有继续沟通的必要。`
    const cta = '这件事现在值得聊，还是我晚一点再联系？'

    return {
      email: {
        subjectOptions: [
          `${company} / ${this.subjectFragment(context.painPoint, '当前重点')}`,
          `想确认 ${company} 的一个实际问题`,
          `${company}：先判断是否值得继续`,
        ],
        opening,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${opening}如果正好相关，可以先连接。`,
        firstMessage: `${body} 如果你愿意，我可以先发一个很短的参考案例。`,
      },
      whatsapp: {
        message: `${opening}${body} 需要的话我先发一页信息，你看是否有用？`,
      },
      callScript: {
        opening: `${opening}我先确认这是不是你们现在真正关心的事，避免占用太多时间。`,
        questions: [
          '这件事如果推进，最重要的结果是什么？',
          `${roleFocus}里现在最难的是哪一项？`,
          '什么情况会让你觉得这件事暂时不值得推进？',
        ],
      },
    }
  }

  private generateChineseChannelOutreach(
    context: OutreachContext,
  ): OutreachContent {
    const channel = context.channelProfile
    if (!channel || channel.channelType === 'unknown') {
      const advice =
        '在缺少可验证的分销、经销、集成、贸易或合作证据前，不建议发起渠道合作联络。'
      return {
        email: {
          subjectOptions: [],
          opening: UNKNOWN,
          body: advice,
          cta: '出现可靠渠道证据后再评估。',
        },
        linkedin: { connectionMessage: UNKNOWN, firstMessage: advice },
        whatsapp: { message: advice },
        callScript: { opening: UNKNOWN, questions: [] },
        observationAdvice: advice,
      }
    }
    const company = context.company === UNKNOWN ? '贵司' : context.company
    const opening = `${company}公开资料里有${channel.channelType.replaceAll('_', ' ')}相关业务。`
    const body = `我联系的原因很简单：想看看我们的产品是否正好补上贵司现有产品组合或客户覆盖中的一个空位。${channel.cooperationStrategy}`
    const cta = '要不要先拿一个真实客户场景对一下，再决定有没有必要谈商务合作？'
    return {
      email: {
        subjectOptions: [
          `${company} / 一个渠道适配问题`,
          `先对一个客户场景`,
          `${context.industry}渠道合作是否有实际互补`,
        ],
        opening,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${opening}想先确认有没有互补空间。`,
        firstMessage: `${body}${cta}`,
      },
      whatsapp: {
        message: `${opening}${body}${cta}`,
      },
      callScript: {
        opening: `${opening}我先确认渠道方向是否相关，不预设合作一定成立。`,
        questions: [
          '目前主要覆盖哪些客户类型和产品类别？',
          '技术、服务和区域责任最需要先说清楚哪一项？',
          '有没有一个小场景适合先验证市场适配？',
        ],
      },
    }
  }

  private generateChannelOutreach(context: OutreachContext): OutreachContent {
    const channel = context.channelProfile
    if (!channel || channel.channelType === 'unknown') {
      const advice =
        'Channel outreach is not recommended until verified distribution, reseller, integration, trading, or partnership evidence is available.'
      return {
        email: {
          subjectOptions: [],
          opening: UNKNOWN,
          body: advice,
          cta: 'Reassess when verified channel evidence appears.',
        },
        linkedin: { connectionMessage: UNKNOWN, firstMessage: advice },
        whatsapp: { message: advice },
        callScript: { opening: UNKNOWN, questions: [] },
        observationAdvice: advice,
      }
    }

    const company =
      context.company === UNKNOWN ? 'your organization' : context.company
    const channelLabel = channel.channelType.replaceAll('_', ' ')
    const opening = `${company} appears to work as a ${channelLabel} in ${context.industry}.`
    const body = `The reason I am reaching out is simple: I want to see whether our offering fills a real gap in your current portfolio or customer coverage. ${channel.cooperationStrategy}`
    const cta =
      'Would it be worth comparing one customer use case before discussing anything commercial?'

    return {
      email: {
        subjectOptions: [
          `${company} / one channel-fit question`,
          `One customer use case to compare`,
          `${context.industry}: is there a real portfolio gap?`,
        ],
        opening,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${opening} I would like to check whether there is a genuine complementary fit.`,
        firstMessage: `${body} ${cta}`,
      },
      whatsapp: {
        message: `${opening} ${body} ${cta}`,
      },
      callScript: {
        opening: `${opening} I want to check whether a channel conversation is relevant before proposing any commercial structure.`,
        questions: [
          'Which customer segments and product categories matter most today?',
          'Which technical, service, or territory responsibility needs clarity first?',
          'Is there one small customer use case we can use to test fit?',
        ],
      },
    }
  }

  private observation(context: OutreachContext) {
    const candidates = [
      context.buyingSignals[0]?.evidence,
      ...context.evidence,
      context.communicationStyle?.evidenceExcerpt,
    ]
    return candidates
      .map((value) => value?.trim())
      .find(
        (value): value is string =>
          Boolean(value) && !/^company field\s*:/i.test(value!),
      )
  }

  private sentence(value: string) {
    const clean = value.replace(/[.!]+$/, '').trim()
    return `${clean}.`
  }

  private chineseSentence(value: string) {
    const clean = value.replace(/[。.!！]+$/, '').trim()
    return `${clean}。`
  }

  private known(value: string) {
    return Boolean(value?.trim()) && value.trim().toLowerCase() !== 'unknown'
  }

  private lowerSentence(value: string) {
    const clean = value.replace(/[.!]+$/, '').trim()
    if (!clean) return clean
    return `${clean[0].toLowerCase()}${clean.slice(1)}`
  }

  private subjectFragment(value: string, fallback: string) {
    return this.known(value) ? value.replace(/[。.!！?？]+$/, '').trim() : fallback
  }
}

export const ruleBasedOutreachProvider = new RuleBasedOutreachProvider()
