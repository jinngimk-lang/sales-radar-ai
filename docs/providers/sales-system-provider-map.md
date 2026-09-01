# Sales System Provider Capability Map

Last verified: 2026-09-01

This document maps external provider concepts into Sales Radar's provider-neutral action contract. It is an implementation guide, **not** a claim that a live provider connection is currently available inside the product runtime.

## 1. Stable Sales Radar actions

Business code should depend on these stable intents rather than vendor endpoint/tool names:

| Stable action | Baseline risk | Intended outcome |
| --- | --- | --- |
| `people.search` | READ | Find candidate people without claiming contactability |
| `people.enrich` | CREDIT | Acquire additional data after qualification |
| `contact.search` | READ | Check provider-owned contacts before creation |
| `contact.create` | WRITE | Create a provider record after deterministic dedupe |
| `email-account.list` | READ | Resolve a real outbound sender |
| `sequence.list` | READ | Inspect existing outreach sequences |
| `sequence.enroll` | SEND | Begin real outbound sequence execution |
| `record.search` | READ | Read/search CRM system of record |
| `record.create` | WRITE | Create CRM entity after CRM Safety |
| `record.update` | WRITE | Change CRM entity after ownership/dedupe checks |
| `lead.convert` | WRITE | Convert an existing CRM lead |
| `email.draft` | DRAFT | Save provider-side draft; not sent |
| `email.send` | SEND | Cause an actual provider send |
| `workflow.read` | READ | Inspect supported workflow configuration |
| `workflow.configure` | WRITE | Create/change workflow configuration |
| `workflow.activate` | SEND baseline; live hints may tighten | Make workflow operational |
| `cadence.configure` | WRITE | Create/change cadence configuration |
| `cadence.activate` | SEND baseline; live hints may tighten | Make cadence operational |
| `record.delete` | DESTRUCTIVE | Blocked by default |

The baseline is only the minimum. Live MCP annotations and provider-specific rules may tighten risk but never weaken it.

---

## 2. Apollo capability map

Official references used for this map:

- https://docs.apollo.io/reference/people-api-search
- https://docs.apollo.io/reference/people-enrichment
- https://docs.apollo.io/reference/search-for-contacts
- https://docs.apollo.io/reference/create-a-contact
- https://docs.apollo.io/reference/add-contacts-to-sequence
- https://docs.apollo.io/reference/create-sequence

### `people.search` -> Apollo People API Search

Observed behavior:

- 0 credits.
- Searches net-new prospects that have not necessarily been saved as contacts.
- Does not return email addresses or phone numbers.
- Supports filters such as titles, seniority, person/company location, company domains and email-status criteria.
- Search results are candidates, not verified Sales Radar contacts or buyers.

Sales Radar rule:

```text
commercial target + public evidence
  -> Apollo people.search
  -> candidate qualification
  -> only then consider paid enrichment
```

This is the default search-before-enrich path.

### `people.enrich` -> Apollo People Enrichment

Observed behavior:

- Current official endpoint documents 1–9 credits per person without waterfall enrichment when credit-consuming data is found.
- Demographic/email data can consume 1 credit; a returned mobile phone can add 8 credits.
- Waterfall enrichment can have different vendor-dependent charging behavior.
- Revealing phone numbers and waterfall enrichment can require a webhook; Apollo may retry webhook delivery.
- A successful HTTP response does not necessarily mean a person was enriched when matching information was insufficient.

Sales Radar rule:

- `people.enrich` is `CREDIT` and requires explicit approval.
- Do not use enrichment merely to explore an unqualified result set.
- Webhook ingestion must be idempotent and attributable to the original enrichment request.
- Provider success != verified contact evidence; validate the actual returned field and its provider status/provenance.

### `contact.search` -> Apollo Search for Contacts

Observed behavior:

- Searches contacts already saved in the team's Apollo database.
- 0 credits.

Sales Radar rule:

Use it as one external dedupe signal before considering `contact.create`. Sales Radar's deterministic linking contract remains authoritative for whether an internal entity may be treated as the same person.

### `contact.create` -> Apollo Create a Contact

Observed behavior:

- 0 credits, but it mutates provider state.
- **Deduplication is off by default.** Apollo may create a duplicate unless `run_dedupe=true` is supplied.
- With `run_dedupe=true`, a match can update the existing contact in place rather than merely suppressing creation.
- Matching can occur using provider/CRM IDs, person ID, email, or name + company.
- Fields explicitly sent can overwrite existing values; empty values can clear them.

Sales Radar rule:

- Classify as `WRITE` even though it costs 0 credits.
- Perform Sales Radar deterministic dedupe before provider creation.
- Do **not** casually enable `run_dedupe=true` as a harmless safety flag. It is an upsert-like mutation path and can overwrite an existing provider record.
- Prefer explicit update by known external ID when a confirmed existing contact is being modified.

### `sequence.enroll` -> Add Contacts to a Sequence

Observed behavior:

- 0 credits, but it begins an outreach workflow and therefore is an external communication action.
- Only saved contacts can be added to a sequence.
- Requires a sequence ID and `send_email_from_email_account_id` (one or multiple sender mailbox IDs).
- The endpoint exposes switches that can allow no-email, unverified-email, job-change, already-in-other-sequence and other normally excluded contacts.

Sales Radar rule:

- Classify as `SEND`, not READ/WRITE merely because credit usage is 0.
- Require explicit approval after showing target contacts, sequence and sender mailbox.
- Resolve a real sending account before enrollment.
- Keep Apollo's bypass switches false by default. Enabling any exception requires an explicit plan and approval; do not silently enroll unverified/no-email contacts.
- Enrollment is not proof of delivery, reply or meeting. Preserve provider receipt/activity IDs and wait for attributable outcome evidence.

