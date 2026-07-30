import {
  Building2,
  Factory,
  Landmark,
  RefreshCw,
  Scale,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { MarketSignalType } from '@/types'

export const SIGNAL_META: Record<
  MarketSignalType,
  {
    label: string
    icon: LucideIcon
    whyItMatters: string
    recommendedNextStep: string
    searchPhrase: string
  }
> = {
  FACTORY_EXPANSION: {
    label: '工厂扩张',
    icon: Factory,
    whyItMatters:
      '产能或生产布局发生变化，可能带来设备、软件与供应链相关机会。',
    recommendedNextStep: '核实扩张范围、项目阶段与负责业务部门。',
    searchPhrase: '工厂扩建与产能变化',
  },
  INVESTMENT: {
    label: '企业投资',
    icon: Landmark,
    whyItMatters:
      '资本投入可能推动产能、技术或业务扩张，值得理解真实资金用途。',
    recommendedNextStep: '确认投资方向，并研究受到影响的业务环节。',
    searchPhrase: '企业投资与业务扩张',
  },
  DIGITAL_TRANSFORMATION: {
    label: '数字化升级',
    icon: RefreshCw,
    whyItMatters:
      '技术或流程升级可能形成软件、自动化与专业服务机会。',
    recommendedNextStep: '了解升级目标、现有系统与项目所处阶段。',
    searchPhrase: '数字化转型与技术升级',
  },
  HIRING_SIGNAL: {
    label: '招聘变化',
    icon: Building2,
    whyItMatters:
      '相关岗位招聘可能反映企业正在建设新能力，但不代表已经产生采购。',
    recommendedNextStep: '核实招聘部门与职责，再判断对应业务变化。',
    searchPhrase: '关键岗位招聘与团队扩张',
  },
  POLICY_CHANGE: {
    label: '政策机会',
    icon: Scale,
    whyItMatters:
      '政策变化可能影响企业投资、合规要求与行业发展节奏。',
    recommendedNextStep: '确认政策适用范围，并寻找明确受影响的企业主体。',
    searchPhrase: '行业政策变化与企业影响',
  },
  INDUSTRY_TREND: {
    label: '行业变化',
    icon: TrendingUp,
    whyItMatters:
      '行业需求变化可能形成销售窗口，但仍需要落实到具体企业。',
    recommendedNextStep: '结合产品方向，继续验证相关企业和真实业务场景。',
    searchPhrase: '行业变化与企业需求趋势',
  },
}
