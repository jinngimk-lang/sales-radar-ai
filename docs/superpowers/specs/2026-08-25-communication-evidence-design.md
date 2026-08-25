# Communication Evidence Design

## Goal

Turn Sales Radar communication from a preparation-only surface into an evidence-backed workflow. Generated outreach remains a draft artifact. `SENT`, `REPLIED`, and `MEETING` states exist only when an attributable provider receipt or explicit user-submitted evidence record exists.

## Current problem

- `OutreachMessage` stores generated content only; it does not represent an actual send.
- `LeadOutcome` currently accepts `CONTACTED`, `REPLIED`, and `MEETING` as direct mutable labels, so those labels can be shown without communication evidence.
- `CommunicationWorkspacePage` correctly avoids pretending drafts are sends, but it has no real interaction timeline or evidence-backed state.

## Product rules

1. Generated text is never a send event.
2. Opening an external channel is never a send event.
3. Verified communication states are derived from immutable communication evidence events.
4. Evidence source is always explicit:
   - `PROVIDER_VERIFIED` for provider/API receipts.
   - `USER_EVIDENCE_VERIFIED` for attributable evidence deliberately submitted by the operator.
5. A free-form note by itself cannot create a verified state.
6. The UI must display the verification source and evidence reference for every verified state.
7. `LeadOutcome` remains the business-outcome model; communication progress is no longer manually asserted through `CONTACTED`, `REPLIED`, or `MEETING` buttons.
8. Existing historic `LeadOutcome` values remain readable for backward compatibility, but new verified communication status comes from communication events.

## Data model

Add the following enums:

```text
CommunicationEventType = SENT | DELIVERED | REPLIED | MEETING | FAILED
CommunicationVerificationSource = PROVIDER_VERIFIED | USER_EVIDENCE_VERIFIED
```

Add `CommunicationEvent`:

```text
id                  String @id @default(cuid())
userId              String
leadId              String
outreachMessageId   String?
channel             String
eventType           CommunicationEventType
verificationSource  CommunicationVerificationSource
provider             String?
externalEventId      String?
evidenceUrl          String?
evidenceNote         String?
occurredAt           DateTime
createdAt            DateTime @default(now())
```

Constraints:

- event belongs to the authenticated/demo user and owned lead;
- at least one attributable reference is required: `externalEventId` or valid `http(s)` `evidenceUrl`;
- `evidenceNote` is optional context and never satisfies attribution on its own;
- provider events can be added later through an adapter but use the same immutable model;
- user-created v1 events are always `USER_EVIDENCE_VERIFIED` and cannot claim provider verification.

## Derived state

The communication summary for a lead is derived from its events:

```text
MEETING if any MEETING event exists
else REPLIED if any REPLIED event exists
else SENT if any SENT or DELIVERED event exists
else READY when a public contact exists
else RESEARCH
```

`FAILED` is an event shown in the timeline but does not advance the positive state.

## API

Add lead-scoped endpoints:

```text
GET  /leads/:id/communication-events
POST /leads/:id/communication-events
GET  /leads/:id/communication-summary
```

`POST` accepts:

```json
{
  "eventType": "SENT|REPLIED|MEETING|FAILED",
  "channel": "email|linkedin|whatsapp|call|other",
  "externalEventId": "optional attributable id",
  "evidenceUrl": "optional http(s) URL",
  "evidenceNote": "optional context",
  "occurredAt": "optional ISO timestamp"
}
```

Validation requires `externalEventId` or `evidenceUrl`. The server writes `verificationSource=USER_EVIDENCE_VERIFIED`; callers cannot override it.

## UI

### Communication workspace

Replace preparation-only cards with an inbox-like list that still uses real Lead data. Each row shows:

- company/person and public-contact readiness;
- derived communication state (`待补联系人`, `可联系`, `已发送`, `已回复`, `已约会议`);
- last evidence-backed event timestamp and channel;
- a primary action that opens the customer detail communication section.

No fake chat transcript is generated.

### Customer detail

Keep outreach generation as preparation. Add a compact `沟通事实` section with:

- immutable event timeline;
- `记录已发送`, `记录已回复`, `记录会议` actions;
- evidence form requiring message/event ID or evidence URL;
- verification-source badge.

Remove direct `已联系`, `已回复`, `会议` outcome buttons. Business outcome actions such as `成交` / `不匹配` remain separate.

## Error handling

- invalid event type/channel/reference -> `400 VALIDATION_ERROR`;
- unknown or unowned lead -> `404 LEAD_NOT_FOUND`;
- malformed/non-http evidence URL -> `400 VALIDATION_ERROR`;
- duplicate provider/user event with the same `(leadId, channel, eventType, externalEventId)` is idempotently returned rather than duplicated when `externalEventId` is present.

## Privacy and safety

- do not store message body or transcript in the event record;
- store only the minimum evidence reference needed to establish state;
- do not ingest private credentials or session tokens in evidence URLs;
- provider integrations remain behind an adapter and are not required for the first release.

## Testing

Backend contract tests must prove:

- note-only evidence is rejected;
- URL or external ID evidence is accepted;
- callers cannot set `PROVIDER_VERIFIED`;
- derived state ordering is `MEETING > REPLIED > SENT > READY > RESEARCH`;
- duplicate external IDs are idempotent;
- events are ownership scoped.

Frontend contract tests must prove:

- Communication does not display `已发送/已回复/会议` without communication-event evidence;
- Customer Detail no longer exposes direct manual `CONTACTED/REPLIED/MEETING` outcome actions;
- evidence submission requires an attributable reference;
- timeline renders verification source and evidence link/id.

## Rollback

The feature is additive at the schema/API level. Rollback can hide the communication event UI and leave the event table unused. Existing `LeadOutcome` records remain untouched.