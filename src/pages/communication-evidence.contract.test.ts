import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

test('frontend communication evidence service exposes typed lead-scoped APIs', async () => {
  const service = await read('../services/communication-evidence.ts')

  assert.match(service, /export type CommunicationEventType/)
  assert.match(service, /export type CommunicationVerificationSource/)
  assert.match(service, /export interface CommunicationEvent/)
  assert.match(service, /export interface CommunicationSummary/)
  assert.match(service, /export async function getCommunicationEvents/)
  assert.match(service, /export async function getCommunicationSummary/)
  assert.match(service, /export async function recordCommunicationEvidence/)
  assert.match(service, /\/communication-events/)
  assert.match(service, /\/communication-summary/)
  assert.match(service, /USER_EVIDENCE_VERIFIED/)
  assert.match(service, /PROVIDER_VERIFIED/)
})

test('communication evidence write contract cannot request provider verification', async () => {
  const service = await read('../services/communication-evidence.ts')

  assert.match(service, /export interface RecordCommunicationEvidenceInput/)
  assert.match(service, /externalEventId\?: string/)
  assert.match(service, /evidenceUrl\?: string/)
  assert.match(service, /evidenceNote\?: string/)
  assert.doesNotMatch(
    service,
    /interface RecordCommunicationEvidenceInput[\s\S]{0,500}verificationSource/,
  )
  assert.doesNotMatch(
    service,
    /interface RecordCommunicationEvidenceInput[\s\S]{0,500}provider\??:/,
  )
})
