import { Prisma, PrismaClient } from '@prisma/client'
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

  console.log('Seeded demo user, search task, leads, and AI analysis')
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
