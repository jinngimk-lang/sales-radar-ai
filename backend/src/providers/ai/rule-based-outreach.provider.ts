import type {
  AIProvider,
  OutreachContent,
  OutreachContext,
} from './ai-provider.interface.js'

const UNKNOWN = 'Unknown'

export class RuleBasedOutreachProvider implements AIProvider {
  readonly name = 'rule-based-v1'

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
        'Direct sales outreach is not recommended. Monitor this lead until a verified company, responsible role, project, or buying requirement appears.'
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
    const signal = context.buyingSignals[0]
    const evidence = signal?.evidence ?? context.evidence[0]
    const hook = evidence
      ? `I noticed ${evidence.replace(/[.!]+$/, '')}.`
      : `I noticed ${company}'s work in ${context.industry}.`
    const roleFocus =
      context.role === 'procurement'
        ? 'cost, delivery reliability, and supply stability'
        : context.role === 'engineering'
          ? 'technical fit, efficiency, and system compatibility'
          : context.role === 'owner'
            ? 'growth, return on investment, and strategic impact'
            : 'the current operational priority and the right owner'
    const angleValue = {
      reduce_cost: 'identify practical cost-reduction opportunities',
      improve_efficiency: 'improve throughput and operating efficiency',
      technical_upgrade: 'reduce risk in the next technical upgrade',
      case_reference: 'compare the situation with a relevant industry example',
      reduce_risk: 'reduce delivery, compliance, and implementation risk',
    }[context.angle]
    const cta =
      'Would it be useful to compare requirements in a brief 15-minute conversation?'
    const body = `${hook} Based on the available evidence, a useful first step may be to ${angleValue}. I would focus the discussion on ${roleFocus}, and first confirm whether this is an active priority.`

