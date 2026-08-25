import { randomUUID } from 'node:crypto'
import { prisma } from '../prisma/client.js'
import { AppError } from '../utils/app-error.js'
import { ensureDemoUser } from './demo-user.service.js'

export type CommunicationEventType =
  | 'SENT'
  | 'DELIVERED'
  | 'REPLIED'
  | 'MEETING'
  | 'FAILED'

export type CommunicationVerificationSource =
  | 'PROVIDER_VERIFIED'
  | 'USER_EVIDENCE_VERIFIED'

export type CommunicationChannel =
  | 'email'
  | 'linkedin'
  | 'whatsapp'
  | 'call'
  | 'other'

export type CommunicationState =
  | 'RESEARCH'
  | 'READY'
  | 'SENT'
  | 'REPLIED'
  | 'MEETING'

export interface CommunicationEventInput {
  eventType: CommunicationEventType
  channel: CommunicationChannel
  externalEventId?: string
  evidenceUrl?: string
  evidenceNote?: string
  occurredAt: Date
}

export interface CommunicationEventRecord {
  id: string
  userId: string
  leadId: string
  outreachMessageId: string | null
  channel: string
  eventType: CommunicationEventType
  verificationSource: CommunicationVerificationSource
  provider: string | null
  externalEventId: string | null
  evidenceUrl: string | null
  evidenceNote: string | null
  occurredAt: Date
  createdAt: Date
}

export interface CommunicationSummary {
  state: CommunicationState
  lastEvent: CommunicationEventRecord | null
  eventCount: number
}

export interface CommunicationEventRepository {
  findOwnedLead(
    leadId: string,
    userId: string,
  ): Promise<{ id: string } | null>
  hasPublicContact(leadId: string, userId: string): Promise<boolean>
  list(leadId: string, userId: string): Promise<CommunicationEventRecord[]>
  findByExternalEventId(
    leadId: string,
    userId: string,
    channel: string,
    eventType: CommunicationEventType,
    externalEventId: string,
  ): Promise<CommunicationEventRecord | null>
  create(
    leadId: string,
    userId: string,
    input: CommunicationEventInput,
  ): Promise<CommunicationEventRecord>
}

interface OwnedLeadRow {
  id: string
}

interface ExistsRow {
  exists: boolean
}

const prismaRepository: CommunicationEventRepository = {
  async findOwnedLead(leadId, userId) {
    const rows = await prisma.$queryRaw<OwnedLeadRow[]>`
      SELECT "id"
      FROM "Lead"
      WHERE "id" = ${leadId} AND "userId" = ${userId}
      LIMIT 1
    `
    return rows[0] ?? null
  },

  async hasPublicContact(leadId, userId) {
    const rows = await prisma.$queryRaw<ExistsRow[]>`
      SELECT EXISTS (
        SELECT 1
        FROM "ContactProfile" AS contact
        INNER JOIN "Lead" AS lead ON lead."id" = contact."leadId"
        WHERE contact."leadId" = ${leadId} AND lead."userId" = ${userId}
      ) AS "exists"
    `
    return rows[0]?.exists === true
  },

  async list(leadId, userId) {
    return prisma.$queryRaw<CommunicationEventRecord[]>`
      SELECT
        "id",
        "userId",
        "leadId",
        "outreachMessageId",
        "channel",
        "eventType",
        "verificationSource",
        "provider",
        "externalEventId",
        "evidenceUrl",
        "evidenceNote",
        "occurredAt",
        "createdAt"
      FROM "CommunicationEvent"
      WHERE "leadId" = ${leadId} AND "userId" = ${userId}
      ORDER BY "occurredAt" DESC, "createdAt" DESC
    `
  },

  async findByExternalEventId(
    leadId,
    userId,
    channel,
    eventType,
    externalEventId,
  ) {
    const rows = await prisma.$queryRaw<CommunicationEventRecord[]>`
      SELECT
        "id",
        "userId",
        "leadId",
        "outreachMessageId",
        "channel",
        "eventType",
        "verificationSource",
        "provider",
        "externalEventId",
        "evidenceUrl",
        "evidenceNote",
        "occurredAt",
        "createdAt"
      FROM "CommunicationEvent"
      WHERE
        "leadId" = ${leadId}
        AND "userId" = ${userId}
        AND "channel" = ${channel}
        AND "eventType" = CAST(${eventType} AS "CommunicationEventType")
        AND "externalEventId" = ${externalEventId}
      LIMIT 1
    `
    return rows[0] ?? null
  },

  async create(leadId, userId, input) {
    const id = randomUUID()
    const rows = await prisma.$queryRaw<CommunicationEventRecord[]>`
      INSERT INTO "CommunicationEvent" (
        "id",
        "userId",
        "leadId",
        "outreachMessageId",
        "channel",
        "eventType",
        "verificationSource",
        "provider",
        "externalEventId",
        "evidenceUrl",
        "evidenceNote",
        "occurredAt",
        "createdAt"
      ) VALUES (
        ${id},
        ${userId},
        ${leadId},
        NULL,
        ${input.channel},
        CAST(${input.eventType} AS "CommunicationEventType"),
        CAST('USER_EVIDENCE_VERIFIED' AS "CommunicationVerificationSource"),
        NULL,
        ${input.externalEventId ?? null},
        ${input.evidenceUrl ?? null},
        ${input.evidenceNote ?? null},
        ${input.occurredAt},
        NOW()
      )
      RETURNING
        "id",
        "userId",
        "leadId",
        "outreachMessageId",
        "channel",
        "eventType",
        "verificationSource",
        "provider",
        "externalEventId",
        "evidenceUrl",
        "evidenceNote",
        "occurredAt",
        "createdAt"
    `
    const event = rows[0]
    if (!event) {
      throw new AppError(
        500,
        'COMMUNICATION_EVENT_WRITE_FAILED',
        'Communication evidence could not be stored',
      )
    }
    return event
  },
}

