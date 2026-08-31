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

test('communication evidence panel requires attributable evidence and renders verification provenance', async () => {
  const panel = await read('../components/communication/CommunicationEvidencePanel.tsx')

  assert.match(panel, /recordCommunicationEvidence/)
  assert.match(panel, /getCommunicationEvents/)
  assert.match(panel, /getCommunicationSummary/)
  assert.match(panel, /记录已发送/)
  assert.match(panel, /记录已回复/)
  assert.match(panel, /记录会议/)
  assert.match(panel, /消息\/事件 ID/)
  assert.match(panel, /证据链接/)
  assert.match(panel, /externalEventId\.trim\(\) \|\| evidenceUrl\.trim\(\)/)
  assert.match(panel, /USER_EVIDENCE_VERIFIED/)
  assert.match(panel, /PROVIDER_VERIFIED/)
  assert.match(panel, /evidenceUrl/)
  assert.match(panel, /externalEventId/)
})

test('communication workspace derives positive state from backend communication summary', async () => {
  const page = await read('./CommunicationWorkspacePage.tsx')

  assert.match(page, /getCommunicationSummary/)
  assert.match(page, /Promise\.allSettled/)
  assert.match(page, /RESEARCH: '待补联系人'/)
  assert.match(page, /READY: '可联系'/)
  assert.match(page, /SENT: '已发送'/)
  assert.match(page, /REPLIED: '已回复'/)
  assert.match(page, /MEETING: '已约会议'/)
  assert.match(page, /lastEvent/)
  assert.match(page, /verificationSource/)
  assert.doesNotMatch(page, /generated.*已发送/is)
})

test('customer detail separates communication facts from mutable business outcomes', async () => {
  const page = await read('./CustomerDetailPage.tsx')

  assert.match(page, /CommunicationEvidencePanel/)
  assert.match(page, /leadId=\{customer\.id\}/)
  assert.doesNotMatch(
    page,
    /OUTCOME_ACTIONS[\s\S]{0,500}status:\s*'CONTACTED'/,
  )
  assert.doesNotMatch(
    page,
    /OUTCOME_ACTIONS[\s\S]{0,500}status:\s*'REPLIED'/,
  )
  assert.doesNotMatch(
    page,
    /OUTCOME_ACTIONS[\s\S]{0,500}status:\s*'MEETING'/,
  )
  assert.match(page, /status: 'WON'/)
  assert.match(page, /status: 'LOST'/)
})
