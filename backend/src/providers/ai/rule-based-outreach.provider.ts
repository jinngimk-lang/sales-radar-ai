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
