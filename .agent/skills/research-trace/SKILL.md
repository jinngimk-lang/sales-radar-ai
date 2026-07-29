---
name: research-trace
description: Provide a user-facing explanation layer for Sales Radar AI research decisions. Use when designing, implementing, reviewing, or presenting Research Trace, source-to-claim mappings, confirmed facts, business assessments, research recommendations, pending verification items, and Company Research Workspace explanations.
---

# Research Trace

## Purpose

Convert existing trusted entities into a user-facing explanation of:

- why a sales opportunity exists;
- which sources support it;
- what is confirmed;
- what is a business assessment;
- what requires human verification;
- what the recommended next research action is.

Research Trace is not an Agent execution log, model output, prompt history, or technical debug view. Hide Agent names, models, providers, prompts, tokens, and internal execution details.

## Trusted Inputs

Read only explicitly related records from:

- `ProductContextSnapshot`
- `SearchEvidence`
- `OpportunityEvidence`
- `Opportunity`
- `CompanySource`
- `CompanyIntelligenceSnapshot`

Treat `ProductContextSnapshot` only as research background. It cannot support an enterprise fact.

## Output Contract

Return a traceable explanation containing:

- source references;
- claim type;
- claim text;
- reasons;
- verification status;
- verification questions;
- explicit source-to-claim relationships.

Use these claim types:

- `FACT`
- `ASSESSMENT`
- `RECOMMENDATION`

Use `NEEDS_REVIEW` whenever evidence is missing, weak, conflicting, or insufficient.

## Claim Rules

### FACT

- Require at least one explicit source reference.
- State only what the source or trusted structured record directly supports.
- Do not use Opportunity text as an enterprise fact.
- Do not convert product context into an enterprise fact.

### ASSESSMENT

- Include at least one concrete reason.
- Present it as a commercial interpretation, not confirmed company behavior.
- Do not state or imply that procurement has occurred.

### RECOMMENDATION

- Clearly use recommendation language such as “建议”“可以验证” or “下一步可考虑”.
- Keep recommendations separate from facts and assessments.
- Treat verification questions as future sales research, not known company behavior.

### NEEDS_REVIEW

- Use when no explicit supporting relationship exists.
- Use when linked sources conflict.
- Preserve unknown information instead of completing or guessing it.

## Allowed Actions

- Read trusted entities listed above.
- Follow explicit IDs and persisted relationships.
- Explain source-to-evidence-to-claim lineage.
- Separate confirmed facts, assessments, recommendations, and pending verification.
- Report conflicting or insufficient evidence.
- Produce a read-only user-facing projection.

## Forbidden Actions

- Create or update a Lead.
- Create or update a Contact.
- Change Opportunity status or content.
- Create new facts without sources.
- Infer procurement intent or purchasing activity.
- Infer people identity, roles, email, phone, or social profiles.
- Write Research Trace results into business entities.
- Expose Agent name, model, provider, prompt, API key, token usage, or debug output.

Never establish relationships through:

- keyword similarity;
- company-name matching;
- URL similarity;
- title matching;
- AI inference.

Only use explicit persisted IDs and relationships such as `OpportunityEvidence`, `CompanySource`, and snapshot `sourceIds`.

## Data Boundary

Research Trace is a read-only explanation layer:

```text
Trusted business records
        ↓
Research Trace projection
        ↓
User-facing explanation
```

It does not create business data and does not replace:

- Evidence Validation;
- Opportunity Detection;
- Company Intelligence;
- Lead Quality Gate;
- Qualified Lead rules.

An Opportunity remains a sales assessment. A CompanyProfile remains an enterprise research record. Neither becomes a customer through Research Trace.

## Workflow

1. Verify the current user's ownership of the Opportunity.
2. Load only explicitly linked inputs.
3. Validate that each FACT has a source.
4. Require reasons for each ASSESSMENT.
5. label each RECOMMENDATION as advice.
6. Move unsupported or conflicting content to `NEEDS_REVIEW`.
7. Return source references, claims, reasons, and verification questions.
8. Confirm that the operation performed no database writes and created no Lead or Contact.

## Future Extension

- Add source conflict and corroboration views.
- Compare immutable research snapshots.
- Explain historical assessment changes.
- Support Contact Intelligence and Sales Copilot through explicit IDs.
- Keep internal Agent Trace separate from the user-facing Research Trace.
