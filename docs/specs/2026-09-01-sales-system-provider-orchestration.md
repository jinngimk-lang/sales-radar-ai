# Sales System Provider Orchestration Spec

Date: 2026-09-01
Status: approved for implementation

## Goal

Add a provider-neutral sales-system layer that lets Sales Radar use Apollo for prospect discovery/enrichment/outbound workflows and Zoho CRM for CRM records/lifecycle automation without weakening the repository's evidence and communication-truth boundaries.

Sales Radar remains the evidence, judgment and orchestration layer. External systems remain replaceable execution/data providers.

## Provider roles

### Sales Radar

- owns public-web evidence, target context, qualification and recommendations;
- decides when a prospect is worth a paid enrichment or external write;
- never treats generated outreach, an opened channel or a provider draft as sent communication;
- only promotes communication/outcome state after an attributable provider/user receipt exists.

### Apollo

Primary role: prospecting, enrichment, contact/list organization and sequence execution.

Adopt these interaction rules from Apollo's current developer/MCP guidance:

- search before enrichment;
- enrichment is gated because it can consume credits;
- check for existing records before creating contacts;
- list/resolve a real sending mailbox before sequence enrollment;
- sequence enrollment is treated as a real outbound action, not as preparation;
- destructive bulk actions are not part of the default provider surface.

Official references:

- https://docs.apollo.io/docs/apollo-mcp
- https://docs.apollo.io/reference/people-enrichment
- https://docs.apollo.io/reference/create-a-contact
- https://docs.apollo.io/reference/get-a-list-of-email-accounts
- https://docs.apollo.io/reference/add-contacts-to-sequence

### Zoho CRM

Primary role: CRM system of record, lead/contact/account/deal lifecycle, drafts, workflows and cadences.

Adopt these interaction rules from the connected Zoho CRM MCP surface:

- discover tools before execution;
- inspect the exact live schema before calling a tool;
- separate reversible draft/configuration work from activation/publish/send actions;
- treat lead conversion, workflow activation, cadence activation and email sending as externally consequential actions;
- preserve provider record IDs and action receipts for attribution.

The connected Zoho MCP itself enforces a discovery sequence: feature discovery -> tool listing -> exact tool schema -> execute.

Observed useful Zoho tool families include lead/contact/account/deal record creation, lead conversion, email drafts, connected workflow creation/activation, cadence management and record reads.

## Provider-neutral action contract

Every external action is described by an action kind, risk class, provider and approval state.

Risk classes:

```text
READ
DRAFT
WRITE
CREDIT
SEND
DESTRUCTIVE
```

Default policy:

| Risk | Default |
| --- | --- |
| READ | automatic |
| DRAFT | automatic |
| WRITE | approval required |
| CREDIT | approval required |
| SEND | approval required |
| DESTRUCTIVE | blocked |

Provider-specific actions may be stricter, never weaker.

Examples:

- Apollo people search -> READ unless the provider reports a credit cost;
- Apollo enrichment -> CREDIT;
- Apollo contact creation/update -> WRITE;
- Apollo sequence enrollment -> SEND;
- Zoho record read/search -> READ;
- Zoho email draft -> DRAFT;
- Zoho create/update/convert record -> WRITE;
- Zoho workflow/cadence activation -> SEND-equivalent external execution and approval required;
- delete/bulk-delete -> DESTRUCTIVE and blocked by default.

## Provider interface

Business services depend on `SalesSystemProvider`, not Apollo or Zoho directly.

The provider interface exposes:

- provider identity;
- capability/action descriptors;
- record lookup for deduplication;
- action execution that returns a provider-neutral result and attributable external IDs/receipts.

No provider adapter may bypass the action policy gate.

## Cross-system identity and deduplication

Do not fuzzy-merge people or companies merely to increase apparent CRM coverage.

Match priority:

1. exact external ID within the same provider;
2. exact normalized verified email;
3. exact normalized LinkedIn/profile URL;
4. for organizations, exact normalized company domain;
5. for people, exact normalized full name + exact normalized company domain.

Domain-only matching is not enough to merge two people.

Every match result must include the reason and confidence class (`exact`, `strong`, or `none`).

## Communication receipt truth boundary

Communication state remains:

```text
DRAFT
READY_TO_SEND
CHANNEL_OPENED
SENT_VERIFIED
REPLIED_VERIFIED
MEETING_VERIFIED
CLOSED
```

`SENT_VERIFIED`, `REPLIED_VERIFIED`, and `MEETING_VERIFIED` require attributable external evidence such as provider receipt/message/thread/event IDs plus an observed timestamp. A provider action returning only `accepted`, `queued`, or a generated draft must not be promoted to a verified state unless the provider response explicitly proves that state.

## Orchestrator behavior

The orchestrator must:

1. resolve a provider that declares the requested capability;
2. apply the provider-neutral risk/approval policy;
3. reject blocked destructive actions;
4. reject approval-required actions unless an explicit approval token/context is supplied;
5. execute through the selected provider;
6. return provider identity, action kind, external IDs and receipt metadata unchanged enough for later attribution.

The orchestrator must not silently fail over from one provider to another after a write/send begins.

## Non-goals for this slice

- no live Apollo or Zoho credentials in source control;
- no automatic sending or sequence enrollment;
- no automatic CRM conversion;
- no Prisma schema migration yet;
- no UI button that claims provider connectivity before a real adapter/runtime capability exists;
- no attempt to mirror all 1,293 Zoho CRM tools.

## Acceptance criteria

- action risk classification is centrally testable;
- destructive actions are blocked by default;
- credit/send/write actions require explicit approval;
- deduplication uses deterministic evidence-backed keys;
- the orchestrator can be tested with fake Apollo/Zoho providers;
- verified communication states cannot be created without external receipt evidence;
- agent instructions document search-before-enrich, dedupe-before-create, sender-before-sequence and receipt-before-state rules;
- `PROJECT_BLUEPRINT.md` records the provider architecture as a validated product direction.