type UserResolver = () => Promise<{ id: string }>

const EVENT_TYPES = new Set<CommunicationEventType>([
  'SENT',
  'DELIVERED',
  'REPLIED',
  'MEETING',
  'FAILED',
])

const USER_EVENT_TYPES = new Set<CommunicationEventType>([
  'SENT',
  'REPLIED',
  'MEETING',
  'FAILED',
])

const CHANNELS = new Set<CommunicationChannel>([
  'email',
  'linkedin',
  'whatsapp',
  'call',
  'other',
])

export class CommunicationEventService {
  constructor(
    private readonly repository: CommunicationEventRepository = prismaRepository,
    private readonly resolveUser: UserResolver = ensureDemoUser,
  ) {}

  async createUserEvidence(
    leadId: string,
    input: CommunicationEventInput,
  ): Promise<CommunicationEventRecord> {
    const user = await this.resolveUser()
    await this.requireOwnedLead(leadId, user.id)
    const cleaned = this.validateUserEvidence(input)

    if (cleaned.externalEventId) {
      const existing = await this.repository.findByExternalEventId(
        leadId,
        user.id,
        cleaned.channel,
        cleaned.eventType,
        cleaned.externalEventId,
      )
      if (existing) return existing
    }

    return this.repository.create(leadId, user.id, cleaned)
  }

  async list(leadId: string): Promise<CommunicationEventRecord[]> {
    const user = await this.resolveUser()
    await this.requireOwnedLead(leadId, user.id)
    return this.repository.list(leadId, user.id)
  }

  async summary(leadId: string): Promise<CommunicationSummary> {
    const user = await this.resolveUser()
    await this.requireOwnedLead(leadId, user.id)
    const events = await this.repository.list(leadId, user.id)
    const positive = events.filter((event) => event.eventType !== 'FAILED')

    let state: CommunicationState
    if (positive.some((event) => event.eventType === 'MEETING')) {
      state = 'MEETING'
    } else if (positive.some((event) => event.eventType === 'REPLIED')) {
      state = 'REPLIED'
    } else if (
      positive.some(
        (event) => event.eventType === 'SENT' || event.eventType === 'DELIVERED',
      )
    ) {
      state = 'SENT'
    } else {
      state = (await this.repository.hasPublicContact(leadId, user.id))
        ? 'READY'
        : 'RESEARCH'
    }

    return {
      state,
      lastEvent: events[0] ?? null,
      eventCount: events.length,
    }
  }

  private async requireOwnedLead(leadId: string, userId: string): Promise<void> {
    if (!(await this.repository.findOwnedLead(leadId, userId))) {
      throw new AppError(404, 'LEAD_NOT_FOUND', 'Lead not found')
    }
  }

  private validateUserEvidence(
    input: CommunicationEventInput,
  ): CommunicationEventInput {
    if (!EVENT_TYPES.has(input.eventType) || !USER_EVENT_TYPES.has(input.eventType)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Unsupported user communication event type',
      )
    }

    if (!CHANNELS.has(input.channel)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Unsupported communication channel',
      )
    }

    const externalEventId = this.cleanText(input.externalEventId, 500)
    const evidenceUrl = this.cleanEvidenceUrl(input.evidenceUrl)
    const evidenceNote = this.cleanText(input.evidenceNote, 1000)

    if (!externalEventId && !evidenceUrl) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'An attributable external event id or evidence URL is required',
      )
    }

    if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'A valid communication event time is required',
      )
    }

    return {
      eventType: input.eventType,
      channel: input.channel,
      externalEventId,
      evidenceUrl,
      evidenceNote,
      occurredAt: input.occurredAt,
    }
  }

  private cleanEvidenceUrl(value: string | undefined): string | undefined {
    const cleaned = this.cleanText(value, 2000)
    if (!cleaned) return undefined

    let parsed: URL
    try {
      parsed = new URL(cleaned)
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Evidence URL is invalid')
    }

    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Evidence URL must be an http(s) URL without embedded credentials',
      )
    }

    return parsed.toString()
  }

  private cleanText(value: string | undefined, maxLength: number) {
    if (typeof value !== 'string') return undefined
    const cleaned = value.trim()
    return cleaned ? cleaned.slice(0, maxLength) : undefined
  }
}

export const communicationEvents = new CommunicationEventService()
