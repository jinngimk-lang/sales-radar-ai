import { Industry, Prisma } from '@prisma/client'
import { prisma } from '../prisma/client.js'

export interface ListLeadsInput {
  keyword?: string
  industry?: Industry
  country?: string
  intentSort: Prisma.SortOrder
}

const analysisInclude = {
  analyses: {
    where: { status: 'COMPLETED' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
}

export async function listLeads(input: ListLeadsInput) {
  const where: Prisma.LeadWhereInput = {}

  if (input.keyword) {
    where.OR = [
      { displayName: { contains: input.keyword, mode: 'insensitive' } },
      { username: { contains: input.keyword, mode: 'insensitive' } },
      { company: { contains: input.keyword, mode: 'insensitive' } },
      { postContent: { contains: input.keyword, mode: 'insensitive' } },
      { interestTags: { has: input.keyword } },
    ]
  }

  if (input.industry) {
    where.industry = input.industry
  }

  if (input.country) {
    where.country = { contains: input.country, mode: 'insensitive' }
  }

  const leads = await prisma.lead.findMany({
    where,
    include: analysisInclude,
    orderBy: { intentScore: input.intentSort },
  })

  return leads.map(({ analyses, ...lead }) => ({
    ...lead,
    analysis: analyses[0] ?? null,
  }))
}

export async function getLeadById(id: string) {
  const result = await prisma.lead.findUnique({
    where: { id },
    include: analysisInclude,
  })

  if (!result) return null

  const { analyses, ...lead } = result
  return {
    ...lead,
    analysis: analyses[0] ?? null,
  }
}