### Sequence creation / variants

Apollo sequences can contain ordered steps and multiple email touches/variants, including A/B testing where supported by the account plan.

Sales Radar opportunity:

- Generate evidence-backed variants as `DRAFT` content.
- Keep sequence configuration (`WRITE`) separate from activation/enrollment (`SEND`).
- Later feed verified outcome events back into ranking as observed outcomes, not retroactive proof that an earlier model score was a fact.

---

## 3. Zoho CRM connected MCP map

The connected Zoho CRM MCP was inspected directly on 2026-09-01.

### Discovery protocol

Current MCP surface exposes 1,293 tools and no feature groups. The safe interaction sequence is:

```text
ZohoMCP_getFeatures
  -> ZohoMCP_listTools
  -> ZohoMCP_getSchema(exact tool name)
  -> policy mapping + approval gate
  -> ZohoMCP_executeTool(exact validated arguments)
```

Never guess tool arguments from a similarly named REST API or from stale documentation when the connected MCP exposes an exact schema.

### `lead.convert` -> `ZohoCRM_convertLead`

Live schema observations:

- Mutating, non-idempotent tool (`readOnlyHint=false`, `idempotentHint=false`).
- Requires `path_variables.leadId` plus a `body.data[]` conversion configuration.
- Can associate with existing Account/Contact via `add_to_existing_record` instead of creating duplicates.
- Can optionally assign owners, carry tags, send owner notifications and create a Deal.
- Deal creation requires exact CRM-valid values including `Deal_Name`, `Stage`, `Closing_Date`, and `Pipeline`.
- `overwrite` can overwrite existing Account/Contact data when association to an existing record is enabled.

Sales Radar rule:

- `WRITE`, explicit approval required.
- Resolve/dedupe the intended Account/Contact first.
- Default `overwrite=false` and notifications false unless explicitly requested.
- Do not fabricate pipeline/stage/probability merely to satisfy required fields. Missing required CRM business fields is a blocker/review state.

### `email.draft` -> `ZohoCRM_createEmailDrafts`

Live schema observations:

- Mutating, non-idempotent, but creates a draft rather than sending.
- Requires target CRM module/record and one or more draft objects.
- `from` must be a configured outgoing email address for the user.
- Supports HTML/plain text, recipients, CC/BCC, attachments, reply-to and schedule details.
- Returns an ID that can later be used to update/delete the draft.

Sales Radar rule:

- Map creation itself to `DRAFT`.
- Draft creation must never set `SENT_VERIFIED`.
- Sender identity and recipients are still validated before creating provider-side drafts.
- Scheduling metadata inside a draft is not proof that a later send occurred.

### `workflow.activate` -> `ZohoCRM_activateConnectedWorkflow`

Live schema observations:

- Takes the connected-workflow ID and publishes/activates it.
- Live MCP annotation: `destructiveHint=true`, `idempotentHint=true`, `readOnlyHint=false`.

Sales Radar rule:

- The static business catalog has a `SEND`-equivalent baseline because activation can trigger externally consequential automation.
- The live `destructiveHint=true` **tightens the runtime action to `DESTRUCTIVE`**, which is blocked by default under the current Sales Radar policy.
- A future product decision may introduce a separately authorized automation-activation policy, but an adapter must not reinterpret the live destructive hint as ordinary approval-required SEND merely for convenience.

This is the canonical example for why adapters must inspect live MCP annotations before execution.

### Workflow configuration discovery

`ZohoCRM_getWorkflowConfigurations` is read-only and reports supported module triggers/actions, action limits, scheduling compatibility and related-module trigger metadata.

Sales Radar opportunity:

Use this as `workflow.read` before proposing configuration. Do not build a workflow body from guessed trigger/action names when the account can report the valid configuration surface.

---

## 4. Adapter requirements

A future Apollo or Zoho adapter is acceptable only when it can prove all of the following:

1. **Runtime capability truth** — connectivity/tool availability is checked live; UI does not claim a provider is connected from a static catalog.
2. **Schema truth** — exact provider schema is used where exposed.
3. **Risk truth** — static action risk is tightened by live safety annotations; never downgraded by caller input.
4. **Cost truth** — credit-consuming actions surface the expected cost class before approval where the provider exposes it.
5. **Identity truth** — external records are linked using deterministic evidence-backed keys; no fuzzy merge authorizes mutation.
6. **One-provider execution** — no silent fallback after mutation/send begins.
7. **Receipt truth** — external IDs/status/observed timestamps are retained; verified communication state requires attributable evidence.
8. **Idempotency** — webhook/retry paths carry provider request IDs or local idempotency keys where supported.
9. **Least privilege** — adapter exposes only the small allowlisted action surface needed by Sales Radar, not the provider's entire API/MCP catalog.
10. **Rollback** — disabling one provider must not break Sales Radar's evidence/research layer or force a data-model rewrite.

## 5. Product integration order

Recommended implementation order:

```text
1. provider capability health/read-only discovery
2. contact/external-record lookup + deterministic dedupe
3. Apollo people search
4. approval-gated enrichment
5. provider-side drafts
6. CRM create/update/lead-convert behind CRM Safety + approval
7. sender resolution + approved sequence enrollment
8. verified provider receipts/webhooks -> Communication / Intent
9. observed outcome feedback into ranking/evaluation
```

Do not start with automatic send or workflow activation. The highest product leverage comes first from better prospect discovery, evidence-linked identity, controlled enrichment and trustworthy CRM synchronization.
