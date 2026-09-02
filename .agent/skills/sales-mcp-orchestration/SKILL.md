---
name: sales-mcp-orchestration
description: Safely orchestrate external sales systems such as Apollo-style prospect/enrichment/outbound providers and Zoho-style CRM/lifecycle providers. Use when a workflow may search, enrich, create/update CRM records, enroll a sequence, send communication, activate automation, or consume provider credits.
---

# Sales MCP Orchestration

## Purpose

Connect Sales Radar's evidence-backed research to replaceable external sales systems without allowing provider convenience, credits, drafts, workflow state, or API success shapes to become customer or communication truth.

This skill owns the external-provider execution sequence. It complements, and does not replace, `crm-safety`, `contact-intelligence`, `sales-action-planning`, or the domain quality gates.

## Required Inputs

- Current authenticated user/workspace context.
- Explicit Sales Radar target, lead, company or contact references.
- Evidence/qualification state required by the requested action.
- Requested provider action and provider preference when applicable.
- Explicit approval context for any action classified as `WRITE`, `CREDIT`, or `SEND`.

## Provider-Neutral Action Policy

```text
READ        -> automatic
DRAFT       -> automatic
WRITE       -> approval required
CREDIT      -> approval required
SEND        -> approval required
DESTRUCTIVE -> blocked by default
```

A provider may make an action stricter. It must never make an action weaker than the central policy.

Examples:

- prospect/company search -> `READ`;
- paid enrichment -> `CREDIT`;
- contact/lead/account/deal create or update -> `WRITE`;
- email draft -> `DRAFT`;
- sequence enrollment, actual email send, workflow/cadence activation -> `SEND` or stricter;
- delete/bulk-delete -> `DESTRUCTIVE`.

## Required Operating Sequence

```text
Recover target + evidence context
  -> discover provider capability/tool
  -> inspect the exact live tool schema when the provider requires it
  -> search/read before paid enrichment
  -> apply Sales Radar qualification/evidence gates
  -> deduplicate before external record creation
  -> require explicit approval for WRITE/CREDIT/SEND
  -> resolve a real sender mailbox before sequence enrollment
  -> execute exactly one selected provider
  -> preserve provider record/receipt identifiers and observed time
  -> promote communication/outcome state only from attributable evidence
```

## Apollo-Style Provider Rules

- Search before enrichment. Do not spend enrichment credits just to explore candidates.
- Enrichment is a `CREDIT` action unless the live provider explicitly proves otherwise; provider policy may only tighten this.
- Check existing external records before contact creation. Prefer deterministic provider ID, verified email, profile URL and company-domain keys over fuzzy matching.
- Resolve the actual sending mailbox/account before sequence enrollment.
- Treat sequence enrollment as real outbound execution, not preparation.
- Do not expose destructive bulk actions through the default orchestration surface.

## Zoho-Style Provider Rules

When using the connected Zoho CRM MCP, follow its live discovery contract rather than guessing tool parameters:

```text
ZohoMCP_getFeatures
  -> ZohoMCP_listTools
  -> ZohoMCP_getSchema(exact tool)
  -> ZohoMCP_executeTool(exact validated arguments)
```

- Read/search before mutation.
- Draft creation is not sending.
- Lead conversion and CRM create/update operations are `WRITE`.
- Email sending, cadence activation and workflow/connected-workflow activation are externally consequential and require explicit approval.
- Never infer a successful conversion, workflow run, sent message, reply, meeting or deal merely from a request being accepted or queued.
- Preserve Zoho record/action identifiers needed for later attribution.

## Deduplication Boundary

Match in this order:

1. exact external ID inside the same provider;
2. exact normalized **verified** email;
3. exact normalized profile URL;
4. organization: exact normalized company domain;
5. person: exact normalized full name plus exact normalized company domain.

Do not merge two people on company domain alone. Do not use fuzzy name/company similarity as permission to mutate CRM records.

If evidence is insufficient, return no match and require review instead of guessing.

## Communication Truth Boundary

Sales Radar communication state is:

```text
DRAFT
READY_TO_SEND
CHANNEL_OPENED
SENT_VERIFIED
REPLIED_VERIFIED
MEETING_VERIFIED
CLOSED
```

The following are **not** equivalent:

```text
generated text != DRAFT persisted by provider
draft != sent
accepted/queued != sent
opened provider UI != sent
send request initiated != SENT_VERIFIED
sequence enrolled != reply
model prediction != REPLIED_VERIFIED or MEETING_VERIFIED
```

`SENT_VERIFIED`, `REPLIED_VERIFIED`, and `MEETING_VERIFIED` require attributable external provider evidence: a receipt/message/thread/event identifier and a valid observed timestamp.

## No Silent Failover After Execution Starts

Provider selection may occur before execution. Once a `WRITE`, `CREDIT`, or `SEND` request begins, do not silently retry the same action through another provider. That can duplicate CRM records, spend credits twice, or send duplicate outreach.

Surface the failure with provider attribution and require a fresh plan/approval before another provider is attempted.

## Allowed Actions

- Discover provider capabilities.
- Read exact provider schemas/tool descriptors.
- Search existing records.
- Plan enrichment, CRM writes, drafts and outbound actions.
- Execute `READ` and `DRAFT` actions through the central policy gate.
- Execute explicitly approved `WRITE`, `CREDIT`, or `SEND` actions through one selected provider.
- Preserve provider result IDs and receipt evidence.

## Forbidden Actions

- Bypass `crm-safety`, Lead Quality Gate, ownership checks, evidence validation or contact evidence requirements.
- Spend provider credits without the required approval.
- Create/update/convert CRM records without approval.
- Send/enroll/activate automation without approval.
- Execute destructive actions by default.
- Guess provider tool schemas or required parameters when the live provider exposes schema discovery.
- Treat provider `accepted`, `queued`, generated-draft, or generic success responses as verified communication outcomes.
- Silently fail over after an external mutation or send begins.

## Traceability

Every provider execution trace must retain, when available:

- Sales Radar input references;
- selected provider ID;
- action name and authoritative risk class;
- approval reference for gated actions;
- provider external record IDs;
- provider receipt/message/thread/event IDs;
- provider status;
- observed timestamp;
- sanitized error code/reason on failure.

Never write API keys, OAuth tokens, passwords, mailbox credentials, secret headers, or unrelated customer data into traces.

## Future Extension

- Implement concrete Apollo and Zoho adapters behind `SalesSystemProvider` only after their exact runtime schemas/auth boundaries are validated.
- Persist cross-provider record links and communication receipts with user/workspace ownership and idempotency.
- Add provider health/capability reporting without claiming connectivity until a real runtime check succeeds.
- Feed verified replies/meetings/outcomes back into evidence-backed ranking only as observed outcomes, never as retroactive proof that earlier predictions were facts.
