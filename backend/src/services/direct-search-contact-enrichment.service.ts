import { prisma } from '../prisma/client.js'
import { contactDiscovery } from './contact-discovery.service.js'

interface SearchTaskLeadReference {
  id: string
}

export interface DirectSearchContactEnrichmentDependencies {
  listLeads: (taskId: string) => Promise<SearchTaskLeadReference[]>
  discover: (leadId: string) => Promise<unknown>
  concurrency?: number
}

const defaultDependencies: DirectSearchContactEnrichmentDependencies = {
  listLeads: async (taskId) => {
    const links = await prisma.searchTaskLead.findMany({
      where: { searchTaskId: taskId },
      select: { leadId: true },
    })
    return links.map(({ leadId }) => ({ id: leadId }))
  },
  discover: (leadId) => contactDiscovery.discover(leadId),
  concurrency: 3,
}

/**
 * Enrich every real lead linked to the current task. A broken website must
 * not discard the other task results, so failures are isolated per lead.
 */
export async function enrichSearchTaskContacts(
  taskId: string,
  dependencies: DirectSearchContactEnrichmentDependencies = defaultDependencies,
) {
  const leads = await dependencies.listLeads(taskId)
  if (leads.length === 0) return

  const concurrency = Math.max(
    1,
    Math.min(8, Math.trunc(dependencies.concurrency ?? 3)),
  )
  let cursor = 0

  const workers = Array.from(
    { length: Math.min(concurrency, leads.length) },
    async () => {
      while (cursor < leads.length) {
        const lead = leads[cursor]
        cursor += 1
        if (!lead) continue
        try {
          await dependencies.discover(lead.id)
        } catch (error) {
          console.warn(
            `[DirectSearchContactEnrichment] Contact discovery skipped for lead ${lead.id}:`,
            error instanceof Error ? error.message : 'unknown error',
          )
        }
      }
    },
  )

  await Promise.all(workers)
}
