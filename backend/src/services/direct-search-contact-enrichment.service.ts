import { prisma } from '../prisma/client.js'
import { contactDiscovery } from './contact-discovery.service.js'

interface DiscoveredContact {
  name?: unknown
  email?: unknown
  phone?: unknown
  profileUrl?: unknown
  [key: string]: unknown
}

export interface DirectSearchContactEnrichmentOptions {
  discover: (leadId: string) => Promise<DiscoveredContact[]>
  concurrency?: number
}

export interface DirectSearchContactEnrichmentResult {
  attemptedLeadCount: number
  enrichedLeadCount: number
  observedContactCount: number
}

/**
 * Runs bounded public-contact discovery only when the user explicitly chose
 * the direct global-contact search mode. Duplicate leads are processed once,
 * and one unavailable website cannot discard the rest of the task.
 */
export class DirectSearchContactEnrichmentService {
  private readonly concurrency: number

  constructor(private readonly options: DirectSearchContactEnrichmentOptions) {
    this.concurrency = Math.max(
      1,
      Math.min(8, Math.trunc(options.concurrency ?? 3)),
    )
  }

  async enrich(
    leadIds: string[],
    enabled: boolean,
  ): Promise<DirectSearchContactEnrichmentResult> {
    if (!enabled) return emptyResult()

    const uniqueLeadIds = [...new Set(leadIds.map((id) => id.trim()).filter(Boolean))]
    if (uniqueLeadIds.length === 0) return emptyResult()

    let cursor = 0
    let enrichedLeadCount = 0
    let observedContactCount = 0
    const workers = Array.from(
      { length: Math.min(this.concurrency, uniqueLeadIds.length) },
      async () => {
        while (cursor < uniqueLeadIds.length) {
          const leadId = uniqueLeadIds[cursor]
          cursor += 1
          if (!leadId) continue

          try {
            const contacts = await this.options.discover(leadId)
            const observed = contacts.filter(hasObservedContactField)
            if (observed.length > 0) enrichedLeadCount += 1
            observedContactCount += observed.length
          } catch (error) {
            console.warn(
              `[DirectSearchContactEnrichment] Contact discovery skipped for lead ${leadId}:`,
              error instanceof Error ? error.message : 'unknown error',
            )
          }
        }
      },
    )

    await Promise.all(workers)
    return {
      attemptedLeadCount: uniqueLeadIds.length,
      enrichedLeadCount,
      observedContactCount,
    }
  }
}

const defaultService = new DirectSearchContactEnrichmentService({
  discover: (leadId) => contactDiscovery.discover(leadId),
  concurrency: 3,
})

export async function enrichSearchTaskContacts(taskId: string) {
  const links = await prisma.searchTaskLead.findMany({
    where: { searchTaskId: taskId },
    select: { leadId: true },
  })
  return defaultService.enrich(
    links.map(({ leadId }) => leadId),
    true,
  )
}

function hasObservedContactField(contact: DiscoveredContact) {
  return [contact.name, contact.email, contact.phone, contact.profileUrl].some(
    (value) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      value.trim().toLowerCase() !== 'unknown',
  )
}

function emptyResult(): DirectSearchContactEnrichmentResult {
  return {
    attemptedLeadCount: 0,
    enrichedLeadCount: 0,
    observedContactCount: 0,
  }
}
