import { OpportunityType, Prisma, PrismaClient } from '@prisma/client'
import { DEMO_USER } from '../src/config/demo-user.js'
import { mockAIAnalyzer } from '../src/providers/ai/mock-ai-analyzer.js'
import { searchProviderFactory } from '../src/providers/search/provider.factory.js'
import { leadNormalizer } from '../src/services/lead-normalizer.service.js'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name },
    create: DEMO_USER,
  })

  const searchTask = await prisma.searchTask.upsert({
    where: { id: 'seed-search-task' },
    update: {
      status: 'COMPLETED',
      progress: 100,
      completedAt: new Date(),
    },
    create: {
      id: 'seed-search-task',
      userId: user.id,
      keyword: 'industrial automation',
      platforms: ['Reddit', 'LinkedIn'],
      regions: ['USA', 'Europe'],
      status: 'COMPLETED',
      progress: 100,
      resultCount: 3,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  })

  const opportunityFixtures = [
    {
      id: 'seed-opportunity-expansion',
      type: OpportunityType.COMPANY_EXPANSION,
      dedupeKey: 'seed-fixture-company-expansion',
      title: '制造企业产能扩张场景（测试数据）',
      summary:
        'Seed fixture：用于验证企业扩张类销售机会的页面展示，不代表真实企业事件。',
      whyItMatters:
        '产能扩张通常值得销售人员进一步研究自动化、软件和供应链相关需求。',
      recommendedNextStep:
        '核验真实来源、项目阶段和相关业务部门后，再判断是否值得跟进。',
      confidence: 60,
    },
    {
      id: 'seed-opportunity-investment',
      type: OpportunityType.INVESTMENT,
      dedupeKey: 'seed-fixture-investment',
      title: '制造业投资动态场景（测试数据）',
      summary:
        'Seed fixture：用于验证企业投资类销售机会的页面展示，不代表真实投资公告。',
      whyItMatters:
        '新增投资可能带来产线、运营系统或数字化能力建设方向，仍需来源验证。',
      recommendedNextStep:
        '查找企业公告或投资者关系材料，确认投资范围与实施时间。',
      confidence: 55,
    },
    {
      id: 'seed-opportunity-digital-upgrade',
      type: OpportunityType.DIGITAL_UPGRADE,
      dedupeKey: 'seed-fixture-digital-upgrade',
      title: '工厂数字化升级场景（测试数据）',
      summary:
        'Seed fixture：用于验证数字化升级类销售机会的页面展示，不代表真实采购需求。',
      whyItMatters:
        '数字化升级方向可能与工业软件和自动化产品相关，但不能视为采购事实。',
      recommendedNextStep:
        '确认企业是否存在公开升级计划，并研究运营、工程或数字化相关部门。',
      confidence: 50,
    },
  ] as const

  for (const fixture of opportunityFixtures) {
    const productContextSnapshot: Prisma.InputJsonValue = {
      version: 'seed-v1',
      isSeedFixture: true,
      product: 'industrial automation',
      industry: 'Industrial Manufacturing',
      region: 'Europe',
      customerType: 'Manufacturing companies',
      source: 'prisma-seed',
    }

    await prisma.opportunity.upsert({
      where: { id: fixture.id },
      update: {
        userId: user.id,
        searchTaskId: searchTask.id,
        type: fixture.type,
        dedupeKey: fixture.dedupeKey,
        companyName: null,
        title: fixture.title,
        summary: fixture.summary,
        whyItMatters: fixture.whyItMatters,
        recommendedNextStep: fixture.recommendedNextStep,
        confidence: fixture.confidence,
        productContextSnapshot,
        detectionVersion: 'seed-v1',
      },
      create: {
        ...fixture,
        userId: user.id,
        searchTaskId: searchTask.id,
        companyName: null,
        productContextSnapshot,
        detectionVersion: 'seed-v1',
      },
    })
  }

  const provider = searchProviderFactory.create('mock')
  const mockLeads = leadNormalizer.normalizeMany(
    await provider.search({
      keyword: searchTask.keyword,
      platforms: searchTask.platforms,
      regions: searchTask.regions,
    }),
    provider.name,
  ).slice(0, 3)

  for (const [index, mockLead] of mockLeads.entries()) {
    const id = `seed-lead-${index + 1}`
    const lead = await prisma.lead.upsert({
      where: { id },
      update: {
        ...mockLead,
        userId: user.id,
        searchTaskId: searchTask.id,
      },
      create: {
        id,
        ...mockLead,
        userId: user.id,
        searchTaskId: searchTask.id,
      },
    })

    if (index === 0) {
      const { recommendedAction, ...analysis } = mockAIAnalyzer.analyze(lead)

      await prisma.aIAnalysis.upsert({
        where: { id: 'seed-analysis-1' },
        update: {
          ...analysis,
          status: 'COMPLETED',
          rawResponse: analysis as Prisma.InputJsonValue,
        },
        create: {
          id: 'seed-analysis-1',
          leadId: lead.id,
          status: 'COMPLETED',
          provider: 'mock',
          model: 'mock-intent-analyzer-v1',
          promptVersion: 'v1',
          ...analysis,
          rawResponse: analysis as Prisma.InputJsonValue,
        },
      })

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          intentScore: analysis.intentScore,
          recommendedAction,
        },
      })
    }
  }

  const opportunityCount = await prisma.opportunity.count({
    where: { userId: user.id },
  })

  console.log(
    `Seeded demo user, search task, leads, AI analysis, and ${opportunityCount} opportunities`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
