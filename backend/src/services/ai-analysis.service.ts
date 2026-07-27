import { Prisma } from '@prisma/client'
import { mockAIAnalyzer } from '../providers/ai/mock-ai-analyzer.js'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'

export async function analyzeLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })

  if (!lead) {
    throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
  }

  const pending = await prisma.aIAnalysis.create({
    data: {
      leadId,
      status: 'PENDING',
      provider: 'mock',
      model: 'mock-intent-analyzer-v1',
      promptVersion: 'v1',
    },
  })

  try {
    const result = mockAIAnalyzer.analyze(lead)
    const {
      recommendedAction,
      ...analysis
    } = result

    return await prisma.$transaction(async (transaction) => {
      const completed = await transaction.aIAnalysis.update({
        where: { id: pending.id },
        data: {
          ...analysis,
          status: 'COMPLETED',
          rawResponse: analysis as Prisma.InputJsonValue,
        },
      })

      await transaction.lead.update({
        where: { id: leadId },
        data: {
          intentScore: analysis.intentScore,
          interestTags: analysis.tags,
          recommendedAction,
        },
      })

      return completed
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown AI analysis error'

    await prisma.aIAnalysis.update({
      where: { id: pending.id },
      data: {
        status: 'FAILED',
        errorMessage: message,
      },
    })

    throw error
  }
}