    return {
      email: {
        subjectOptions: [
          `${company} — a practical ${context.industry} discussion`,
          `Is ${context.painPoint === UNKNOWN ? 'this operational priority' : context.painPoint.toLowerCase()} relevant at ${company}?`,
          `${company}: ${angleValue}`,
        ],
        opening: hook,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${hook} I work with industrial B2B teams on ${angleValue}. Glad to connect if this is relevant.`,
        firstMessage: `${hook} I can share one concise, relevant example and first validate whether it fits your current priorities. ${cta}`,
      },
      whatsapp: {
        message: `${hook} I can share one concise example related to ${angleValue}. No assumption that a project is active — would it be useful to check fit?`,
      },
      callScript: {
        opening: `${hook} I am calling to understand whether this is a current business priority before suggesting any solution.`,
        questions: [
          'What outcome matters most for this initiative?',
          `Who owns ${roleFocus} internally?`,
          'What technical or commercial constraints should be validated first?',
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
        '目前不建议直接销售联络。请先等待可验证的企业主体、负责人、项目或采购需求出现。'
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
    const signal = context.buyingSignals[0]
    const evidence = signal?.evidence ?? context.evidence[0]
    const topics = context.communicationStyle?.observedTopics
      .filter(Boolean)
      .slice(0, 2)
      .join('、')
    const hook = evidence
      ? `看到公开资料中提到：${evidence.replace(/[。.!！]+$/, '')}。`
      : topics
        ? `想就贵司公开关注的${topics}方向做一次简短交流。`
        : `想就${company}在${context.industry}领域的工作做一次简短交流。`
    const roleFocus = {
      procurement: '成本、交付可靠性与供应稳定性',
      engineering: '技术适配、效率与系统兼容性',
      owner: '增长、投资回报与战略影响',
      content_user: '当前关注方向与真实业务负责人',
      contact: '当前业务重点与合适的内部负责人',
    }[context.role]
    const angleValue = {
      reduce_cost: '核验是否存在可落地的降本机会',
      improve_efficiency: '提升产能与运营效率',
      technical_upgrade: '降低下一次技术升级的实施风险',
      case_reference: '对照一个相关行业案例判断适配度',
      reduce_risk: '降低交付、合规与实施风险',
    }[context.angle]
    const objective = context.preferences?.objective?.trim()
    const purpose = objective
      ? `本次希望先${objective.replace(/[。.!！]+$/, '')}。`
      : ''
    const concise =
      context.preferences?.tone === 'concise' ||
      (context.preferences?.tone === 'mirror' &&
        context.communicationStyle?.tone === 'concise')
    const body = concise
      ? `${hook}${purpose}如果方向相关，我可以先发一页简要信息供判断。`
      : `${hook}${purpose}基于现有证据，一个低压力的起点是先${angleValue}，重点确认${roleFocus}，并先判断这是否属于当前优先事项。`
    const cta = '如果方向相关，是否方便用 15 分钟确认一下需求和适配度？'

    return {
      email: {
        subjectOptions: [
          `${company} · 关于${angleValue}的简短交流`,
          `${company}目前是否关注${context.painPoint === UNKNOWN ? '这项业务重点' : context.painPoint}？`,
          `先确认一个${context.industry}方向的适配度`,
        ],
        opening: hook,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${hook}如果这个方向相关，很高兴先连接交流。`,
        firstMessage: `${body}${cta}`,
      },
      whatsapp: {
        message: `${hook}${purpose}不预设项目已经启动；如果相关，我可以先发一个简短案例供参考。`,
      },
      callScript: {
        opening: `${hook}来电是想先确认这是否属于当前业务重点，再判断是否值得进一步介绍方案。`,
        questions: [
          '这项工作目前最重要的结果是什么？',
          `内部由谁负责${roleFocus}？`,
          '最先需要核验的技术或商务约束是什么？',
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
    const hook = `公开资料显示${company}具备${channel.channelType.replaceAll('_', ' ')}相关业务。`
    const body = `${hook}希望先确认我们的产品是否能补充贵司现有产品组合和客户覆盖，而不是预设合作成立。${channel.cooperationStrategy}`
    const cta = '是否方便简短交流市场适配、双方责任以及小范围试点的可能性？'
    return {
      email: {
        subjectOptions: [
          `${company} · 渠道合作适配沟通`,
          `与${company}探讨互补产品机会`,
          `${context.industry}领域的小范围合作验证`,
        ],
        opening: hook,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${hook}希望先连接并确认是否存在互补空间。`,
        firstMessage: `${body}${cta}`,
      },
      whatsapp: {
        message: `${hook}希望先确认合作适配度，不预设排他或采购量。${cta}`,
      },
      callScript: {
        opening: `${hook}来电是想先确认渠道合作是否相关，再讨论具体商务结构。`,
        questions: [
          '目前覆盖哪些客户类型和产品类别？',
          '技术、服务与区域责任需要如何界定？',
          '是否适合通过小范围试点验证市场适配？',
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
    const hook = `I noticed evidence that ${company} operates as a ${channelLabel} in ${context.industry}.`
    const body = `${hook} Rather than assuming a fit, I would like to explore whether our offering could complement your current portfolio and customer coverage. ${channel.cooperationStrategy}`
    const cta =
      'Would a brief conversation to compare market fit, responsibilities, and a possible pilot be useful?'

    return {
      email: {
        subjectOptions: [
          `${company}: potential ${channelLabel} cooperation`,
          `Exploring a complementary channel fit with ${company}`,
          `A scoped partnership discussion for ${context.industry}`,
        ],
        opening: hook,
        body,
        cta,
      },
      linkedin: {
        connectionMessage: `${hook} I would be glad to connect and first validate whether there is a complementary fit.`,
        firstMessage: `${body} ${cta}`,
      },
      whatsapp: {
        message: `${hook} I would like to validate a possible cooperation fit without assuming exclusivity or volume. ${cta}`,
      },
      callScript: {
        opening: `${hook} I am calling to validate whether a channel discussion is relevant before proposing any commercial structure.`,
        questions: [
          'Which customer segments and product categories are currently in scope?',
          'What technical, service, or territory responsibilities would need to be clear?',
          'Would a limited pilot be a useful way to validate market fit?',
        ],
      },
    }
  }
}

export const ruleBasedOutreachProvider = new RuleBasedOutreachProvider()
